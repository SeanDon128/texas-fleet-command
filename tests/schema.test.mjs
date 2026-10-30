import assert from 'node:assert/strict';
import test from 'node:test';
import { getEntityMetadata } from '@microsoft/rayfin-core';
import { schema } from '../packages/data/dist/index.js';
import { generateFleet } from '../tools/synthetic.mjs';
import { dbValue, qualified, sqlType } from '../tools/sql.mjs';

test('all generated fields and 13 relationships are registered, bounded and authenticated', () => {
  const operational = generateFleet().operational;
  assert.equal(schema.length, 10);
  let relationships = 0;
  for (const Entity of schema) {
    const meta = getEntityMetadata(Entity);
    const scalars = Object.entries(meta.fields).filter(([, field]) => !field.relationship);
    assert.ok(operational[meta.name], `${meta.name}: unknown entity.`);
    for (const row of operational[meta.name]) {
      for (const key of Object.keys(row)) assert.ok(meta.fields[key], `${meta.name}.${key}: missing decorator.`);
      for (const [key, field] of scalars) {
        if (!field.isOptional && field.default === undefined) assert.notEqual(row[key], undefined, `${meta.name}.${key}: seed omitted required field.`);
        if (field.enum) assert.ok(field.enum.includes(row[key]), `${meta.name}.${key}: seed outside enum.`);
        if (field.format === 'text' && !field.enum) assert.ok(field.max > 0, `${meta.name}.${key}: unbounded MSSQL text.`);
        if (typeof row[key] === 'string' && field.max) assert.ok(row[key].length <= field.max, `${meta.name}.${key}: text exceeds SQL limit.`);
      }
    }
    assert.ok(meta.roles?.length, `${meta.name}: missing explicit authorization.`);
    assert.ok(meta.roles.every((role) => role.role === 'authenticated'), `${meta.name}: anonymous role must not exist.`);
    for (const [key, field] of Object.entries(meta.fields)) {
      if (field.relationship) {
        relationships++;
        const foreignKey = meta.fields[`${key}_id`];
        assert.equal(foreignKey?.format, 'uuid');
        assert.equal(Boolean(foreignKey.isOptional), Boolean(field.isOptional));
      }
      if (/^(lat|lng|centerLat|centerLng|destLat|destLng)$/.test(key)) {
        assert.equal(field.precision, 9);
        assert.equal(field.scale, 6);
      }
    }
  }
  assert.equal(relationships, 13);
});

test('reference and telemetry records are read-only and notes retain owner-write policy', () => {
  for (const Entity of schema.filter((item) => !['Alert', 'FleetEvent', 'OperatorNote'].includes(item.name))) {
    assert.deepEqual(getEntityMetadata(Entity).roles.map((role) => role.actions), [['read']]);
  }
  const note = getEntityMetadata(schema.find((item) => item.name === 'OperatorNote'));
  assert.ok(note.roles.find((role) => role.actions.includes('update'))?.policy?.check);
});

test('alert creation checks caller subject and update cannot rewrite its immutable assignment/message', () => {
  const alert = getEntityMetadata(schema.find((item) => item.name === 'Alert'));
  const create = alert.roles.find((role) => role.actions.includes('create'));
  const update = alert.roles.find((role) => role.actions.includes('update'));
  assert.ok(create.policy?.check);
  assert.deepEqual(update.includedFields, ['status', 'acknowledgedAt', 'acknowledgedBySub', 'resolvedAt', 'resolvedBySub']);
  for (const name of ['acknowledgedAt', 'acknowledgedBySub', 'resolvedBySub']) {
    assert.ok(alert.fields[name].isOptional);
  }
});

test('SQL conversion refuses unsupported types, null required fields and invalid dates', () => {
  assert.throws(() => sqlType({ type: 'unsupported', name: 'id' }), /Unsupported/);
  assert.throws(() => dbValue(undefined, { nullable: 'NO', name: 'required' }), /Missing required/);
  assert.throws(() => dbValue('not-a-date', { type: 'datetime2', name: 'asOf' }), /Invalid datetime/);
  assert.equal(dbValue(undefined, { nullable: 'YES' }), null);
  assert.equal(dbValue('2026-10-27T15:00:00Z', { type: 'datetime2' }).toISOString(), '2026-10-27T15:00:00.000Z');
  assert.equal(qualified({ schema: 'dbo', name: 'a]b' }), '[dbo].[a]]b]');
});
