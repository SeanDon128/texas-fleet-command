import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFleet, validateFleet } from './synthetic.mjs';

const options = {};
let rebaseNow = false;
const seen = new Set();
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (!['--as-of', '--seed', '--rebase-now'].includes(flag)) throw new Error(`Unknown argument: ${flag}`);
  if (seen.has(flag)) throw new Error(`Duplicate argument: ${flag}`);
  seen.add(flag);
  if (flag === '--rebase-now') {
    rebaseNow = true;
    continue;
  }
  const value = args[++index];
  if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  if (flag === '--as-of') options.asOf = value;
  else {
    if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error('--seed must be a safe integer');
    }
    options.seed = Number(value);
  }
}
if (rebaseNow && seen.has('--as-of')) throw new Error('--rebase-now conflicts with --as-of');
if (rebaseNow) options.asOf = new Date().toISOString();

const dataset = generateFleet(options);
validateFleet(dataset);
const { operational, history } = dataset;
const countBy = (rows, field) => Object.fromEntries(
  [...new Set(rows.map((row) => row[field]))].sort().map((value) => [
    value, rows.filter((row) => row[field] === value).length,
  ]),
);
const now = Date.parse(operational.SimClock[0].asOf);
const recentEvents = operational.FleetEvent.filter((row) => Date.parse(row.occurredAt) >= now - 3_600_000);
const openAlerts = operational.Alert.filter((row) => row.status === 'open');
const truth = {
  asOf: operational.SimClock[0].asOf, seed: options.seed ?? 20261027,
  scenarioName: operational.SimClock[0].scenarioName, isSynthetic: true,
  counts: Object.fromEntries(Object.entries({ ...operational, ...history }).map(([name, rows]) => [name, rows.length])),
  vehicleStatus: countBy(operational.Vehicle, 'status'),
  healthStatus: countBy(operational.Vehicle, 'healthStatus'),
  delayStatus: countBy(operational.Vehicle, 'delayStatus'),
  alertStatus: countBy(operational.Alert, 'status'),
  openAlertSeverity: countBy(openAlerts, 'severity'),
  affectedVehicles: new Set(openAlerts.map((row) => row.vehicle_id)).size,
  lastHourEventCount: recentEvents.length,
  regions: operational.Region.map((region) => {
    const vehicles = operational.Vehicle.filter((row) => row.region_id === region.id);
    const alerts = openAlerts.filter((row) => row.region_id === region.id);
    const delayed = vehicles.filter((row) => row.delayStatus === 'delayed');
    return {
      code: region.code, region_id: region.id, count: vehicles.length, delayed: delayed.length,
      atRisk: vehicles.filter((row) => row.delayStatus === 'at_risk').length,
      offline: vehicles.filter((row) => row.status === 'offline').length,
      maintenance: vehicles.filter((row) => row.status === 'maintenance').length,
      openAlerts: alerts.length, affectedVehicles: new Set(alerts.map((row) => row.vehicle_id)).size,
      criticalOpenAlerts: alerts.filter((row) => row.severity === 'critical').length,
      averageDelayedMinutes: delayed.length ? delayed.reduce((sum, row) => sum + row.delayMinutes, 0) / delayed.length : 0,
      lastHourEventCount: recentEvents.filter((row) => row.region_id === region.id).length,
    };
  }),
  history: {
    firstDate: history.fleet_daily_kpi[0].date, lastDate: history.fleet_daily_kpi.at(-1).date,
    days: 30, dailyVehicleCount: 120,
    averageDelayDefinition: 'Sum of regional vehicle_daily.delay_minutes divided by vehicle_count, including zero-delay vehicles.',
  },
};
const csv = (rows) => {
  const columns = Object.keys(rows[0]);
  const cell = (value) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `${columns.join(',')}\r\n${rows.map((row) => columns.map((column) => cell(row[column])).join(',')).join('\r\n')}\r\n`;
};
const root = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = path.join(root, 'data', 'generated');
const outputs = {
  'fleet.json': `${JSON.stringify(dataset, null, 2)}\n`,
  'fleet_daily_kpi.csv': csv(history.fleet_daily_kpi),
  'vehicle_daily.csv': csv(history.vehicle_daily),
  'ground-truth.json': `${JSON.stringify(truth, null, 2)}\n`,
};
await mkdir(outputDirectory, { recursive: true });
await Promise.all(Object.entries(outputs).map(([name, text]) => writeFile(path.join(outputDirectory, name), text, 'utf8')));
console.log(`Validated synthetic fleet at ${truth.asOf} (seed ${truth.seed}).`);
for (const name of Object.keys(outputs)) console.log(path.join(outputDirectory, name));
