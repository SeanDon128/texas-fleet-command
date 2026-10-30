import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateFleet } from './synthetic.mjs';
import { connectSql, entities, inspectLayout, qualified } from './sql.mjs';

export async function readSeed() {
  const dataset = JSON.parse(await readFile(new URL('../data/generated/fleet.json', import.meta.url), 'utf8'));
  validateFleet(dataset);
  return dataset;
}

export async function verifySql(pool, expected) {
  const layout = await inspectLayout(pool);
  const operational = {};
  const summary = {};
  for (const entity of entities) {
    const table = layout.get(entity);
    const { recordset } = await pool.request().query(`SELECT * FROM ${qualified(table)}`);
    operational[entity] = recordset.map((row) => Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== null).map(([field, value]) => {
        const column = table.columns.find((item) => item.name === field);
        return [field, value instanceof Date ? value.toISOString() :
          column.type === 'uniqueidentifier' ? value.toLowerCase() : value];
      }),
    ));
    const sorted = (rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(sorted(operational[entity]), sorted(expected.operational[entity]),
      `${entity}: persisted data differs from validated seed; no records were changed.`);
    summary[entity] = recordset.length;
  }
  validateFleet({ operational, history: expected.history });
  const { recordset: keys } = await pool.request().query(`
    SELECT name, is_disabled, is_not_trusted FROM sys.foreign_keys`);
  assert.equal(keys.length, 13, 'Expected all 13 code-first relationship constraints.');
  assert.ok(keys.every((key) => !key.is_disabled && !key.is_not_trusted), 'Foreign keys must be enabled and trusted.');
  for (const [entity, fields] of [['Region', ['centerLat', 'centerLng']], ['Vehicle', ['lat', 'lng']],
    ['Assignment', ['destLat', 'destLng']], ['TelemetryPing', ['lat', 'lng']]]) {
    for (const field of fields) {
      const column = layout.get(entity).columns.find((item) => item.name === field);
      assert.equal(column.scale, 6, `${entity}.${field} must preserve six decimal places.`);
    }
  }
  console.log(JSON.stringify({ persisted: true, counts: summary, foreignKeys: keys.length,
    openAlerts: operational.Alert.filter((row) => row.status === 'open').length,
    affectedVehicles: new Set(operational.Alert.filter((row) => row.status === 'open').map((row) => row.vehicle_id)).size }, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = await readSeed();
  const pool = await connectSql();
  try { await verifySql(pool, seed); }
  finally { await pool.close(); }
}
