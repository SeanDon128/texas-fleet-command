import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../fabric/phase2/ontology/', import.meta.url);
const request = JSON.parse(await readFile(new URL('create-request.json', root), 'utf8'));
const saved = JSON.parse(await readFile(new URL('get-definition.json', root), 'utf8'));
const verification = JSON.parse(await readFile(new URL('verification.json', root), 'utf8'));
const source = JSON.parse(await readFile(new URL('source-verification.json', root), 'utf8'));
const parts = saved.definition.parts;
const text = (part) => Buffer.from(part.payload, 'base64').toString('utf8');
const partAt = (path) => {
  const found = parts.find((part) => part.path === path);
  assert.ok(found, `Missing persisted ${path}`);
  return text(found);
};

test('created generation-2 item has every submitted definition part, not just an empty shell', () => {
  assert.equal(verification.item.type, 'Ontology');
  assert.equal(verification.item.displayName, 'Fleet_Operations');
  assert.equal(verification.item.properties.generation, 2);
  assert.equal(verification.item.workspaceId, '00000000-0000-4000-8000-000000000002');
  assert.equal(parts.length, 27);
  assert.equal(new Set(parts.map((part) => part.path)).size, parts.length);
  assert.deepEqual(parts.map((part) => part.path).sort(), request.definition.parts.map((part) => part.path).sort());
});

test('all seven entity keys and all 55 property bindings round-trip to the existing source tables', () => {
  let properties = 0;
  for (const part of request.definition.parts.filter((part) => part.path.startsWith('entities/'))) {
    const submitted = text(part);
    const persisted = partAt(part.path);
    assert.match(persisted, /\tkeyProperty: id(?:\r?\n)/);
    assert.match(persisted, /\tproperty id\r?\n\t\tdataType: string/);
    const backing = submitted.match(/\tbackingTable: (\w+)/)?.[1];
    assert.ok(backing);
    assert.ok(persisted.includes(`backingTable: ${backing}`));
    for (const match of submitted.matchAll(/valueColumn: (\w+\.\w+)/g)) {
      assert.ok(persisted.includes(`valueColumn: ${match[1]}`), match[1]);
      properties++;
    }
    const table = partAt(`tables/${backing}.tmdl`);
    assert.match(table, /\t\tmode: directLake/);
    assert.ok(table.includes(`entityName: ${backing}`));
    assert.match(table, /schemaName: dbo/);
    assert.match(table, /expressionSource: DatabaseQuery/);
  }
  assert.equal(properties, 55);
  const expression = partAt('expressions.tmdl');
  assert.ok(expression.includes(source.server));
  assert.ok(expression.includes(source.database));
});

test('all seven actual foreign-key relationships and six descriptive business rules persist', () => {
  for (const path of ['relationships.tmdl', 'entityRelationships.tmdl']) {
    const submitted = text(request.definition.parts.find((part) => part.path === path));
    const persisted = partAt(path);
    for (const line of submitted.split(/\r?\n/).filter((line) => /^(?:relationship |entityRelationship |\t(?:fromColumn|toColumn|fromEntity|toEntity):|\t\trelationship:)/.test(line))) {
      assert.ok(persisted.includes(line), `Missing ${line} in ${path}`);
    }
  }
  assert.equal(verification.relationships.length, 7);
  for (const name of verification.rules) {
    const persisted = partAt(`rules/${name}.tmdl`);
    assert.ok(persisted.includes(`rule ${name}`));
    assert.match(persisted, /\tstatement: /);
  }
  assert.equal(verification.rules.length, 6);
});

test('source integrity and privacy checks are explicit and do not claim ontology query execution', () => {
  for (const part of parts.filter((part) => /^(?:tables|entities)\//.test(part.path))) {
    assert.doesNotMatch(text(part), /\b(?:column|property) (?:\S*Sub|email|actor|lat|lng|speedMph|speed|centerLat|centerLng|destLat|destLng)\s*\r?\n/i);
  }
  assert.ok(source.keyChecks.every((row) => Number(row.duplicateKeys) === 0 && Number(row.nullKeys) === 0));
  assert.ok(source.relationshipChecks.every((row) => Number(row.orphans) === 0));
  assert.equal(verification.definitionPersisted, true);
  assert.equal(verification.bindingDefinitionsPersisted, true);
  assert.equal(verification.ontologyDataQueryVerified, false);
  assert.equal(verification.graphMaterializationRequested, false);
  assert.equal(verification.graphDataLoadVerified, false);
  assert.deepEqual(verification.associatedResources.map((item) => item.type).sort(),
    ['Eventhouse', 'GraphModel', 'KQLDatabase']);
});
