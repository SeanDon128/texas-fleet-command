import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { findCustomerReferences } from '../tools/check-branding.mjs';

test('source, documentation and decoded Fabric definitions contain no customer-name references', async () => {
  assert.deepEqual(await findCustomerReferences(), []);
});

test('the Data Agent states that Zava Security is fictional and that the data is synthetic', async () => {
  const { instructions } = JSON.parse(await readFile(new URL('../config/fleet-agent.json', import.meta.url), 'utf8'));
  assert.match(instructions, /Zava Security is a fictional company/);
  assert.match(instructions, /entirely synthetic/);
});
