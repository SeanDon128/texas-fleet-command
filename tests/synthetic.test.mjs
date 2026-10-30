import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as synthetic from '../tools/synthetic.mjs';

const { generateFleet, validateFleet } = synthetic;
const AS_OF = '2026-10-27T15:00:00.000Z';
const NOW = Date.parse(AS_OF);
const MINUTE = 60_000;
const DAY = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const baseline = generateFleet();
const op = baseline.operational;
const counts = {
  Region: 8, TeamMember: 14, Crew: 40, Vehicle: 120, Assignment: 150,
  Alert: 38, FleetEvent: 320, TelemetryPing: 2880, OperatorNote: 12, SimClock: 1,
};
const fields = {
  Region: 'code name hubName centerLat centerLng zoom',
  TeamMember: 'displayName role region_id',
  Crew: 'crewCode leadFirstName',
  Vehicle: 'vehicleCode callSign type region_id crew_id status healthStatus lat lng headingDeg speedMph energyType energyPct lastTelemetryAt minutesSinceReport delayStatus delayMinutes unit',
  Assignment: 'routeCode vehicle_id originRegion_id destinationName destLat destLng scheduledArrival estimatedArrival delayMinutes status isCurrent',
  Alert: 'vehicle_id region_id type severity status message createdAt createdBySub assignedTo_id source',
  FleetEvent: 'occurredAt type vehicle_id region_id detail actor',
  TelemetryPing: 'vehicle_id ts lat lng speedMph',
  OperatorNote: 'vehicle_id authorSub text createdAt',
  SimClock: 'asOf scenarioName speed',
};
const optional = { Alert: ['assignedToSub', 'resolvedAt'], FleetEvent: ['alert_id'] };
const regionalExpectations = [
  ['DFW', 26, 3, 3, 2, 2, 4, 3, 32.7767, -96.7970],
  ['HOU', 28, 9, 4, 4, 1, 11, 8, 29.7604, -95.3698],
  ['AUS', 14, 1, 1, 0, 1, 1, 1, 30.2672, -97.7431],
  ['SAT', 14, 2, 2, 1, 1, 3, 2, 29.4241, -98.4936],
  ['ELP', 8, 0, 1, 1, 1, 2, 2, 31.7619, -106.4850],
  ['CRP', 10, 1, 1, 1, 1, 2, 1, 27.8006, -97.3964],
  ['LBB', 10, 0, 1, 1, 1, 1, 1, 33.5779, -101.8552],
  ['AMA', 10, 0, 1, 0, 0, 1, 1, 35.2220, -101.8313],
];
const tally = (rows, key) => {
  const result = {};
  for (const row of rows) result[row[key]] = (result[row[key]] ?? 0) + 1;
  return result;
};
const clone = () => structuredClone(baseline);
const tables = (dataset) => ({ ...dataset.operational, ...dataset.history });
const regionCode = (id) => op.Region.find((row) => row.id === id).code;

test('exports are exactly generateFleet and validateFleet', () => {
  assert.deepEqual(Object.keys(synthetic).sort(), ['generateFleet', 'validateFleet']);
  assert.equal(typeof generateFleet, 'function');
  assert.equal(typeof validateFleet, 'function');
});

test('default generation is byte-for-byte deterministic and validates without mutating', () => {
  assert.deepEqual(generateFleet(), baseline);
  assert.deepEqual(generateFleet({ asOf: AS_OF, seed: 20261027 }), baseline);
  const snapshot = JSON.stringify(baseline);
  assert.equal(validateFleet(baseline), undefined);
  assert.equal(JSON.stringify(baseline), snapshot);
  assert.equal(op.SimClock[0].asOf, AS_OF);
});

test('operational shapes, counts, synthetic flags and UUIDv5 identities are exact', () => {
  assert.deepEqual(Object.keys(baseline).sort(), ['history', 'operational']);
  assert.deepEqual(Object.keys(op).sort(), Object.keys(counts).sort());
  const ids = new Set();
  for (const [table, rows] of Object.entries(op)) {
    assert.equal(rows.length, counts[table], table);
    const required = ['id', ...fields[table].split(' '), 'isSynthetic'];
    const allowed = new Set([...required, ...(optional[table] ?? [])]);
    for (const row of rows) {
      for (const key of required) assert.ok(Object.hasOwn(row, key), `${table}.${key}`);
      for (const key of Object.keys(row)) assert.ok(allowed.has(key), `${table}.${key}`);
      assert.equal(row.isSynthetic, true);
      assert.match(row.id, UUID);
      assert.ok(!ids.has(row.id), `${table} duplicate id`);
      ids.add(row.id);
      for (const value of Object.values(row)) assert.notEqual(value, null);
    }
  }
  for (const member of op.TeamMember) {
    assert.ok(!Object.hasOwn(member, 'email'));
    assert.ok(!Object.hasOwn(member, 'entraSub'));
    assert.match(member.displayName, /^Synthetic [A-Z]{3} (Operator|Coordinator)$/);
  }
  for (const vehicle of op.Vehicle) assert.ok(!Object.keys(vehicle).some((key) => /assignment/i.test(key)));
});

test('UUIDs use RFC 4122 version 5 hashing, not seed or timestamps', () => {
  const namespace = Buffer.from('ac787b4f66095fa5bc00b03fe825d31b', 'hex');
  const digest = createHash('sha1').update(namespace).update('Region:DFW').digest();
  digest[6] = (digest[6] & 15) | 80;
  digest[8] = (digest[8] & 63) | 128;
  const hex = digest.subarray(0, 16).toString('hex');
  assert.equal(op.Region.find((row) => row.code === 'DFW').id,
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`);
});

test('all entity IDs remain stable across seed changes and timestamp rebases', () => {
  const changedSeed = generateFleet({ seed: -1234567 });
  const rebased = generateFleet({ asOf: '2026-10-28T15:00:00.000Z' });
  for (const table of Object.keys(op)) {
    assert.deepEqual(changedSeed.operational[table].map((row) => row.id), op[table].map((row) => row.id), table);
    assert.deepEqual(rebased.operational[table].map((row) => row.id), op[table].map((row) => row.id), table);
  }
  assert.notEqual(changedSeed.operational.Vehicle[0].lat, op.Vehicle[0].lat);
  assert.deepEqual(generateFleet({ seed: -1234567 }), changedSeed);
  for (const table of Object.keys(baseline.history)) {
    assert.deepEqual(changedSeed.history[table].map((row) => row.id), baseline.history[table].map((row) => row.id));
    const original = new Map(baseline.history[table].map((row) => [row.id, row.date]));
    const overlap = rebased.history[table].filter((row) => original.has(row.id));
    assert.equal(overlap.length, table === 'vehicle_daily' ? 120 * 29 : 8 * 29);
    for (const row of overlap) assert.equal(original.get(row.id), row.date);
  }
  assert.equal(Date.parse(rebased.operational.Vehicle[0].lastTelemetryAt)
    - Date.parse(op.Vehicle[0].lastTelemetryAt), DAY);
  assert.equal(rebased.operational.Vehicle[0].lat, op.Vehicle[0].lat);
});

test('valid ISO offsets normalize, fractional clocks work, and calendar history handles month boundaries', () => {
  assert.deepEqual(generateFleet({ asOf: '2026-10-27T11:00:00-04:00' }), baseline);
  const dataset = generateFleet({ asOf: '2026-12-01T00:00:00.123Z', seed: 0 });
  assert.equal(dataset.operational.SimClock[0].asOf, '2026-12-01T00:00:00.123Z');
  assert.equal(dataset.history.fleet_daily_kpi[0].date, '2026-11-01');
  assert.equal(dataset.history.fleet_daily_kpi.at(-1).date, '2026-11-30');
  assert.ok(dataset.operational.TelemetryPing.every((row) => row.ts.endsWith('.123Z')));
  const leap = generateFleet({ asOf: '2028-03-01T00:00:00Z' });
  assert.equal(leap.history.fleet_daily_kpi.at(-1).date, '2028-02-29');
});

test('invalid asOf values throw instead of falling back or normalizing impossible dates', () => {
  for (const asOf of [
    null, 123, new Date(AS_OF), '', 'not-a-date', '2026-10-27', '2026-10-27T15:00:00',
    '2026-02-30T00:00:00Z', '2025-02-29T00:00:00Z', '2026-04-31T00:00:00Z',
    '2026-13-01T00:00:00Z', '2026-10-27T24:00:00Z', '2026-10-27T15:60:00Z',
    '2026-10-27T15:00:60Z', '2026-10-27T15:00:00+25:00', '2026-10-27T15:00:00+03:99',
    '0000-01-01T00:00:00Z', '9999-12-31T23:59:59Z',
  ]) assert.throws(() => generateFleet({ asOf }), /asOf/, String(asOf));
});

test('invalid seeds throw; safe integer boundaries and negative seeds are supported', () => {
  for (const seed of [null, '20261027', '', 1.5, NaN, Infinity, -Infinity, 2 ** 53, -(2 ** 53), {}, true, 1n]) {
    assert.throws(() => generateFleet({ seed }), /seed must be a safe integer/, String(seed));
  }
  for (const seed of [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) assert.doesNotThrow(() => generateFleet({ seed }));
});

test('status, health, energy, delay, assignment, alert and event enums and totals match the contract', () => {
  assert.deepEqual(tally(op.Vehicle, 'status'), { en_route: 72, at_stop: 16, idle: 14, maintenance: 8, offline: 10 });
  assert.deepEqual(tally(op.Vehicle, 'healthStatus'), { ok: 96, watch: 17, service_needed: 7 });
  assert.deepEqual(tally(op.Vehicle, 'delayStatus'), { delayed: 16, at_risk: 14, on_time: 58, not_applicable: 32 });
  assert.deepEqual(tally(op.Assignment, 'status'), { active: 120, completed: 30 });
  assert.deepEqual(tally(op.Alert, 'status'), { open: 25, resolved: 13 });
  const open = op.Alert.filter((row) => row.status === 'open');
  assert.deepEqual(tally(open, 'severity'), { warning: 12, critical: 4, info: 9 });
  assert.equal(new Set(open.map((row) => row.vehicle_id)).size, 19);
  for (const vehicle of op.Vehicle) {
    assert.equal(vehicle.type, 'service_truck');
    assert.ok(['diesel', 'electric'].includes(vehicle.energyType));
    assert.equal(vehicle.unit, 1);
    assert.ok(vehicle.energyPct >= 0 && vehicle.energyPct <= 100);
    assert.ok(vehicle.headingDeg >= 0 && vehicle.headingDeg < 360);
    assert.ok(vehicle.speedMph >= 0 && vehicle.speedMph <= 90);
  }
  for (const alert of op.Alert) {
    assert.ok(['delay', 'telemetry', 'health', 'operations'].includes(alert.type));
    assert.equal(alert.source, 'simulation');
  }
  for (const event of op.FleetEvent) assert.ok([
    'status_change', 'delay_update', 'telemetry_lost', 'telemetry_restored',
    'alert_created', 'alert_acknowledged', 'alert_resolved',
  ].includes(event.type));
});

test('all eight region distributions, geography centers, alert coverage and delayed means are exact', () => {
  for (const [code, count, delayed, atRisk, offline, maintenance, openAlerts, affected, lat, lng] of regionalExpectations) {
    const region = op.Region.find((row) => row.code === code);
    assert.equal(region.centerLat, lat);
    assert.equal(region.centerLng, lng);
    const vehicles = op.Vehicle.filter((row) => row.region_id === region.id);
    const alerts = op.Alert.filter((row) => row.region_id === region.id && row.status === 'open');
    assert.equal(vehicles.length, count, code);
    assert.equal(vehicles.filter((row) => row.delayStatus === 'delayed').length, delayed, code);
    assert.equal(vehicles.filter((row) => row.delayStatus === 'at_risk').length, atRisk, code);
    assert.equal(vehicles.filter((row) => row.status === 'offline').length, offline, code);
    assert.equal(vehicles.filter((row) => row.status === 'maintenance').length, maintenance, code);
    assert.equal(alerts.length, openAlerts, code);
    assert.equal(new Set(alerts.map((row) => row.vehicle_id)).size, affected, code);
    assert.equal(alerts.filter((row) => row.severity === 'critical').length, code === 'HOU' ? 3 : code === 'ELP' ? 1 : 0);
    const delayedVehicles = vehicles.filter((row) => row.delayStatus === 'delayed');
    if (delayedVehicles.length) assert.equal(
      delayedVehicles.reduce((sum, row) => sum + row.delayMinutes, 0) / delayedVehicles.length, code === 'HOU' ? 38 : 24);
  }
  for (const vehicle of op.Vehicle) {
    const moving = ['en_route', 'at_stop'].includes(vehicle.status);
    assert.equal(vehicle.delayStatus === 'not_applicable', !moving);
    if (['not_applicable', 'on_time'].includes(vehicle.delayStatus)) assert.equal(vehicle.delayMinutes, 0);
    else assert.ok(vehicle.delayMinutes > 0);
  }
});

test('all operational foreign keys resolve and region relationships agree', () => {
  const regions = new Map(op.Region.map((row) => [row.id, row]));
  const vehicles = new Map(op.Vehicle.map((row) => [row.id, row]));
  const members = new Map(op.TeamMember.map((row) => [row.id, row]));
  const crews = new Set(op.Crew.map((row) => row.id));
  const alerts = new Map(op.Alert.map((row) => [row.id, row]));
  for (const member of op.TeamMember) assert.ok(regions.has(member.region_id));
  for (const vehicle of op.Vehicle) {
    assert.ok(regions.has(vehicle.region_id));
    assert.ok(crews.has(vehicle.crew_id));
  }
  for (const crew of op.Crew) assert.equal(op.Vehicle.filter((row) => row.crew_id === crew.id).length, 3);
  for (const assignment of op.Assignment) {
    assert.ok(vehicles.has(assignment.vehicle_id));
    assert.equal(assignment.originRegion_id, vehicles.get(assignment.vehicle_id).region_id);
  }
  for (const alert of op.Alert) {
    assert.ok(vehicles.has(alert.vehicle_id));
    assert.equal(alert.region_id, vehicles.get(alert.vehicle_id).region_id);
    assert.equal(members.get(alert.assignedTo_id).region_id, alert.region_id);
  }
  for (const event of op.FleetEvent) {
    assert.ok(vehicles.has(event.vehicle_id));
    assert.equal(event.region_id, vehicles.get(event.vehicle_id).region_id);
    if (event.alert_id) {
      assert.equal(alerts.get(event.alert_id).vehicle_id, event.vehicle_id);
      assert.equal(alerts.get(event.alert_id).region_id, event.region_id);
    }
  }
  for (const row of [...op.TelemetryPing, ...op.OperatorNote]) assert.ok(vehicles.has(row.vehicle_id));
});

test('exactly one active current assignment per vehicle, including inactive vehicles, with consistent ETAs', () => {
  for (const vehicle of op.Vehicle) {
    const assignments = op.Assignment.filter((row) => row.vehicle_id === vehicle.id && row.isCurrent);
    assert.equal(assignments.length, 1);
    assert.equal(assignments[0].status, 'active');
    assert.equal(assignments[0].delayMinutes, vehicle.delayMinutes);
  }
  assert.equal(op.Assignment.filter((row) => row.isCurrent).length, 120);
  for (const row of op.Assignment) {
    assert.equal(typeof row.isCurrent, 'boolean');
    assert.equal(Date.parse(row.estimatedArrival) - Date.parse(row.scheduledArrival), row.delayMinutes * MINUTE);
    if (!row.isCurrent) {
      assert.equal(row.status, 'completed');
      assert.ok(Date.parse(row.estimatedArrival) < NOW);
    }
    assert.match(row.routeCode, /^SYN-(ROUTE|COMPLETED)-\d{3}$/);
    assert.match(row.destinationName, /^Synthetic Stop [A-Z]{3}-H?\d{3}$/);
  }
});

test('telemetry samples end at last report, are five minutes apart and never freshen offline vehicles', () => {
  let stale = 0;
  for (const vehicle of op.Vehicle) {
    const pings = op.TelemetryPing.filter((row) => row.vehicle_id === vehicle.id).sort((a, b) => a.ts.localeCompare(b.ts));
    assert.equal(pings.length, 24);
    assert.equal(pings.at(-1).ts, vehicle.lastTelemetryAt);
    assert.equal(Date.parse(pings[0].ts), Date.parse(vehicle.lastTelemetryAt) - 115 * MINUTE);
    assert.deepEqual(
      [pings.at(-1).lat, pings.at(-1).lng, pings.at(-1).speedMph],
      [vehicle.lat, vehicle.lng, vehicle.speedMph],
    );
    for (let index = 1; index < pings.length; index++) assert.equal(
      Date.parse(pings[index].ts) - Date.parse(pings[index - 1].ts), 5 * MINUTE);
    assert.equal((NOW - Date.parse(vehicle.lastTelemetryAt)) / MINUTE, vehicle.minutesSinceReport);
    if (vehicle.minutesSinceReport > 15) stale++;
    assert.equal(vehicle.minutesSinceReport > 15, vehicle.status === 'offline');
    for (const ping of pings) assert.ok(Date.parse(ping.ts) <= Date.parse(vehicle.lastTelemetryAt));
  }
  assert.equal(stale, 10);
});

test('coordinates stay near Texas centers; El Paso vehicles, stops and all pings stay north/east', () => {
  const regionMap = new Map(op.Region.map((row) => [row.id, row]));
  const vehicleMap = new Map(op.Vehicle.map((row) => [row.id, row]));
  const positions = [
    ...op.Vehicle.map((row) => [row.lat, row.lng, row.region_id]),
    ...op.Assignment.map((row) => [row.destLat, row.destLng, row.originRegion_id]),
    ...op.TelemetryPing.map((row) => [row.lat, row.lng, vehicleMap.get(row.vehicle_id).region_id]),
  ];
  for (const [lat, lng, regionId] of positions) {
    const region = regionMap.get(regionId);
    assert.ok(lat >= 25.8 && lat <= 36.6 && lng >= -106.65 && lng <= -93.5);
    assert.ok(Math.abs(lat - region.centerLat) <= 0.25 && Math.abs(lng - region.centerLng) <= 0.25);
    if (region.code === 'ELP') assert.ok(lat >= region.centerLat && lng >= region.centerLng);
  }
});

test('event windows, Houston concentration and alert lifecycles are coherent', () => {
  const recent = op.FleetEvent.filter((row) => Date.parse(row.occurredAt) >= NOW - 60 * MINUTE);
  assert.equal(recent.length, 60);
  assert.ok(recent.filter((row) => regionCode(row.region_id) === 'HOU').length >= 36);
  for (const event of op.FleetEvent) {
    assert.ok(Date.parse(event.occurredAt) >= NOW - 360 * MINUTE);
    assert.ok(Date.parse(event.occurredAt) <= NOW);
    assert.match(event.actor, /^synthetic-/);
  }
  for (const alert of op.Alert) {
    assert.match(alert.createdBySub, /^synthetic-/);
    const events = op.FleetEvent.filter((row) => row.alert_id === alert.id);
    assert.equal(events.filter((row) => row.type === 'alert_created').length, 1);
    for (const event of events) assert.ok(Date.parse(event.occurredAt) >= Date.parse(alert.createdAt));
    assert.equal(events.find((row) => row.type === 'alert_created').occurredAt, alert.createdAt);
    if (alert.status === 'resolved') {
      assert.ok(Date.parse(alert.resolvedAt) >= Date.parse(alert.createdAt));
      assert.ok(Date.parse(alert.resolvedAt) <= NOW);
      assert.equal(events.find((row) => row.type === 'alert_resolved').occurredAt, alert.resolvedAt);
    } else assert.ok(!Object.hasOwn(alert, 'resolvedAt'));
  }
  for (const note of op.OperatorNote) {
    assert.match(note.authorSub, /^synthetic-/);
    assert.ok(Date.parse(note.createdAt) <= NOW);
  }
});

test('every timestamp is a canonical ISO string and every synthetic flag is an actual boolean', () => {
  const timestamps = {
    Vehicle: ['lastTelemetryAt'], Assignment: ['scheduledArrival', 'estimatedArrival'],
    Alert: ['createdAt', 'resolvedAt'], FleetEvent: ['occurredAt'],
    TelemetryPing: ['ts'], OperatorNote: ['createdAt'], SimClock: ['asOf'],
  };
  for (const [table, keys] of Object.entries(timestamps)) {
    for (const row of op[table]) {
      assert.equal(typeof row.isSynthetic, 'boolean');
      for (const key of keys) if (Object.hasOwn(row, key)) {
        assert.equal(typeof row[key], 'string');
        assert.equal(new Date(row[key]).toISOString(), row[key]);
      }
    }
  }
});

test('history has exact snake_case shapes, complete dates, stable keys and valid foreign keys', () => {
  assert.deepEqual(Object.keys(baseline.history).sort(), ['fleet_daily_kpi', 'vehicle_daily']);
  assert.equal(baseline.history.fleet_daily_kpi.length, 240);
  assert.equal(baseline.history.vehicle_daily.length, 3600);
  const expected = {
    fleet_daily_kpi: 'id date region_id region_code vehicle_count delayed_count open_alert_count average_delay_minutes is_synthetic',
    vehicle_daily: 'id date vehicle_id vehicle_code region_id region_code distance_miles delay_minutes energy_pct status is_synthetic',
  };
  const dates = Array.from({ length: 30 }, (_, index) => new Date(
    Date.parse('2026-10-27T00:00:00.000Z') - (30 - index) * DAY).toISOString().slice(0, 10));
  assert.equal(dates[0], '2026-09-27');
  assert.equal(dates.at(-1), '2026-10-26');
  const vehicles = new Map(op.Vehicle.map((row) => [row.id, row]));
  const allIds = new Set(Object.values(op).flat().map((row) => row.id));
  for (const [table, rows] of Object.entries(baseline.history)) {
    assert.deepEqual([...new Set(rows.map((row) => row.date))].sort(), dates);
    for (const row of rows) {
      assert.deepEqual(Object.keys(row).sort(), expected[table].split(' ').sort());
      assert.equal(row.is_synthetic, true);
      assert.match(row.id, UUID);
      assert.ok(!allIds.has(row.id));
      allIds.add(row.id);
      assert.equal(row.region_code, regionCode(row.region_id));
      if (table === 'vehicle_daily') {
        const vehicle = vehicles.get(row.vehicle_id);
        assert.equal(row.vehicle_code, vehicle.vehicleCode);
        assert.equal(row.region_id, vehicle.region_id);
        assert.ok(row.distance_miles >= 0 && row.delay_minutes >= 0 && row.energy_pct >= 0 && row.energy_pct <= 100);
        assert.ok(['en_route', 'at_stop', 'idle', 'maintenance', 'offline'].includes(row.status));
        if (!['en_route', 'at_stop'].includes(row.status)) {
          assert.equal(row.distance_miles, 0);
          assert.equal(row.delay_minutes, 0);
        }
      }
    }
  }
  for (const vehicle of op.Vehicle) assert.equal(
    new Set(baseline.history.vehicle_daily.filter((row) => row.vehicle_id === vehicle.id).map((row) => row.date)).size, 30);
});

test('all regional daily KPIs reconcile with vehicle history and each daily fleet sum is 120', () => {
  const { fleet_daily_kpi: kpis, vehicle_daily: daily } = baseline.history;
  for (const kpi of kpis) {
    const rows = daily.filter((row) => row.date === kpi.date && row.region_id === kpi.region_id);
    assert.equal(kpi.vehicle_count, rows.length);
    assert.equal(kpi.vehicle_count, op.Vehicle.filter((row) => row.region_id === kpi.region_id).length);
    assert.equal(kpi.delayed_count, rows.filter((row) => row.delay_minutes > 0).length);
    assert.equal(kpi.average_delay_minutes, rows.reduce((sum, row) => sum + row.delay_minutes, 0) / rows.length);
    assert.ok(Number.isInteger(kpi.open_alert_count) && kpi.open_alert_count >= 0);
  }
  for (const date of new Set(kpis.map((row) => row.date))) {
    const rows = kpis.filter((row) => row.date === date);
    assert.equal(rows.length, 8);
    assert.equal(rows.reduce((sum, row) => sum + row.vehicle_count, 0), 120);
    assert.equal(rows.reduce((sum, row) => sum + row.delayed_count, 0),
      daily.filter((row) => row.date === date && row.delay_minutes > 0).length);
  }
});

test('validation supports persisted data in arbitrary row order and valid omitted optional fields', () => {
  const dataset = clone();
  for (const rows of Object.values(tables(dataset))) rows.reverse();
  dataset.operational.Alert[0].assignedToSub = 'synthetic-operator';
  assert.doesNotThrow(() => validateFleet(dataset));
});

test('every table rejects missing/extra fields, wrong types, false flags, duplicate IDs and count corruption', () => {
  for (const name of Object.keys(tables(baseline))) {
    const flag = Object.hasOwn(op, name) ? 'isSynthetic' : 'is_synthetic';
    const missing = clone();
    delete tables(missing)[name][0].id;
    assert.throws(() => validateFleet(missing), /missing fields/, name);
    const extra = clone();
    tables(extra)[name][0].unexpected = true;
    assert.throws(() => validateFleet(extra), /unexpected/, name);
    const invalidType = clone();
    tables(invalidType)[name][0][flag] = 'true';
    assert.throws(() => validateFleet(invalidType), /boolean/, name);
    const falseFlag = clone();
    tables(falseFlag)[name][0][flag] = false;
    assert.throws(() => validateFleet(falseFlag), /must be true/, name);
    const duplicate = clone();
    tables(duplicate)[name][1 === counts[name] ? 0 : 1].id = op.Region[0].id;
    assert.throws(() => validateFleet(duplicate), /duplicated|unstable id/, name);
    const wrongCount = clone();
    tables(wrongCount)[name].pop();
    assert.throws(() => validateFleet(wrongCount), /must have/, name);
  }
});

test('every table rejects UUIDv5 values that violate its stable identity scheme', () => {
  for (const name of Object.keys(tables(baseline))) {
    const dataset = clone();
    tables(dataset)[name][0].id = '12345678-1234-5678-8123-123456789abc';
    assert.throws(() => validateFleet(dataset), /unstable id/, name);
  }
});

const corruptions = [
  ['dataset missing table', (d) => { delete d.operational.Crew; }, /missing fields/],
  ['dataset extra table', (d) => { d.history.extra = []; }, /unexpected/],
  ['dataset wrong root', (d) => { d.other = true; }, /unexpected/],
  ['non-array table', (d) => { d.operational.Alert = {}; }, /must have/],
  ['null row', (d) => { d.operational.Vehicle[0] = null; }, /must be an object/],
  ['invalid UUID version', (d) => { d.operational.Vehicle[0].id = '00000000-0000-4000-8000-000000000000'; }, /UUIDv5/],
  ['missing Region FK', (d) => { d.operational.Vehicle[0].region_id = op.Crew[0].id; }, /missing Region/],
  ['missing Crew FK', (d) => { d.operational.Vehicle[0].crew_id = op.Region[0].id; }, /missing Crew/],
  ['missing TeamMember Region FK', (d) => { d.operational.TeamMember[0].region_id = op.Crew[0].id; }, /missing Region/],
  ['missing Assignment Vehicle FK', (d) => { d.operational.Assignment[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing Alert Vehicle FK', (d) => { d.operational.Alert[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing Alert assignee FK', (d) => { d.operational.Alert[0].assignedTo_id = op.Region[0].id; }, /missing TeamMember/],
  ['missing FleetEvent Vehicle FK', (d) => { d.operational.FleetEvent[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing FleetEvent Alert FK', (d) => { d.operational.FleetEvent[0].alert_id = op.Region[0].id; }, /missing Alert/],
  ['missing ping Vehicle FK', (d) => { d.operational.TelemetryPing[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing note Vehicle FK', (d) => { d.operational.OperatorNote[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing daily Vehicle FK', (d) => { d.history.vehicle_daily[0].vehicle_id = op.Region[0].id; }, /missing Vehicle/],
  ['missing KPI Region FK', (d) => { d.history.fleet_daily_kpi[0].region_id = op.Crew[0].id; }, /missing Region/],
  ['fake email field', (d) => { d.operational.TeamMember[0].email = 'fake@example.invalid'; }, /unexpected/],
  ['circular assignment pointer', (d) => { d.operational.Vehicle[0].assignment_id = op.Assignment[0].id; }, /unexpected/],
  ['nonsynthetic author', (d) => { d.operational.OperatorNote[0].authorSub = 'someone@example.invalid'; }, /synthetic identity/],
  ['null optional field', (d) => { d.operational.Alert[0].assignedToSub = null; }, /synthetic identity/],
  ['wrong vehicle enum', (d) => { d.operational.Vehicle[0].status = 'driving'; }, /enum/],
  ['wrong health enum', (d) => { d.operational.Vehicle[0].healthStatus = 'healthy'; }, /enum/],
  ['wrong delay enum', (d) => { d.operational.Vehicle[0].delayStatus = 'late'; }, /enum/],
  ['wrong energy enum', (d) => { d.operational.Vehicle[0].energyType = 'gas'; }, /enum/],
  ['wrong alert enum', (d) => { d.operational.Alert[0].type = 'security'; }, /enum/],
  ['wrong alert severity enum', (d) => { d.operational.Alert[0].severity = 'urgent'; }, /enum/],
  ['wrong alert status enum', (d) => { d.operational.Alert[0].status = 'closed'; }, /enum/],
  ['wrong event enum', (d) => { d.operational.FleetEvent[0].type = 'moved'; }, /enum/],
  ['wrong assignment enum', (d) => { d.operational.Assignment[0].status = 'pending'; }, /enum/],
  ['wrong historical enum', (d) => { d.history.vehicle_daily[0].status = 'driving'; }, /enum/],
  ['invalid timestamp', (d) => { d.operational.Vehicle[0].lastTelemetryAt = 'not-a-date'; }, /ISO timestamp/],
  ['noncanonical timestamp', (d) => { d.operational.OperatorNote[0].createdAt = '2026-10-27T11:00:00-04:00'; }, /canonical ISO/],
  ['nonfinite number', (d) => { d.operational.Vehicle[0].lat = NaN; }, /finite number/],
  ['unit other than one', (d) => { d.operational.Vehicle[0].unit = 2; }, /unit must be 1/],
  ['energy outside bounds', (d) => { d.operational.Vehicle[0].energyPct = 101; }, /energyPct/],
  ['heading outside bounds', (d) => { d.operational.Vehicle[0].headingDeg = 360; }, /headingDeg/],
  ['speed outside bounds', (d) => { d.operational.Vehicle[0].speedMph = 100; }, /speedMph/],
  ['stationary vehicle speed', (d) => { d.operational.Vehicle.find((r) => r.status === 'idle').speedMph = 5; }, /speed must be zero/],
  ['wrong center', (d) => { d.operational.Region[0].centerLat += 1; }, /invalid center/],
  ['out of Texas', (d) => { d.operational.Vehicle[0].lat = 40; }, /position.lat/],
  ['far from region', (d) => { d.operational.Vehicle[0].lng += 1; }, /near its synthetic/],
  ['El Paso westward jitter', (d) => {
    d.operational.Vehicle.find((r) => regionCode(r.region_id) === 'ELP').lng = -106.49;
  }, /El Paso/],
  ['El Paso southward ping', (d) => {
    const vehicle = op.Vehicle.find((r) => regionCode(r.region_id) === 'ELP');
    d.operational.TelemetryPing.find((r) => r.vehicle_id === vehicle.id).lat = 31.75;
  }, /El Paso/],
  ['negative delay', (d) => { d.operational.Vehicle[0].delayMinutes = -1; }, /nonnegative/],
  ['wrong Houston delay', (d) => {
    d.operational.Vehicle.find((r) => regionCode(r.region_id) === 'HOU' && r.delayStatus === 'delayed').delayMinutes = 37;
  }, /38 in HOU/],
  ['wrong other delayed mean', (d) => { d.operational.Vehicle[0].delayMinutes = 25; }, /38 in HOU/],
  ['stale non-offline row', (d) => {
    const row = d.operational.Vehicle[0];
    row.minutesSinceReport = 16;
    row.lastTelemetryAt = new Date(NOW - 16 * MINUTE).toISOString();
  }, /offline freshness/],
  ['offline exactly fifteen minutes', (d) => {
    const row = d.operational.Vehicle.find((r) => r.status === 'offline');
    row.minutesSinceReport = 15;
    row.lastTelemetryAt = new Date(NOW - 15 * MINUTE).toISOString();
  }, /offline freshness/],
  ['report age mismatch', (d) => { d.operational.Vehicle[0].minutesSinceReport += 1; }, /must match lastTelemetryAt/],
  ['inactive delay classification', (d) => {
    const stopped = d.operational.Vehicle.find((r) => r.status === 'idle');
    const onTime = d.operational.Vehicle.find((r) => r.delayStatus === 'on_time');
    [stopped.delayStatus, onTime.delayStatus] = [onTime.delayStatus, stopped.delayStatus];
  }, /only to moving/],
  ['wrong ETA arithmetic', (d) => {
    d.operational.Assignment[0].estimatedArrival = new Date(NOW).toISOString();
  }, /ETA must equal/],
  ['wrong current assignment delay', (d) => {
    const row = d.operational.Assignment[0];
    row.delayMinutes += 1;
    row.estimatedArrival = new Date(Date.parse(row.scheduledArrival) + row.delayMinutes * MINUTE).toISOString();
  }, /delay must match Vehicle/],
  ['two current assignments on one vehicle', (d) => {
    const target = d.operational.Assignment[0];
    const other = d.operational.Assignment.find((r) => r.isCurrent && r.vehicle_id !== target.vehicle_id
      && r.originRegion_id === target.originRegion_id && r.delayMinutes === target.delayMinutes);
    other.vehicle_id = target.vehicle_id;
  }, /exactly one current/],
  ['completed assignment after clock', (d) => {
    const row = d.operational.Assignment.find((r) => !r.isCurrent);
    row.scheduledArrival = AS_OF;
    row.estimatedArrival = new Date(NOW + row.delayMinutes * MINUTE).toISOString();
  }, /before asOf/],
  ['isCurrent string', (d) => { d.operational.Assignment[0].isCurrent = 'true'; }, /boolean/],
  ['current flag inconsistent', (d) => { d.operational.Assignment[0].isCurrent = false; }, /flags disagree/],
  ['alert wrong region', (d) => { d.operational.Alert[0].region_id = op.Region[1].id; }, /region must match/],
  ['resolved timestamp omitted', (d) => { delete d.operational.Alert.find((r) => r.status === 'resolved').resolvedAt; }, /must have resolvedAt/],
  ['resolution before creation', (d) => {
    const row = d.operational.Alert.find((r) => r.status === 'resolved');
    row.resolvedAt = new Date(Date.parse(row.createdAt) - MINUTE).toISOString();
  }, /precedes createdAt/],
  ['resolution in future', (d) => {
    d.operational.Alert.find((r) => r.status === 'resolved').resolvedAt = new Date(NOW + MINUTE).toISOString();
  }, /after asOf/],
  ['open alert has resolution', (d) => { d.operational.Alert[0].resolvedAt = AS_OF; }, /must omit resolvedAt/],
  ['wrong alert coverage', (d) => { d.operational.Alert[1].vehicle_id = d.operational.Alert[0].vehicle_id; }, /19 Vehicles|affected Vehicle/],
  ['wrong severity totals', (d) => { d.operational.Alert[0].severity = 'critical'; }, /severity.*distribution/],
  ['event in future', (d) => { d.operational.FleetEvent[0].occurredAt = new Date(NOW + MINUTE).toISOString(); }, /six-hour/],
  ['event before six-hour window', (d) => {
    d.operational.FleetEvent[0].occurredAt = new Date(NOW - 361 * MINUTE).toISOString();
  }, /six-hour/],
  ['event precedes alert', (d) => {
    d.operational.FleetEvent[0].occurredAt = new Date(Date.parse(op.Alert[0].createdAt) - MINUTE).toISOString();
  }, /precedes referenced Alert/],
  ['event omits required alert', (d) => { delete d.operational.FleetEvent[0].alert_id; }, /must reference an Alert/],
  ['last-hour event count', (d) => {
    d.operational.FleetEvent.at(-1).occurredAt = new Date(NOW - 61 * MINUTE).toISOString();
  }, /Exactly 60/],
  ['Houston event concentration', (d) => {
    const vehicle = op.Vehicle[0];
    const recent = d.operational.FleetEvent.filter((r) => regionCode(r.region_id) === 'HOU'
      && Date.parse(r.occurredAt) >= NOW - 60 * MINUTE);
    for (const row of recent.slice(0, 5)) {
      row.vehicle_id = vehicle.id;
      row.region_id = vehicle.region_id;
    }
  }, /At least 36/],
  ['ping interval', (d) => {
    d.operational.TelemetryPing[0].ts = new Date(Date.parse(op.TelemetryPing[0].ts) - MINUTE).toISOString();
  }, /five minutes/],
  ['ping updates stale offline vehicle', (d) => {
    const vehicle = op.Vehicle.find((r) => r.status === 'offline');
    for (const row of d.operational.TelemetryPing.filter((r) => r.vehicle_id === vehicle.id)) {
      row.ts = new Date(Date.parse(row.ts) + 20 * MINUTE).toISOString();
    }
  }, /must equal Vehicle.lastTelemetryAt/],
  ['ping final position mismatch', (d) => { d.operational.TelemetryPing[23].lat += 0.001; }, /position\/speed/],
  ['ping final speed mismatch', (d) => { d.operational.TelemetryPing[23].speedMph += 1; }, /position\/speed/],
  ['uneven ping counts', (d) => { d.operational.TelemetryPing[0].vehicle_id = op.Vehicle[1].id; }, /exactly 24/],
  ['future note', (d) => { d.operational.OperatorNote[0].createdAt = new Date(NOW + MINUTE).toISOString(); }, /after asOf/],
  ['invalid historical date', (d) => { d.history.vehicle_daily[0].date = '2026-02-30'; }, /valid ISO calendar/],
  ['current date in history', (d) => { d.history.vehicle_daily[0].date = '2026-10-27'; }, /completed day/],
  ['historical code mismatch', (d) => { d.history.vehicle_daily[0].vehicle_code = 'SYN-WRONG'; }, /codes and regions/],
  ['historical region mismatch', (d) => { d.history.vehicle_daily[0].region_id = op.Region[1].id; }, /codes and regions/],
  ['historical negative distance', (d) => { d.history.vehicle_daily[0].distance_miles = -1; }, /nonnegative/],
  ['historical invalid energy', (d) => { d.history.vehicle_daily[0].energy_pct = 101; }, /energy_pct/],
  ['inactive historical delay', (d) => {
    d.history.vehicle_daily.find((r) => r.status === 'maintenance').delay_minutes = 2;
  }, /Inactive vehicle_daily/],
  ['historical daily count mismatch', (d) => { d.history.fleet_daily_kpi[0].vehicle_count -= 1; }, /vehicle_count must match/],
  ['historical delayed sum mismatch', (d) => { d.history.fleet_daily_kpi[0].delayed_count += 1; }, /delayed_count must match/],
  ['historical mean mismatch', (d) => { d.history.fleet_daily_kpi[0].average_delay_minutes += 1; }, /average_delay_minutes must match/],
  ['historical negative alerts', (d) => { d.history.fleet_daily_kpi[0].open_alert_count = -1; }, /nonnegative/],
  ['historical wrong synthetic key', (d) => {
    d.history.vehicle_daily[0].isSynthetic = true;
    delete d.history.vehicle_daily[0].is_synthetic;
  }, /unexpected or missing/],
];
for (const [name, corrupt, error] of corruptions) {
  test(`validation rejects ${name}`, () => {
    const dataset = clone();
    corrupt(dataset);
    assert.throws(() => validateFleet(dataset), error);
  });
}

test('null, primitive and malformed datasets throw explicit validation errors', () => {
  for (const dataset of [null, undefined, true, [], {}, { operational: {}, history: {} }]) {
    assert.throws(() => validateFleet(dataset), /Invalid synthetic fleet:/);
  }
});

test('CLI rejects bad arguments before any output writes', () => {
  const cli = fileURLToPath(new URL('../tools/generate-data.mjs', import.meta.url));
  for (const [args, error] of [
    [['--unknown'], /Unknown argument/],
    [['--seed'], /Missing value/],
    [['--as-of'], /Missing value/],
    [['--seed', '1.5'], /safe integer/],
    [['--seed', '1e3'], /safe integer/],
    [['--seed', '9007199254740992'], /safe integer/],
    [['--seed', '1', '--seed', '2'], /Duplicate argument/],
    [['--as-of', 'invalid'], /asOf/],
    [['--rebase-now', '--as-of', AS_OF], /conflicts/],
    [['--rebase-now', '--rebase-now'], /Duplicate argument/],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.match(result.stderr, error);
    assert.equal(result.stdout, '');
  }
});
