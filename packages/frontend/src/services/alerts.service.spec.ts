import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertRecord, FleetEventRecord } from '@rayfin-app/shared';
import { expectedAlertEvents, missingTimelineEvents, saveAlertAction, timelineEventId, type CreateAlertCommand } from './alerts.service';

const api = vi.hoisted(() => ({
  session: vi.fn(), findAlert: vi.fn(), createAlert: vi.fn(), updateAlert: vi.fn(),
  findVehicle: vi.fn(), findMember: vi.fn(), findEvent: vi.fn(), createEvent: vi.fn(),
}));
vi.mock('@/lib/rayfin-client', () => ({
  getRayfinClient: async () => ({
    auth: { getSession: api.session },
    data: {
      Alert: { select: () => ({ where: ({ id: key }: { id: { eq: string } }) => ({ findFirst: () => api.findAlert(key.eq) }) }), create: api.createAlert, update: api.updateAlert },
      Vehicle: { select: () => ({ where: ({ id: key }: { id: { eq: string } }) => ({ findFirst: () => api.findVehicle(key.eq) }) }) },
      TeamMember: { select: () => ({ where: ({ id: key }: { id: { eq: string } }) => ({ findFirst: () => api.findMember(key.eq) }) }) },
      FleetEvent: { select: () => ({ where: ({ id: key }: { id: { eq: string } }) => ({ findFirst: () => api.findEvent(key.eq) }) }), create: api.createEvent },
    },
  }),
}));

const id = 'a1111111-1111-4111-8111-111111111111';
const vehicleId = 'b1111111-1111-4111-8111-111111111111';
const recipientId = 'c1111111-1111-4111-8111-111111111111';
const actor = 'signed-in-operator';
const command: CreateAlertCommand = { id, vehicleId, recipientId, type: 'operations', severity: 'warning', message: '  A fabricated test alert.  ' };
let alerts: Map<string, AlertRecord>;
let events: Map<string, FleetEventRecord>;

describe('persisted alert workflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('crypto', webcrypto);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    alerts = new Map();
    events = new Map();
    api.session.mockReturnValue({ isAuthenticated: true, user: { id: actor } });
    api.findVehicle.mockResolvedValue({ id: vehicleId, region_id: 'hou', isSynthetic: true });
    api.findMember.mockResolvedValue({ id: recipientId, region_id: 'hou', isSynthetic: true });
    api.findAlert.mockImplementation(async (key: string) => alerts.get(key) ?? null);
    api.createAlert.mockImplementation(async (row: AlertRecord) => {
      alerts.set(row.id, row);
      return row;
    });
    api.updateAlert.mockImplementation(async ({ id: key }: { id: string }, patch: Partial<AlertRecord>) => {
      const current = alerts.get(key);
      if (!current) throw new Error('Missing');
      const row = { ...current, ...patch };
      alerts.set(key, row);
      return { id: key, ...patch };
    });
    api.findEvent.mockImplementation(async (key: string) => events.get(key) ?? null);
    api.createEvent.mockImplementation(async (row: FleetEventRecord) => {
      events.set(row.id, row);
      return row;
    });
  });
  it('creates with the authenticated actor, verified region and one linked event', async () => {
    const result = await saveAlertAction({ kind: 'create', command });
    expect(result.timelineComplete).toBe(true);
    expect(result.alert).toMatchObject({ id, vehicle_id: vehicleId, region_id: 'hou', createdBySub: actor,
      assignedTo_id: recipientId, message: 'A fabricated test alert.', status: 'open', source: 'operator' });
    expect(result.alert.createdAt).toBeInstanceOf(Date);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ alert_id: id, actor, type: 'alert_created', isSynthetic: true });
    expect(result.events[0].detail).toContain('No external notification');
  });
  it('does not write for a missing session, invalid message or mismatched fictional recipient', async () => {
    api.session.mockReturnValueOnce({ isAuthenticated: false });
    await expect(saveAlertAction({ kind: 'create', command })).rejects.toThrow('Sign in');
    for (const message of ['', ' ', 'x'.repeat(1001)]) {
      await expect(saveAlertAction({ kind: 'create', command: { ...command, message } })).rejects.toThrow('1-1,000');
    }
    api.findMember.mockResolvedValueOnce({ id: recipientId, region_id: 'dfw', isSynthetic: true });
    await expect(saveAlertAction({ kind: 'create', command })).rejects.toThrow('selected vehicle region');
    expect(api.createAlert).not.toHaveBeenCalled();
    expect(api.createEvent).not.toHaveBeenCalled();
  });
  it('reuses the same alert after a committed create loses its response', async () => {
    api.createAlert.mockImplementationOnce(async (row: AlertRecord) => {
      alerts.set(row.id, row);
      throw new Error('Response lost after commit');
    });
    await expect(saveAlertAction({ kind: 'create', command })).rejects.toThrow('Response lost');
    expect(alerts.size).toBe(1);
    const retried = await saveAlertAction({ kind: 'create', command });
    expect(retried.timelineComplete).toBe(true);
    expect(api.createAlert).toHaveBeenCalledTimes(1);
    expect(events.size).toBe(1);
  });
  it('reports a partial save and reconstructs its missing event after reload', async () => {
    api.createEvent.mockRejectedValueOnce(new Error('Event write unavailable'));
    const result = await saveAlertAction({ kind: 'create', command });
    expect(result.timelineComplete).toBe(false);
    expect(JSON.parse(String(vi.mocked(console.warn).mock.calls.at(-1)?.[1])))
      .toMatchObject({ operation: 'alert.create', outcome: 'partial', code: 'timeline_incomplete' });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/fabricated test alert|signed-in-operator/);
    expect(alerts.size).toBe(1);
    expect(events.size).toBe(0);
    expect(await missingTimelineEvents(result.alert, [])).toBe(1);
    const repaired = await saveAlertAction({ kind: 'repair', alertId: id });
    expect(repaired.timelineComplete).toBe(true);
    expect(JSON.parse(String(vi.mocked(console.info).mock.calls.at(-1)?.[1])))
      .toMatchObject({ operation: 'alert.repair', outcome: 'success' });
    expect(await missingTimelineEvents(repaired.alert, repaired.events)).toBe(0);
    expect(api.createAlert).toHaveBeenCalledTimes(1);
  });
  it('reconciles an event whose commit succeeded but response was lost', async () => {
    api.createEvent.mockImplementationOnce(async (row: FleetEventRecord) => {
      events.set(row.id, row);
      throw new Error('Response lost');
    });
    expect((await saveAlertAction({ kind: 'create', command })).timelineComplete).toBe(false);
    expect((await saveAlertAction({ kind: 'repair', alertId: id })).timelineComplete).toBe(true);
    expect(api.createEvent).toHaveBeenCalledTimes(1);
  });
  it('acknowledges then resolves, preserving actor/time and exactly three events on retries', async () => {
    await saveAlertAction({ kind: 'create', command });
    await expect(saveAlertAction({ kind: 'resolve', alertId: id })).rejects.toThrow('Acknowledge');
    const acknowledged = await saveAlertAction({ kind: 'acknowledge', alertId: id });
    expect(acknowledged.alert).toMatchObject({ status: 'acknowledged', acknowledgedBySub: actor });
    expect(acknowledged.alert.acknowledgedAt).toBeInstanceOf(Date);
    await saveAlertAction({ kind: 'acknowledge', alertId: id });
    const resolved = await saveAlertAction({ kind: 'resolve', alertId: id });
    expect(resolved.alert).toMatchObject({ status: 'resolved', resolvedBySub: actor });
    expect(resolved.alert.resolvedAt).toBeInstanceOf(Date);
    expect(resolved.events.map((event) => event.type)).toEqual(['alert_created', 'alert_acknowledged', 'alert_resolved']);
    await saveAlertAction({ kind: 'resolve', alertId: id });
    await saveAlertAction({ kind: 'acknowledge', alertId: id });
    expect(alerts.get(id)?.status).toBe('resolved');
    expect(api.updateAlert).toHaveBeenCalledTimes(2);
    expect(events.size).toBe(3);
  });
  it('repairs a partial status transition without changing its original actor/time', async () => {
    await saveAlertAction({ kind: 'create', command });
    api.createEvent.mockRejectedValueOnce(new Error('Unavailable'));
    const result = await saveAlertAction({ kind: 'acknowledge', alertId: id });
    expect(result.alert.status).toBe('acknowledged');
    expect(result.timelineComplete).toBe(false);
    api.session.mockReturnValue({ isAuthenticated: true, user: { id: 'another-operator' } });
    const recovered = await saveAlertAction({ kind: 'repair', alertId: id });
    expect(recovered.timelineComplete).toBe(true);
    expect(recovered.events.find((event) => event.type === 'alert_acknowledged')?.actor).toBe(actor);
    expect(api.updateAlert).toHaveBeenCalledTimes(1);
  });
  it('does not reconstruct unrecorded seeded history or claim it was performed by the current operator', async () => {
    const result = await saveAlertAction({ kind: 'create', command });
    expect(await expectedAlertEvents({ ...result.alert, source: 'simulation', status: 'acknowledged' })).toEqual([]);
  });
  it('rejects request ID collisions and exposes a timeline ID collision as incomplete', async () => {
    const saved = await saveAlertAction({ kind: 'create', command });
    await expect(saveAlertAction({ kind: 'create', command: { ...command, recipientId: vehicleId } })).rejects.toThrow('different alert');
    const first = saved.events[0];
    events.set(first.id, { ...first, alert_id: vehicleId });
    expect((await saveAlertAction({ kind: 'repair', alertId: id })).timelineComplete).toBe(false);
  });
  it('generates stable, case-insensitive UUIDs distinct for each lifecycle event', async () => {
    expect(await timelineEventId(id, 'alert_created')).toBe(await timelineEventId(id.toUpperCase(), 'alert_created'));
    expect(new Set(await Promise.all(['alert_created', 'alert_acknowledged', 'alert_resolved'].map((type) =>
      timelineEventId(id, type as FleetEventRecord['type'])))).size).toBe(3);
    expect(await timelineEventId(id, 'alert_created')).toMatch(/^[a-f0-9-]{36}$/);
  });
});
