import type {
  AlertRecord, AssignmentRecord, CrewRecord, RegionRecord,
  SimClockRecord, VehicleRecord,
} from '@rayfin-app/shared';
import { getRayfinClient } from '@/lib/rayfin-client';
import { observeOperation } from '@/lib/observability';

interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor?: string | null;
}

export async function readAllPages<T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
): Promise<T[]> {
  const items: T[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const page = await Promise.race([
      fetchPage(cursor),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fleet data request timed out.')), 30_000);
      }),
    ]).finally(() => clearTimeout(timer));
    for (const item of page.items) {
      if (!item.id || ids.has(item.id)) {
        throw new Error('Fleet data returned a missing or duplicate record ID.');
      }
      ids.add(item.id);
      items.push(item);
    }
    if (!page.hasNextPage) return items;
    if (!page.items.length || !page.endCursor || cursors.has(page.endCursor)) {
      throw new Error('Fleet data pagination did not advance; partial results were rejected.');
    }
    cursor = page.endCursor;
    cursors.add(cursor);
  }
  throw new Error('Fleet data exceeded the safe pagination limit; partial results were rejected.');
}

export interface FleetSnapshot {
  vehicles: VehicleRecord[];
  regions: RegionRecord[];
  assignments: AssignmentRecord[];
  alerts: AlertRecord[];
  crews: CrewRecord[];
  clock: SimClockRecord;
}

export function readDate(value: unknown): Date {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) {
    throw new Error('Fleet data contains an invalid timestamp.');
  }
  return date;
}

export const ALERT_FIELDS = [
  'id', 'isSynthetic', 'vehicle_id', 'region_id', 'type', 'severity', 'status',
  'message', 'createdAt', 'createdBySub', 'assignedTo_id', 'assignedToSub',
  'resolvedAt', 'acknowledgedAt', 'acknowledgedBySub', 'resolvedBySub', 'source',
] as const;

export function normalizeAlert(alert: AlertRecord): AlertRecord {
  if (alert.isSynthetic !== true) throw new Error('Only synthetic alerts are supported.');
  return {
    ...alert, createdAt: readDate(alert.createdAt),
    resolvedAt: alert.resolvedAt == null ? undefined : readDate(alert.resolvedAt),
    acknowledgedAt: alert.acknowledgedAt == null ? undefined : readDate(alert.acknowledgedAt),
  };
}

export function loadAlerts(): Promise<AlertRecord[]> {
  return observeOperation('alerts.load', readAlerts);
}

async function readAlerts(): Promise<AlertRecord[]> {
  const client = await getRayfinClient();
  return (await readAllPages(async (cursor) => {
    const query = client.data.Alert.select(ALERT_FIELDS).orderBy({ id: 'asc' }).first(100);
    return (cursor ? query.after(cursor) : query).executePaginated();
  })).map(normalizeAlert);
}

export function loadFleet(): Promise<FleetSnapshot> {
  return observeOperation('fleet.load', readFleet);
}

async function readFleet(): Promise<FleetSnapshot> {
  const client = await getRayfinClient();
  const [vehicles, regions, assignments, alerts, crews, clocks] = await Promise.all([
    readAllPages(async (cursor) => {
      const query = client.data.Vehicle.select([
        'id', 'isSynthetic', 'vehicleCode', 'callSign', 'type', 'region_id', 'crew_id',
        'status', 'healthStatus', 'lat', 'lng', 'headingDeg', 'speedMph',
        'energyType', 'energyPct', 'lastTelemetryAt', 'minutesSinceReport',
        'delayStatus', 'delayMinutes', 'unit',
      ]).orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
    readAllPages(async (cursor) => {
      const query = client.data.Region.select([
        'id', 'isSynthetic', 'code', 'name', 'hubName', 'centerLat', 'centerLng', 'zoom',
      ]).orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
    readAllPages(async (cursor) => {
      const query = client.data.Assignment.select([
        'id', 'isSynthetic', 'routeCode', 'vehicle_id', 'originRegion_id', 'destinationName',
        'destLat', 'destLng', 'scheduledArrival', 'estimatedArrival', 'delayMinutes', 'status', 'isCurrent',
      ]).orderBy({ id: 'asc' }).where({ isCurrent: { eq: true } }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
    loadAlerts(),
    readAllPages(async (cursor) => {
      const query = client.data.Crew.select(['id', 'isSynthetic', 'crewCode', 'leadFirstName'])
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
    readAllPages(async (cursor) => {
      const query = client.data.SimClock.select(['id', 'isSynthetic', 'asOf', 'scenarioName', 'speed'])
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    }),
  ]);
  if (clocks.length !== 1) throw new Error('Exactly one scenario clock is required.');
  const clock = { ...clocks[0], asOf: readDate(clocks[0].asOf) };
  const regionIds = new Set(regions.map(({ id }) => id));
  const crewIds = new Set(crews.map(({ id }) => id));
  const vehicleIds = new Set(vehicles.map(({ id }) => id));
  if ([...vehicles, ...regions, ...assignments, ...alerts, ...crews, clock]
    .some((record) => record.isSynthetic !== true)) {
    throw new Error('This prototype accepts only explicitly synthetic records.');
  }
  for (const vehicle of vehicles) {
    if (!Number.isFinite(vehicle.lat) || !Number.isFinite(vehicle.lng)
      || vehicle.lat < 25 || vehicle.lat > 37 || vehicle.lng < -107 || vehicle.lng > -93
      || !regionIds.has(vehicle.region_id) || !crewIds.has(vehicle.crew_id)) {
      throw new Error('A vehicle has invalid Texas coordinates or missing reference data.');
    }
  }
  const assignedVehicles = new Set<string>();
  for (const assignment of assignments) {
    if (!vehicleIds.has(assignment.vehicle_id) || assignedVehicles.has(assignment.vehicle_id)) {
      throw new Error('Current assignments have a missing vehicle or duplicate assignment.');
    }
    assignedVehicles.add(assignment.vehicle_id);
  }
  if (vehicles.length !== assignedVehicles.size) {
    throw new Error('Every vehicle requires one current assignment.');
  }
  if (alerts.some((alert) => !vehicleIds.has(alert.vehicle_id) || !regionIds.has(alert.region_id))) {
    throw new Error('An alert has missing reference data.');
  }
  return {
    vehicles: vehicles.map((vehicle) => ({ ...vehicle, lastTelemetryAt: readDate(vehicle.lastTelemetryAt) })),
    regions, crews, clock,
    assignments: assignments.map((assignment) => ({
      ...assignment,
      scheduledArrival: readDate(assignment.scheduledArrival),
      estimatedArrival: readDate(assignment.estimatedArrival),
    })),
    alerts,
  };
}
