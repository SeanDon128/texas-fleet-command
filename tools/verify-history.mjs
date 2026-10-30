import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { validateFleet } from './synthetic.mjs';
import { connectHistorySql, quote } from './sql.mjs';
import { readSeed } from './verify-sql.mjs';

const expected = await readSeed();
const pool = await connectHistorySql();
const history = {};
try {
  for (const [table, expectedRows] of Object.entries(expected.history)) {
    const deadline = Date.now() + 180_000;
    let rows;
    while (!rows) {
      try {
        rows = (await pool.request().query(`SELECT * FROM [dbo].${quote(table)}`)).recordset;
      } catch (error) {
        if (error.number !== 208 || Date.now() >= deadline) throw error;
        console.log(`${table}: waiting for completed Delta load to appear in the SQL analytics endpoint.`);
        await sleep(10_000);
      }
    }
    history[table] = rows.map((row) => Object.fromEntries(Object.entries(row).map(([field, value]) => [
      field, field === 'date' && value instanceof Date ? value.toISOString().slice(0, 10) :
        typeof value === 'string' && (field === 'id' || field.endsWith('_id')) ? value.toLowerCase() : value,
    ])));
    assert.equal(rows.length, expectedRows.length, `${table}: incorrect persisted row count.`);
    const byId = new Map(expectedRows.map((row) => [row.id, row]));
    for (const row of history[table]) {
      const expectedRow = byId.get(row.id);
      assert.ok(expectedRow, `${table}: unknown persisted row ${row.id}`);
      assert.deepEqual(Object.keys(row).sort(), Object.keys(expectedRow).sort(), `${table}: column shape mismatch.`);
      for (const [field, value] of Object.entries(expectedRow)) {
        if (typeof value === 'number') assert.ok(Math.abs(row[field] - value) < 1e-6, `${table}.${field}: value mismatch.`);
        else assert.equal(row[field], value, `${table}.${field}: value mismatch.`);
      }
    }
    console.log(`${table}: verified ${rows.length} persisted rows through the SQL analytics endpoint.`);
  }
  validateFleet({ operational: expected.operational, history });
  console.log('History persistence, complete 30-day coverage, cross-table relationships and daily KPI reconciliation verified.');
} finally {
  await pool.close();
}
