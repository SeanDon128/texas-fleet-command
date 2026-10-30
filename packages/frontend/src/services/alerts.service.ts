import type { AlertRecord, FleetEventRecord, TeamMemberRecord } from '@rayfin-app/shared';
import { getRayfinClient } from '@/lib/rayfin-client';
import { observeOperation } from '@/lib/observability';
import { ALERT_FIELDS, normalizeAlert, readAllPages, readDate } from '@/services/fleet.service';

export interface AlertContext {
  members: Pick<TeamMemberRecord, 'id' | 'displayName' | 'role' | 'region_id' | 'isSynthetic'>[];
  events: FleetEventRecord[];
}

export interface CreateAlertCommand {
  id: string;
  vehicleId: string;
  recipientId: string;
  type: AlertRecord['type'];
  severity: AlertRecord['severity'];
  message: string;
}

export type AlertAction =
  | { kind: 'create'; command: CreateAlertCommand }
  | { kind: 'acknowledge' | 'resolve' | 'repair'; alertId: string };

export interface AlertSaveResult {
  alert: AlertRecord;
  events: FleetEventRecord[];
  timelineComplete: boolean;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const types = ['delay', 'telemetry', 'health', 'operations'];
const severities = ['critical', 'warning', 'info'];
const eventFields = ['id', 'isSynthetic', 'occurredAt', 'type', 'vehicle_id',
  'region_id', 'alert_id', 'detail', 'actor'] as const;

export function loadAlertContext(): Promise<AlertContext> {
  return observeOperation('alerts.context', readAlertContext);
}

async function readAlertContext(): Promise<AlertContext> {
  const client = await getRayfinClient();
  const [members, events] = await Promise.all([
    readAllPages(async (cursor) => {
      const query = client.data.TeamMember.select(['id', 'isSynthetic', 'displayName', 'role', 'region_id'])
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
    readAllPages(async (cursor) => {
      const query = client.data.FleetEvent.select(eventFields).where({ alert_id: { isNull: false } })
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
  ]);
  if ([...members, ...events].some((row) => row.isSynthetic !== true)) {
    throw new Error('Alert context contains a record not marked synthetic.');
  }
  return { members, events: events.map((event) => ({ ...event, occurredAt: readDate(event.occurredAt) })) };
}

export async function timelineEventId(alertId: string, type: FleetEventRecord['type']): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(`tx-fleet-alert-v1:${alertId.toLowerCase()}:${type}`))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function expectedAlertEvents(alert: AlertRecord): Promise<FleetEventRecord[]> {
  const events: { type: FleetEventRecord['type']; time: Date; actor: string; detail: string }[] = [];
  if (alert.source === 'operator') {
    events.push({ type: 'alert_created', time: alert.createdAt, actor: alert.createdBySub,
      detail: 'Synthetic alert assigned to a fictional teammate in the shared inbox. No external notification sent.' });
  }
  if (alert.acknowledgedAt && alert.acknowledgedBySub) {
    events.push({ type: 'alert_acknowledged', time: alert.acknowledgedAt, actor: alert.acknowledgedBySub,
      detail: 'Synthetic alert acknowledged by a signed-in app operator; not by the fictional recipient.' });
  }
  if (alert.resolvedAt && alert.resolvedBySub) {
    events.push({ type: 'alert_resolved', time: alert.resolvedAt, actor: alert.resolvedBySub,
      detail: 'Synthetic alert resolved by a signed-in app operator. The vehicle telemetry was not changed.' });
  }
  return Promise.all(events.map(async (event) => ({
    id: await timelineEventId(alert.id, event.type), isSynthetic: true, occurredAt: event.time,
    type: event.type, vehicle_id: alert.vehicle_id, region_id: alert.region_id,
    alert_id: alert.id, detail: event.detail, actor: event.actor,
  })));
}

export async function missingTimelineEvents(alert: AlertRecord, events: FleetEventRecord[]): Promise<number> {
  const expected = await expectedAlertEvents(alert);
  return expected.filter((item) => !events.some((event) => event.id === item.id)).length;
}

export function saveAlertAction(action: AlertAction): Promise<AlertSaveResult> {
  return observeOperation(`alert.${action.kind}`, () => persistAlertAction(action), (result) =>
    result.timelineComplete ? { outcome: 'success' } : { outcome: 'partial', code: 'timeline_incomplete' });
}

async function persistAlertAction(action: AlertAction): Promise<AlertSaveResult> {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user?.id || session.user.id.length > 200) {
    throw new Error('Sign in again before changing an alert.');
  }
  const actor = session.user.id;
  const id = action.kind === 'create' ? action.command.id : action.alertId;
  if (!uuid.test(id)) throw new Error('The alert request has an invalid identifier.');
  let alert = await client.data.Alert.select(ALERT_FIELDS).where({ id: { eq: id } }).findFirst();
  if (action.kind === 'create') {
    const input = action.command;
    if (!uuid.test(input.vehicleId) || !uuid.test(input.recipientId)
      || !types.includes(input.type) || !severities.includes(input.severity)
      || !input.message.trim() || input.message.trim().length > 1000) {
      throw new Error('Choose a vehicle, fictional recipient, type, severity and a message of 1-1,000 characters.');
    }
    if (alert && (alert.source !== 'operator' || alert.createdBySub !== actor
      || alert.vehicle_id !== input.vehicleId || alert.assignedTo_id !== input.recipientId)) {
      throw new Error('This request identifier already belongs to a different alert. Refresh the inbox.');
    }
    if (!alert) {
      const [vehicle, member] = await Promise.all([
        client.data.Vehicle.select(['id', 'isSynthetic', 'region_id']).where({ id: { eq: input.vehicleId } }).findFirst(),
        client.data.TeamMember.select(['id', 'isSynthetic', 'region_id']).where({ id: { eq: input.recipientId } }).findFirst(),
      ]);
      if (!vehicle?.isSynthetic || !member?.isSynthetic || vehicle.region_id !== member.region_id) {
        throw new Error('Choose a fictional teammate in the selected vehicle region.');
      }
      alert = await client.data.Alert.create({
        id, isSynthetic: true, vehicle_id: vehicle.id, region_id: vehicle.region_id,
        type: input.type, severity: input.severity, status: 'open', message: input.message.trim(),
        createdAt: new Date(), createdBySub: actor, assignedTo_id: member.id, source: 'operator',
      });
    }
  } else {
    if (!alert) throw new Error('This alert no longer exists. Refresh the inbox.');
    if (alert.isSynthetic !== true) throw new Error('Only explicitly synthetic alerts can be changed.');
    if (action.kind === 'acknowledge' && alert.status === 'open') {
      const updated = await client.data.Alert.update({ id }, {
        status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBySub: actor,
      });
      alert = { ...alert, ...updated };
    } else if (action.kind === 'resolve' && alert.status !== 'resolved') {
      if (alert.status !== 'acknowledged') throw new Error('Acknowledge this alert before resolving it.');
      const updated = await client.data.Alert.update({ id }, {
        status: 'resolved', resolvedAt: new Date(), resolvedBySub: actor,
      });
      alert = { ...alert, ...updated };
    }
  }
  const saved = normalizeAlert(alert);
  const events: FleetEventRecord[] = [];
  try {
    for (const expected of await expectedAlertEvents(saved)) {
      const existing = await client.data.FleetEvent.select(eventFields).where({ id: { eq: expected.id } }).findFirst();
      if (existing && (existing.alert_id !== saved.id || existing.type !== expected.type || !existing.isSynthetic)) {
        throw new Error('Timeline event identifier conflict.');
      }
      const event = existing ?? await client.data.FleetEvent.create(expected);
      events.push({ ...event, occurredAt: readDate(event.occurredAt) });
    }
    return { alert: saved, events, timelineComplete: true };
  } catch {
    console.error('[alerts] Alert saved; timeline synchronization failed. No record content logged.');
    return { alert: saved, events, timelineComplete: false };
  }
}
