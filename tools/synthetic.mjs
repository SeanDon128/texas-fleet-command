import { createHash } from 'node:crypto';

const DEFAULT_AS_OF = '2026-10-27T15:00:00.000Z';
const DEFAULT_SEED = 20261027;
const MINUTE = 60_000;
const DAY = 86_400_000;
const NAMESPACE = Buffer.from('ac787b4f66095fa5bc00b03fe825d31b', 'hex');
const SCENARIO = 'Synthetic Texas Fleet';
const REGIONS = [
  ['DFW', 26, 3, 3, 2, 2, 4, 3, 32.7767, -96.7970, 3, 4],
  ['HOU', 28, 9, 4, 4, 1, 11, 8, 29.7604, -95.3698, 3, 4],
  ['AUS', 14, 1, 1, 0, 1, 1, 1, 30.2672, -97.7431, 2, 2],
  ['SAT', 14, 2, 2, 1, 1, 3, 2, 29.4241, -98.4936, 2, 2],
  ['ELP', 8, 0, 1, 1, 1, 2, 2, 31.7619, -106.4850, 1, 1],
  ['CRP', 10, 1, 1, 1, 1, 2, 1, 27.8006, -97.3964, 1, 1],
  ['LBB', 10, 0, 1, 1, 1, 1, 1, 33.5779, -101.8552, 1, 1],
  ['AMA', 10, 0, 1, 0, 0, 1, 1, 35.2220, -101.8313, 1, 1],
].map(([code, count, delayed, atRisk, offline, maintenance, openAlerts,
  affectedVehicles, lat, lng, idle, atStop]) => ({
  code, count, delayed, atRisk, offline, maintenance, openAlerts,
  affectedVehicles, lat, lng, idle, atStop,
}));

const VEHICLE_STATUSES = ['en_route', 'at_stop', 'idle', 'maintenance', 'offline'];
const HEALTH_STATUSES = ['ok', 'watch', 'service_needed'];
const DELAY_STATUSES = ['on_time', 'at_risk', 'delayed', 'not_applicable'];
const ALERT_TYPES = ['delay', 'telemetry', 'health', 'operations'];
const EVENT_TYPES = [
  'status_change', 'delay_update', 'telemetry_lost', 'telemetry_restored',
  'alert_created', 'alert_acknowledged', 'alert_resolved',
];
const MOVING = new Set(['en_route', 'at_stop']);
const pad = (value) => String(value).padStart(3, '0');
const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
const iso = (ms) => new Date(ms).toISOString();
const fail = (message) => { throw new Error(`Invalid synthetic fleet: ${message}`); };
const requireThat = (condition, message) => { if (!condition) fail(message); };

function uuid(entity, code) {
  const hash = createHash('sha1')
    .update(NAMESPACE).update(`${entity}:${code}`, 'utf8').digest().subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseAsOf(value) {
  requireThat(typeof value === 'string', 'asOf must be an ISO timestamp string');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  requireThat(Boolean(match), 'asOf must be a complete ISO timestamp with a timezone');
  const [, year, month, day, hour, minute, second, , zone] = match;
  const date = `${year}-${month}-${day}`;
  const calendarMs = Date.parse(`${date}T00:00:00.000Z`);
  requireThat(Number.isFinite(calendarMs) && iso(calendarMs).slice(0, 10) === date,
    'asOf has an invalid calendar date');
  requireThat(+hour < 24 && +minute < 60 && +second < 60,
    'asOf has an invalid time');
  requireThat(zone === 'Z' || (+zone.slice(1, 3) < 24 && +zone.slice(4, 6) < 60),
    'asOf has an invalid timezone');
  const ms = Date.parse(value);
  // Keep the entire thirty-day history and future ETAs in four-digit ISO years.
  requireThat(Number.isFinite(ms) && ms >= Date.parse('0000-02-01T00:00:00.000Z')
    && ms <= Date.parse('9999-12-30T00:00:00.000Z'), 'asOf is outside the supported ISO range');
  return ms;
}

function randomSource(seed) {
  requireThat(Number.isSafeInteger(seed), 'seed must be a safe integer');
  const bytes = createHash('sha256').update(String(seed)).digest();
  let state = bytes.readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function completedDates(asOfMs) {
  const midnight = Date.parse(`${iso(asOfMs).slice(0, 10)}T00:00:00.000Z`);
  return Array.from({ length: 30 }, (_, index) => iso(midnight - (30 - index) * DAY).slice(0, 10));
}

export function generateFleet({ asOf = DEFAULT_AS_OF, seed = DEFAULT_SEED } = {}) {
  const now = parseAsOf(asOf);
  const random = randomSource(seed);
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const operational = Object.fromEntries([
    'Region', 'TeamMember', 'Crew', 'Vehicle', 'Assignment', 'Alert',
    'FleetEvent', 'TelemetryPing', 'OperatorNote', 'SimClock',
  ].map((name) => [name, []]));
  const history = { fleet_daily_kpi: [], vehicle_daily: [] };
  const add = (table, code, fields) => {
    const row = { id: uuid(table, code), ...fields, isSynthetic: true };
    operational[table].push(row);
    return row;
  };
  const regionalVehicles = new Map();
  const regionalOperators = new Map();

  for (const spec of REGIONS) {
    const region = add('Region', spec.code, {
      code: spec.code, name: `Synthetic ${spec.code} Region`,
      hubName: `Synthetic Hub ${spec.code}`, centerLat: spec.lat, centerLng: spec.lng, zoom: 10,
    });
    const member = add('TeamMember', `${spec.code}-operator`, {
      displayName: `Synthetic ${spec.code} Operator`, role: 'regional_operator', region_id: region.id,
    });
    regionalOperators.set(region.id, member);
  }
  for (let index = 0; index < 6; index++) {
    const spec = REGIONS[index];
    add('TeamMember', `${spec.code}-coordinator`, {
      displayName: `Synthetic ${spec.code} Coordinator`, role: 'fleet_coordinator',
      region_id: uuid('Region', spec.code),
    });
  }
  for (let index = 0; index < 40; index++) {
    const crewCode = `SYN-CREW-${pad(index + 1)}`;
    add('Crew', crewCode, { crewCode, leadFirstName: `Lead${pad(index + 1)}` });
  }

  let ordinal = 0;
  for (const spec of REGIONS) {
    const regionId = uuid('Region', spec.code);
    const movingCount = spec.count - spec.offline - spec.maintenance - spec.idle;
    const enRouteCount = movingCount - spec.atStop;
    const vehicles = [];
    for (let local = 0; local < spec.count; local++, ordinal++) {
      const vehicleCode = `SYN-${pad(ordinal + 1)}`;
      const status = local < enRouteCount ? 'en_route'
        : local < movingCount ? 'at_stop'
          : local < movingCount + spec.idle ? 'idle'
            : local < movingCount + spec.idle + spec.maintenance ? 'maintenance' : 'offline';
      const delayStatus = !MOVING.has(status) ? 'not_applicable'
        : local < spec.delayed ? 'delayed'
          : local < spec.delayed + spec.atRisk ? 'at_risk' : 'on_time';
      const delayMinutes = delayStatus === 'delayed' ? (spec.code === 'HOU' ? 38 : 24)
        : delayStatus === 'at_risk' ? integer(5, 14) : 0;
      const minutesSinceReport = status === 'offline' ? integer(20, 45) : integer(0, 10);
      const healthIndex = (ordinal * 37) % 120;
      const lat = round(spec.lat + 0.005 + random() * 0.045);
      const lngDirection = spec.code === 'CRP' ? -1 : 1;
      const lng = round(spec.lng + lngDirection * (0.005 + random() * 0.045));
      const speedMph = status === 'en_route' ? integer(30, 65) : 0;
      const vehicle = add('Vehicle', vehicleCode, {
        vehicleCode, callSign: `Unit ${pad(ordinal + 1)}`, type: 'service_truck',
        region_id: regionId, crew_id: operational.Crew[Math.floor(ordinal / 3)].id,
        status, healthStatus: healthIndex < 96 ? 'ok' : healthIndex < 113 ? 'watch' : 'service_needed',
        lat, lng, headingDeg: integer(0, 359), speedMph,
        energyType: ordinal % 4 === 0 ? 'electric' : 'diesel', energyPct: integer(25, 99),
        lastTelemetryAt: iso(now - minutesSinceReport * MINUTE), minutesSinceReport,
        delayStatus, delayMinutes, unit: 1,
      });
      vehicles.push(vehicle);
      const schedule = now + integer(30, 150) * MINUTE;
      const routeCode = `SYN-ROUTE-${pad(ordinal + 1)}`;
      add('Assignment', routeCode, {
        routeCode, vehicle_id: vehicle.id, originRegion_id: regionId,
        destinationName: `Synthetic Stop ${spec.code}-${pad(local + 1)}`,
        destLat: round(spec.lat + 0.075), destLng: round(spec.lng + lngDirection * 0.075),
        scheduledArrival: iso(schedule), estimatedArrival: iso(schedule + delayMinutes * MINUTE),
        delayMinutes, status: 'active', isCurrent: true,
      });
      for (let sample = 0; sample < 24; sample++) {
        const earlier = 23 - sample;
        add('TelemetryPing', `${vehicleCode}-${pad(sample)}`, {
          vehicle_id: vehicle.id, ts: iso(now - (minutesSinceReport + earlier * 5) * MINUTE),
          lat: round(lat + earlier * 0.0004),
          lng: round(lng + lngDirection * earlier * 0.0004), speedMph,
        });
      }
    }
    regionalVehicles.set(regionId, vehicles);
  }
  for (let index = 0; index < 30; index++) {
    const vehicle = operational.Vehicle[index * 4];
    const spec = REGIONS.find((item) => uuid('Region', item.code) === vehicle.region_id);
    const schedule = now - (180 + index * 6) * MINUTE;
    const routeCode = `SYN-COMPLETED-${pad(index + 1)}`;
    add('Assignment', routeCode, {
      routeCode, vehicle_id: vehicle.id, originRegion_id: vehicle.region_id,
      destinationName: `Synthetic Stop ${spec.code}-H${pad(index + 1)}`,
      destLat: round(spec.lat + 0.06), destLng: round(spec.lng + (spec.code === 'CRP' ? -0.06 : 0.06)),
      scheduledArrival: iso(schedule), estimatedArrival: iso(schedule + 10 * MINUTE),
      delayMinutes: 10, status: 'completed', isCurrent: false,
    });
  }

  let alertIndex = 0;
  for (const spec of REGIONS) {
    const regionId = uuid('Region', spec.code);
    const vehicles = regionalVehicles.get(regionId);
    const targets = [
      ...vehicles.filter((vehicle) => vehicle.delayStatus === 'delayed'),
      ...vehicles.filter((vehicle) => vehicle.status === 'offline'),
      ...vehicles.filter((vehicle) => vehicle.status === 'maintenance'),
      ...vehicles.filter((vehicle) => vehicle.delayStatus === 'at_risk'),
      ...vehicles,
    ].filter((vehicle, index, list) => list.findIndex((other) => other.id === vehicle.id) === index)
      .slice(0, spec.affectedVehicles);
    for (let local = 0; local < spec.openAlerts; local++, alertIndex++) {
      const vehicle = targets[local % targets.length];
      const severity = (spec.code === 'HOU' && local < 3) || (spec.code === 'ELP' && local === 0)
        ? 'critical' : ['DFW', 'HOU'].includes(spec.code) ? 'warning' : 'info';
      const type = vehicle.status === 'offline' ? 'telemetry'
        : vehicle.delayStatus === 'delayed' ? 'delay'
          : vehicle.status === 'maintenance' ? 'health' : 'operations';
      add('Alert', `OPEN-${spec.code}-${pad(local + 1)}`, {
        vehicle_id: vehicle.id, region_id: regionId, type, severity, status: 'open',
        message: `Synthetic ${type} scenario for ${vehicle.vehicleCode}.`,
        createdAt: iso(now - (150 + alertIndex * 4) * MINUTE),
        createdBySub: 'synthetic-operator', assignedTo_id: regionalOperators.get(regionId).id,
        source: 'simulation',
      });
    }
  }
  for (let index = 0; index < 13; index++, alertIndex++) {
    const spec = REGIONS[index % REGIONS.length];
    const regionId = uuid('Region', spec.code);
    const vehicle = regionalVehicles.get(regionId)[index % spec.count];
    const created = now - (150 + alertIndex * 4) * MINUTE;
    add('Alert', `RESOLVED-${pad(index + 1)}`, {
      vehicle_id: vehicle.id, region_id: regionId, type: ALERT_TYPES[index % 4],
      severity: index % 2 === 0 ? 'warning' : 'info', status: 'resolved',
      message: `Synthetic scenario cleared for ${vehicle.vehicleCode}.`,
      createdAt: iso(created), createdBySub: 'synthetic-operator',
      assignedTo_id: regionalOperators.get(regionId).id, source: 'simulation',
      resolvedAt: iso(created + 70 * MINUTE),
    });
  }
  const addEvent = (vehicle, occurredAt, type, alert) => {
    add('FleetEvent', `EVENT-${pad(operational.FleetEvent.length + 1)}`, {
      occurredAt, type, vehicle_id: vehicle.id, region_id: vehicle.region_id,
      detail: `Synthetic ${type} for ${vehicle.vehicleCode}.`, actor: 'synthetic-simulator',
      ...(alert ? { alert_id: alert.id } : {}),
    });
  };
  const byVehicleId = new Map(operational.Vehicle.map((vehicle) => [vehicle.id, vehicle]));
  for (const alert of operational.Alert) {
    const vehicle = byVehicleId.get(alert.vehicle_id);
    addEvent(vehicle, alert.createdAt, 'alert_created', alert);
    if (alert.status === 'resolved') addEvent(vehicle, alert.resolvedAt, 'alert_resolved', alert);
  }
  for (let index = 0; index < 209; index++) {
    const vehicle = operational.Vehicle[index % 120];
    addEvent(vehicle, iso(now - (61 + index % 299) * MINUTE), EVENT_TYPES[index % 4]);
  }
  const houston = regionalVehicles.get(uuid('Region', 'HOU'));
  const elsewhere = operational.Vehicle.filter((vehicle) => vehicle.region_id !== uuid('Region', 'HOU'));
  for (let index = 0; index < 60; index++) {
    const vehicle = index < 40 ? houston[index % houston.length] : elsewhere[(index - 40) % elsewhere.length];
    addEvent(vehicle, iso(now - (1 + index % 59) * MINUTE), EVENT_TYPES[index % 4]);
  }
  for (let index = 0; index < 12; index++) {
    add('OperatorNote', `NOTE-${pad(index + 1)}`, {
      vehicle_id: operational.Vehicle[index * 10].id, authorSub: 'synthetic-operator',
      text: `Synthetic check-in for coded stop ${pad(index + 1)}; scenario data only.`,
      createdAt: iso(now - (20 + index * 7) * MINUTE),
    });
  }
  add('SimClock', 'singleton', { asOf: iso(now), scenarioName: SCENARIO, speed: 1 });

  for (const [dayIndex, date] of completedDates(now).entries()) {
    for (const spec of REGIONS) {
      const regionId = uuid('Region', spec.code);
      const vehicles = regionalVehicles.get(regionId);
      let totalDelay = 0;
      let delayedCount = 0;
      for (const [index, vehicle] of vehicles.entries()) {
        const status = VEHICLE_STATUSES[(index + dayIndex) % VEHICLE_STATUSES.length];
        const delay = MOVING.has(status) && random() < 0.3 ? integer(5, 50) : 0;
        totalDelay += delay;
        if (delay > 0) delayedCount++;
        history.vehicle_daily.push({
          id: uuid('vehicle_daily', `${date}:${vehicle.vehicleCode}`), date,
          vehicle_id: vehicle.id, vehicle_code: vehicle.vehicleCode,
          region_id: regionId, region_code: spec.code,
          distance_miles: MOVING.has(status) ? integer(40, 280) : 0,
          delay_minutes: delay, energy_pct: integer(20, 100), status, is_synthetic: true,
        });
      }
      history.fleet_daily_kpi.push({
        id: uuid('fleet_daily_kpi', `${date}:${spec.code}`), date,
        region_id: regionId, region_code: spec.code, vehicle_count: vehicles.length,
        delayed_count: delayedCount, open_alert_count: Math.max(0, spec.openAlerts + integer(-1, 1)),
        average_delay_minutes: totalDelay / vehicles.length, is_synthetic: true,
      });
    }
  }
  const dataset = { operational, history };
  validateFleet(dataset);
  return dataset;
}

const OPERATIONAL_SCHEMAS = {
  Region: {
    code: 'string', name: 'string', hubName: 'string', centerLat: 'number', centerLng: 'number', zoom: 'number',
  },
  TeamMember: { displayName: 'string', role: 'string', region_id: 'uuid' },
  Crew: { crewCode: 'string', leadFirstName: 'string' },
  Vehicle: {
    vehicleCode: 'string', callSign: 'string', type: ['service_truck'], region_id: 'uuid', crew_id: 'uuid',
    status: VEHICLE_STATUSES, healthStatus: HEALTH_STATUSES, lat: 'number', lng: 'number',
    headingDeg: 'number', speedMph: 'number', energyType: ['diesel', 'electric'], energyPct: 'number',
    lastTelemetryAt: 'timestamp', minutesSinceReport: 'number', delayStatus: DELAY_STATUSES,
    delayMinutes: 'number', unit: 'number',
  },
  Assignment: {
    routeCode: 'string', vehicle_id: 'uuid', originRegion_id: 'uuid', destinationName: 'string',
    destLat: 'number', destLng: 'number', scheduledArrival: 'timestamp', estimatedArrival: 'timestamp',
    delayMinutes: 'number', status: ['active', 'completed'], isCurrent: 'boolean',
  },
  Alert: {
    vehicle_id: 'uuid', region_id: 'uuid', type: ALERT_TYPES, severity: ['critical', 'warning', 'info'],
    status: ['open', 'acknowledged', 'resolved'], message: 'string', createdAt: 'timestamp',
    createdBySub: 'syntheticIdentity', assignedTo_id: 'uuid', source: ['simulation'],
  },
  FleetEvent: {
    occurredAt: 'timestamp', type: EVENT_TYPES, vehicle_id: 'uuid', region_id: 'uuid',
    detail: 'string', actor: 'syntheticIdentity',
  },
  TelemetryPing: { vehicle_id: 'uuid', ts: 'timestamp', lat: 'number', lng: 'number', speedMph: 'number' },
  OperatorNote: { vehicle_id: 'uuid', authorSub: 'syntheticIdentity', text: 'string', createdAt: 'timestamp' },
  SimClock: { asOf: 'timestamp', scenarioName: 'string', speed: 'number' },
};
const HISTORY_SCHEMAS = {
  fleet_daily_kpi: {
    date: 'date', region_id: 'uuid', region_code: 'string', vehicle_count: 'number',
    delayed_count: 'number', open_alert_count: 'number', average_delay_minutes: 'number',
  },
  vehicle_daily: {
    date: 'date', vehicle_id: 'uuid', vehicle_code: 'string', region_id: 'uuid', region_code: 'string',
    distance_miles: 'number', delay_minutes: 'number', energy_pct: 'number', status: VEHICLE_STATUSES,
  },
};
const OPTIONAL = {
  Alert: { assignedToSub: 'syntheticIdentity', resolvedAt: 'timestamp' },
  FleetEvent: { alert_id: 'uuid' },
};
const COUNTS = {
  Region: 8, TeamMember: 14, Crew: 40, Vehicle: 120, Assignment: 150, Alert: 38,
  FleetEvent: 320, TelemetryPing: 2880, OperatorNote: 12, SimClock: 1,
  fleet_daily_kpi: 240, vehicle_daily: 3600,
};
const FIXED_IDS = {
  TeamMember: new Set(REGIONS.flatMap((spec, index) => [
    uuid('TeamMember', `${spec.code}-operator`),
    ...(index < 6 ? [uuid('TeamMember', `${spec.code}-coordinator`)] : []),
  ])),
  Alert: new Set([
    ...REGIONS.flatMap((spec) => Array.from({ length: spec.openAlerts },
      (_, index) => uuid('Alert', `OPEN-${spec.code}-${pad(index + 1)}`))),
    ...Array.from({ length: 13 }, (_, index) => uuid('Alert', `RESOLVED-${pad(index + 1)}`)),
  ]),
  FleetEvent: new Set(Array.from({ length: 320 }, (_, index) => uuid('FleetEvent', `EVENT-${pad(index + 1)}`))),
  OperatorNote: new Set(Array.from({ length: 12 }, (_, index) => uuid('OperatorNote', `NOTE-${pad(index + 1)}`))),
  SimClock: new Set([uuid('SimClock', 'singleton')]),
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, names, context) => {
  requireThat(object(value), `${context} must be an object`);
  requireThat(Object.keys(value).length === names.length
    && names.every((name) => Object.hasOwn(value, name)), `${context} has unexpected or missing fields`);
};
const nonnegativeInteger = (value, context) => requireThat(Number.isSafeInteger(value) && value >= 0,
  `${context} must be a nonnegative safe integer`);
const range = (value, min, max, context) => requireThat(value >= min && value <= max,
  `${context} must be in [${min}, ${max}]`);
const tally = (rows, key) => {
  const counts = {};
  for (const row of rows) counts[row[key]] = (counts[row[key]] ?? 0) + 1;
  return counts;
};
const exactTally = (rows, key, expected, context) => {
  const actual = tally(rows, key);
  requireThat(Object.keys(actual).every((name) => Object.hasOwn(expected, name))
    && Object.entries(expected).every(([name, count]) => (actual[name] ?? 0) === count),
  `${context} distribution must be ${JSON.stringify(expected)}`);
};

function checkType(value, type, context) {
  if (Array.isArray(type)) {
    requireThat(type.includes(value), `${context} has an invalid enum value`);
  } else if (type === 'uuid') {
    requireThat(typeof value === 'string' && UUID.test(value), `${context} must be a UUIDv5`);
  } else if (type === 'timestamp') {
    const ms = typeof value === 'string' ? Date.parse(value) : NaN;
    requireThat(Number.isFinite(ms) && iso(ms) === value, `${context} must be a canonical ISO timestamp`);
  } else if (type === 'date') {
    requireThat(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
      && iso(Date.parse(`${value}T00:00:00.000Z`)).slice(0, 10) === value,
    `${context} must be a valid ISO calendar date`);
  } else if (type === 'syntheticIdentity') {
    requireThat(typeof value === 'string' && /^synthetic-[a-z0-9-]+$/.test(value),
      `${context} must be a synthetic identity`);
  } else {
    requireThat(typeof value === type && (type !== 'number' || Number.isFinite(value))
      && (type !== 'string' || value.trim().length > 0), `${context} must be a nonempty/finite ${type}`);
  }
}

export function validateFleet(dataset) {
  sameKeys(dataset, ['operational', 'history'], 'dataset');
  sameKeys(dataset.operational, Object.keys(OPERATIONAL_SCHEMAS), 'operational');
  sameKeys(dataset.history, Object.keys(HISTORY_SCHEMAS), 'history');
  const tables = { ...dataset.operational, ...dataset.history };
  const maps = {};
  const allIds = new Set();
  for (const [name, definition] of Object.entries({ ...OPERATIONAL_SCHEMAS, ...HISTORY_SCHEMAS })) {
    const rows = tables[name];
    requireThat(Array.isArray(rows) && rows.length === COUNTS[name], `${name} must have ${COUNTS[name]} rows`);
    const flag = Object.hasOwn(OPERATIONAL_SCHEMAS, name) ? 'isSynthetic' : 'is_synthetic';
    const schema = { id: 'uuid', ...definition, [flag]: 'boolean' };
    const optional = OPTIONAL[name] ?? {};
    maps[name] = new Map();
    for (const [index, row] of rows.entries()) {
      const context = `${name}[${index}]`;
      requireThat(object(row), `${context} must be an object`);
      requireThat(Object.keys(schema).every((key) => Object.hasOwn(row, key))
        && Object.keys(row).every((key) => Object.hasOwn(schema, key) || Object.hasOwn(optional, key)),
      `${context} has unexpected or missing fields`);
      for (const [key, value] of Object.entries(row)) checkType(value, schema[key] ?? optional[key], `${context}.${key}`);
      requireThat(row[flag] === true, `${context}.${flag} must be true`);
      requireThat(!allIds.has(row.id), `${context}.id is duplicated`);
      if (FIXED_IDS[name]) requireThat(FIXED_IDS[name].has(row.id), `${context} has an unstable id`);
      allIds.add(row.id);
      maps[name].set(row.id, row);
    }
  }
  const { Region, TeamMember, Crew, Vehicle, Assignment, Alert, FleetEvent, TelemetryPing, OperatorNote, SimClock } = tables;
  const now = parseAsOf(SimClock[0].asOf);
  requireThat(SimClock[0].scenarioName === SCENARIO && SimClock[0].speed === 1,
    'SimClock must name the fixed scenario at speed 1');
  const reference = (table, id, context) => {
    requireThat(maps[table].has(id), `${context} references a missing ${table}`);
    return maps[table].get(id);
  };
  const notFuture = (timestamp, context) => requireThat(Date.parse(timestamp) <= now, `${context} is after asOf`);
  const unique = (rows, field, context) => requireThat(new Set(rows.map((row) => row[field])).size === rows.length,
    `${context}.${field} must be unique`);
  unique(Region, 'code', 'Region');
  unique(TeamMember, 'displayName', 'TeamMember');
  unique(Crew, 'crewCode', 'Crew');
  unique(Vehicle, 'vehicleCode', 'Vehicle');
  unique(Vehicle, 'callSign', 'Vehicle');
  unique(Assignment, 'routeCode', 'Assignment');
  for (const spec of REGIONS) {
    const region = Region.find((row) => row.code === spec.code);
    requireThat(Boolean(region), `Region is missing ${spec.code}`);
    requireThat(region.centerLat === spec.lat && region.centerLng === spec.lng && region.zoom === 10,
      `Region ${spec.code} has an invalid center or zoom`);
    requireThat(region.id === uuid('Region', spec.code), `Region ${spec.code} has an unstable id`);
  }
  for (const member of TeamMember) reference('Region', member.region_id, 'TeamMember.region_id');
  for (const crew of Crew) requireThat(crew.id === uuid('Crew', crew.crewCode), 'Crew has an unstable id');
  const geography = (lat, lng, regionId, context) => {
    const region = reference('Region', regionId, context);
    range(lat, 25.8, 36.6, `${context}.lat`);
    range(lng, -106.65, -93.5, `${context}.lng`);
    requireThat(Math.abs(lat - region.centerLat) <= 0.25 && Math.abs(lng - region.centerLng) <= 0.25,
      `${context} must remain near its synthetic region center`);
    if (region.code === 'ELP') requireThat(lat >= region.centerLat && lng >= region.centerLng,
      `${context} must not jitter west or south of the El Paso center`);
  };
  exactTally(Vehicle, 'status', { en_route: 72, at_stop: 16, idle: 14, maintenance: 8, offline: 10 }, 'Vehicle.status');
  exactTally(Vehicle, 'healthStatus', { ok: 96, watch: 17, service_needed: 7 }, 'Vehicle.healthStatus');
  exactTally(Vehicle, 'delayStatus', { on_time: 58, at_risk: 14, delayed: 16, not_applicable: 32 }, 'Vehicle.delayStatus');
  for (const vehicle of Vehicle) {
    const region = reference('Region', vehicle.region_id, 'Vehicle.region_id');
    reference('Crew', vehicle.crew_id, 'Vehicle.crew_id');
    requireThat(vehicle.id === uuid('Vehicle', vehicle.vehicleCode), 'Vehicle has an unstable id');
    requireThat(vehicle.unit === 1, 'Vehicle.unit must be 1');
    geography(vehicle.lat, vehicle.lng, vehicle.region_id, 'Vehicle position');
    range(vehicle.headingDeg, 0, 359.999999, 'Vehicle.headingDeg');
    range(vehicle.speedMph, 0, 90, 'Vehicle.speedMph');
    range(vehicle.energyPct, 0, 100, 'Vehicle.energyPct');
    nonnegativeInteger(vehicle.delayMinutes, 'Vehicle.delayMinutes');
    nonnegativeInteger(vehicle.minutesSinceReport, 'Vehicle.minutesSinceReport');
    notFuture(vehicle.lastTelemetryAt, 'Vehicle.lastTelemetryAt');
    requireThat(now - Date.parse(vehicle.lastTelemetryAt) === vehicle.minutesSinceReport * MINUTE,
      'Vehicle.minutesSinceReport must match lastTelemetryAt');
    requireThat(vehicle.status === 'offline' ? vehicle.minutesSinceReport > 15 : vehicle.minutesSinceReport <= 15,
      'Vehicle offline freshness threshold must be >15 minutes, all others <=15');
    requireThat(MOVING.has(vehicle.status) === (vehicle.delayStatus !== 'not_applicable'),
      'Vehicle delays apply only to moving/at_stop vehicles');
    if (vehicle.delayStatus === 'not_applicable' || vehicle.delayStatus === 'on_time') {
      requireThat(vehicle.delayMinutes === 0, 'Vehicle on_time/not_applicable delay must be zero');
    } else {
      requireThat(vehicle.delayMinutes > 0, 'Vehicle at_risk/delayed delay must be positive');
    }
    if (vehicle.delayStatus === 'delayed') requireThat(vehicle.delayMinutes === (region.code === 'HOU' ? 38 : 24),
      'Vehicle delayed minutes must be 38 in HOU and 24 elsewhere');
    if (vehicle.status !== 'en_route') requireThat(vehicle.speedMph === 0, 'Stationary Vehicle speed must be zero');
  }

  const assignmentsByVehicle = new Map(Vehicle.map((row) => [row.id, []]));
  exactTally(Assignment, 'status', { active: 120, completed: 30 }, 'Assignment.status');
  for (const assignment of Assignment) {
    const vehicle = reference('Vehicle', assignment.vehicle_id, 'Assignment.vehicle_id');
    reference('Region', assignment.originRegion_id, 'Assignment.originRegion_id');
    requireThat(assignment.originRegion_id === vehicle.region_id, 'Assignment origin must match Vehicle region');
    requireThat(assignment.id === uuid('Assignment', assignment.routeCode), 'Assignment has an unstable id');
    geography(assignment.destLat, assignment.destLng, assignment.originRegion_id, 'Assignment destination');
    nonnegativeInteger(assignment.delayMinutes, 'Assignment.delayMinutes');
    requireThat(Date.parse(assignment.estimatedArrival) === Date.parse(assignment.scheduledArrival)
      + assignment.delayMinutes * MINUTE, 'Assignment ETA must equal schedule plus delay');
    requireThat(assignment.isCurrent === (assignment.status === 'active'), 'Assignment current/active flags disagree');
    if (assignment.isCurrent) {
      assignmentsByVehicle.get(vehicle.id).push(assignment);
      requireThat(assignment.delayMinutes === vehicle.delayMinutes, 'Current Assignment delay must match Vehicle');
    } else {
      requireThat(Date.parse(assignment.estimatedArrival) < now, 'Completed Assignment must arrive before asOf');
    }
  }
  for (const current of assignmentsByVehicle.values()) requireThat(current.length === 1,
    'Each Vehicle must have exactly one current Assignment');

  exactTally(Alert, 'status', { open: 25, resolved: 13 }, 'Alert.status');
  const openAlerts = Alert.filter((row) => row.status === 'open');
  exactTally(openAlerts, 'severity', { critical: 4, warning: 12, info: 9 }, 'Open Alert.severity');
  for (const alert of Alert) {
    const vehicle = reference('Vehicle', alert.vehicle_id, 'Alert.vehicle_id');
    reference('Region', alert.region_id, 'Alert.region_id');
    const member = reference('TeamMember', alert.assignedTo_id, 'Alert.assignedTo_id');
    requireThat(alert.region_id === vehicle.region_id && member.region_id === alert.region_id,
      'Alert region must match Vehicle and assigned TeamMember');
    notFuture(alert.createdAt, 'Alert.createdAt');
    if (alert.status === 'resolved') {
      requireThat(Object.hasOwn(alert, 'resolvedAt'), 'Resolved Alert must have resolvedAt');
      requireThat(Date.parse(alert.resolvedAt) >= Date.parse(alert.createdAt), 'Alert resolvedAt precedes createdAt');
      notFuture(alert.resolvedAt, 'Alert.resolvedAt');
    } else requireThat(!Object.hasOwn(alert, 'resolvedAt'), 'Unresolved Alert must omit resolvedAt');
  }
  requireThat(new Set(openAlerts.map((row) => row.vehicle_id)).size === 19,
    'Open Alerts must affect exactly 19 Vehicles');
  for (const spec of REGIONS) {
    const regionId = uuid('Region', spec.code);
    const vehicles = Vehicle.filter((row) => row.region_id === regionId);
    const alerts = openAlerts.filter((row) => row.region_id === regionId);
    requireThat(vehicles.length === spec.count, `${spec.code} Vehicle count must be ${spec.count}`);
    requireThat(vehicles.filter((row) => row.delayStatus === 'delayed').length === spec.delayed,
      `${spec.code} delayed Vehicle count must be ${spec.delayed}`);
    requireThat(vehicles.filter((row) => row.delayStatus === 'at_risk').length === spec.atRisk,
      `${spec.code} at-risk Vehicle count must be ${spec.atRisk}`);
    requireThat(vehicles.filter((row) => row.status === 'offline').length === spec.offline,
      `${spec.code} offline Vehicle count must be ${spec.offline}`);
    requireThat(vehicles.filter((row) => row.status === 'maintenance').length === spec.maintenance,
      `${spec.code} maintenance Vehicle count must be ${spec.maintenance}`);
    requireThat(alerts.length === spec.openAlerts, `${spec.code} open Alert count must be ${spec.openAlerts}`);
    requireThat(new Set(alerts.map((row) => row.vehicle_id)).size === spec.affectedVehicles,
      `${spec.code} affected Vehicle count must be ${spec.affectedVehicles}`);
    const critical = spec.code === 'HOU' ? 3 : spec.code === 'ELP' ? 1 : 0;
    requireThat(alerts.filter((row) => row.severity === 'critical').length === critical,
      `${spec.code} critical Alert count must be ${critical}`);
  }

  const alertEvents = new Map(Alert.map((row) => [row.id, []]));
  for (const event of FleetEvent) {
    const vehicle = reference('Vehicle', event.vehicle_id, 'FleetEvent.vehicle_id');
    reference('Region', event.region_id, 'FleetEvent.region_id');
    requireThat(event.region_id === vehicle.region_id, 'FleetEvent region must match Vehicle');
    const occurred = Date.parse(event.occurredAt);
    requireThat(occurred >= now - 360 * MINUTE && occurred <= now, 'FleetEvent must be in the six-hour window');
    if (event.type.startsWith('alert_')) requireThat(Object.hasOwn(event, 'alert_id'),
      'Alert FleetEvent must reference an Alert');
    if (Object.hasOwn(event, 'alert_id')) {
      const alert = reference('Alert', event.alert_id, 'FleetEvent.alert_id');
      requireThat(event.vehicle_id === alert.vehicle_id && event.region_id === alert.region_id,
        'FleetEvent must match referenced Alert Vehicle and region');
      requireThat(occurred >= Date.parse(alert.createdAt), 'FleetEvent precedes referenced Alert creation');
      if (event.type === 'alert_created') requireThat(event.occurredAt === alert.createdAt,
        'alert_created FleetEvent must match Alert.createdAt');
      if (event.type === 'alert_resolved') requireThat(alert.status === 'resolved'
        && event.occurredAt === alert.resolvedAt, 'alert_resolved FleetEvent must match Alert.resolvedAt');
      alertEvents.get(alert.id).push(event);
    }
  }
  for (const alert of Alert) {
    const events = alertEvents.get(alert.id);
    requireThat(events.filter((row) => row.type === 'alert_created').length === 1,
      'Each Alert must have one alert_created FleetEvent');
    requireThat(events.filter((row) => row.type === 'alert_resolved').length === (alert.status === 'resolved' ? 1 : 0),
      'Resolved Alerts must have exactly one alert_resolved FleetEvent');
  }
  const recent = FleetEvent.filter((row) => Date.parse(row.occurredAt) >= now - 60 * MINUTE);
  requireThat(recent.length === 60, 'Exactly 60 FleetEvents must occur in the last hour');
  requireThat(recent.filter((row) => row.region_id === uuid('Region', 'HOU')).length >= 36,
    'At least 36 last-hour FleetEvents must be in HOU');

  const pingsByVehicle = new Map(Vehicle.map((row) => [row.id, []]));
  for (const ping of TelemetryPing) {
    const vehicle = reference('Vehicle', ping.vehicle_id, 'TelemetryPing.vehicle_id');
    geography(ping.lat, ping.lng, vehicle.region_id, 'TelemetryPing position');
    range(ping.speedMph, 0, 90, 'TelemetryPing.speedMph');
    pingsByVehicle.get(vehicle.id).push(ping);
  }
  for (const vehicle of Vehicle) {
    const pings = pingsByVehicle.get(vehicle.id).sort((a, b) => a.ts.localeCompare(b.ts));
    requireThat(pings.length === 24, 'Each Vehicle must have exactly 24 TelemetryPings');
    for (const [index, ping] of pings.entries()) requireThat(
      ping.id === uuid('TelemetryPing', `${vehicle.vehicleCode}-${pad(index)}`), 'TelemetryPing has an unstable id');
    for (let index = 1; index < pings.length; index++) requireThat(
      Date.parse(pings[index].ts) - Date.parse(pings[index - 1].ts) === 5 * MINUTE,
      'TelemetryPing samples must be spaced five minutes apart');
    const last = pings.at(-1);
    requireThat(last.ts === vehicle.lastTelemetryAt, 'Last TelemetryPing must equal Vehicle.lastTelemetryAt');
    requireThat(last.lat === vehicle.lat && last.lng === vehicle.lng && last.speedMph === vehicle.speedMph,
      'Last TelemetryPing position/speed must equal current Vehicle');
  }
  for (const note of OperatorNote) {
    reference('Vehicle', note.vehicle_id, 'OperatorNote.vehicle_id');
    notFuture(note.createdAt, 'OperatorNote.createdAt');
  }

  const dates = new Set(completedDates(now));
  const dailyVehicles = new Map();
  const seenVehicleDays = new Set();
  for (const row of tables.vehicle_daily) {
    const vehicle = reference('Vehicle', row.vehicle_id, 'vehicle_daily.vehicle_id');
    const region = reference('Region', row.region_id, 'vehicle_daily.region_id');
    requireThat(row.vehicle_code === vehicle.vehicleCode && row.region_id === vehicle.region_id
      && row.region_code === region.code, 'vehicle_daily codes and regions must match Vehicle/Region');
    requireThat(dates.has(row.date), 'vehicle_daily date must be a completed day in the thirty-day window');
    requireThat(row.id === uuid('vehicle_daily', `${row.date}:${row.vehicle_code}`), 'vehicle_daily has an unstable id');
    const key = `${row.date}:${row.vehicle_id}`;
    requireThat(!seenVehicleDays.has(key), 'vehicle_daily has a duplicate Vehicle/date');
    seenVehicleDays.add(key);
    nonnegativeInteger(row.delay_minutes, 'vehicle_daily.delay_minutes');
    requireThat(row.distance_miles >= 0, 'vehicle_daily.distance_miles must be nonnegative');
    range(row.energy_pct, 0, 100, 'vehicle_daily.energy_pct');
    if (!MOVING.has(row.status)) requireThat(row.delay_minutes === 0 && row.distance_miles === 0,
      'Inactive vehicle_daily rows must have zero distance and delay');
    const group = `${row.date}:${row.region_id}`;
    if (!dailyVehicles.has(group)) dailyVehicles.set(group, []);
    dailyVehicles.get(group).push(row);
  }
  requireThat(seenVehicleDays.size === dates.size * Vehicle.length, 'vehicle_daily must cover every Vehicle/day');
  const seenKpiDays = new Set();
  for (const row of tables.fleet_daily_kpi) {
    const region = reference('Region', row.region_id, 'fleet_daily_kpi.region_id');
    requireThat(row.region_code === region.code, 'fleet_daily_kpi region_code must match Region');
    requireThat(dates.has(row.date), 'fleet_daily_kpi date must be a completed day in the thirty-day window');
    requireThat(row.id === uuid('fleet_daily_kpi', `${row.date}:${row.region_code}`), 'fleet_daily_kpi has an unstable id');
    const key = `${row.date}:${row.region_id}`;
    requireThat(!seenKpiDays.has(key), 'fleet_daily_kpi has a duplicate Region/date');
    seenKpiDays.add(key);
    for (const field of ['vehicle_count', 'delayed_count', 'open_alert_count']) nonnegativeInteger(row[field],
      `fleet_daily_kpi.${field}`);
    const rows = dailyVehicles.get(key) ?? [];
    const expectedCount = REGIONS.find((spec) => spec.code === region.code).count;
    requireThat(rows.length === expectedCount && row.vehicle_count === expectedCount,
      'fleet_daily_kpi vehicle_count must match regional vehicle_daily rows');
    requireThat(row.delayed_count === rows.filter((vehicle) => vehicle.delay_minutes > 0).length,
      'fleet_daily_kpi delayed_count must match vehicle_daily');
    // The average includes all regional vehicles, including zero-delay rows.
    const average = rows.reduce((sum, vehicle) => sum + vehicle.delay_minutes, 0) / rows.length;
    requireThat(Math.abs(row.average_delay_minutes - average) < 1e-9,
      'fleet_daily_kpi average_delay_minutes must match vehicle_daily mean');
  }
  requireThat(seenKpiDays.size === dates.size * Region.length, 'fleet_daily_kpi must cover every Region/day');
}
