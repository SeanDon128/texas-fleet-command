import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { curateModel, measures } from './fleet-semantics.mjs';

const original = JSON.parse(await readFile(new URL('../../fabric/phase2/semantic-model/model.bim', import.meta.url), 'utf8'));

test('curates only the new model without changing its source or source definition', () => {
  const before = JSON.stringify(original);
  const result = curateModel(original);
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(result.model.expressions, original.model.expressions);
  assert.equal(result.model.tables.length, 7);
  assert.equal(result.model.relationships.filter((item) => item.isActive).length, 5);
  assert.equal(result.model.relationships.filter((item) => !item.isActive).length, 4);
  assert.equal(result.model.tables.reduce((sum, table) => sum + table.measures.length, 0), 17);
});

test('omits identity fields and never sums coordinates, levels or identifiers implicitly', () => {
  const result = curateModel(original);
  for (const table of result.model.tables) {
    for (const column of table.columns) {
      assert.doesNotMatch(column.sourceColumn, /Sub$|^actor$|^email$/i);
      assert.equal(column.summarizeBy, 'none');
      assert.ok(column.description);
      if (column.sourceColumn === 'id') assert.equal(column.isHidden, true);
    }
    assert.ok(table.description);
    assert.equal(table.partitions[0].mode, 'directLake');
  }
});

test('defines strict scenario freshness and current alert statuses, not wall-clock or capped totals', () => {
  const definitions = measures.map(([, name, expression]) => `${name}: ${expression}`).join('\n');
  assert.doesNotMatch(definitions, /NOW\(|TODAY\(|TOPN\(/i);
  assert.match(definitions, /"open", "acknowledged"/);
  assert.match(definitions, /Last Telemetry Time'\]|Last Telemetry Time\]/);
  assert.match(definitions, /< Cutoff/);
  assert.match(definitions, /ERROR\("Exactly one scenario/);
});

test('prevents column/measure name collisions and ambiguous active filter paths', () => {
  const result = curateModel(original);
  for (const table of result.model.tables) {
    const names = [...table.columns, ...table.measures].map((item) => item.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, `Name collision in ${table.name}`);
  }
  assert.ok(result.model.relationships.every((item) => item.crossFilteringBehavior === 'oneDirection'));
  assert.ok(result.model.relationships.filter((item) => item.isActive && item.fromTable !== 'Vehicles')
    .every((item) => item.toTable === 'Vehicles'));
  assert.equal(result.model.relationships.some((item) => item.fromTable === 'Scenario Clock' || item.toTable === 'Scenario Clock'), false);
});

test('saved server readback contains the complete intended public business surface', () => {
  const model = original.model;
  assert.equal(model.tables.reduce((sum, table) => sum + table.columns.length, 0), 61);
  assert.deepEqual(model.tables.flatMap((table) => table.measures ?? []).map((item) => item.name).sort(),
    measures.map(([, name]) => name).sort());
  assert.equal(model.relationships.filter((item) => item.isActive !== false).length, 5);
  assert.equal(model.relationships.filter((item) => item.isActive === false).length, 4);
  for (const table of model.tables) {
    assert.ok(table.description);
    for (const column of table.columns) {
      assert.doesNotMatch(column.sourceColumn, /Sub$|^actor$|^email$/i);
      assert.equal(column.summarizeBy, 'none');
      if (column.sourceColumn === 'id') assert.equal(column.isHidden, true);
    }
  }
});
