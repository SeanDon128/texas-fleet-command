import { readFile, writeFile } from 'node:fs/promises';
import { assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from '../fabric.mjs';

// One-time, surgical rebrand of the already-published Data Agent. It edits the exact
// server-roundtripped definition (so folder names, few-shots and platform metadata stay
// untouched) and changes only the two sentences that named a real company.
const apply = process.argv.includes('--apply');
const config = JSON.parse(await readFile(new URL('../../config/fleet-agent.json', import.meta.url), 'utf8'));
const desiredInstructions = [config.instructions, ...(config.answerRules ?? [])].join('\n');
const desiredDescription = 'Read-only synthetic Zava Security Texas fleet operations: active alerts versus affected vehicles, regional delays, stale telemetry, status, attention reasons and scenario-relative recent changes. Entirely fictional demo data.';
const staleInstruction = /Never imply these are actual \S+ vehicles, employees, customers, security information or operating practices\./;
const replacement = 'Zava Security is a fictional company and none of this data represents any real company: never imply these are actual vehicles, employees, customers, security information or operating practices.';
const staleDescription = /Read-only synthetic Texas fleet operations:(.*?)Not real \S+ data\./s;

await assertTarget();
const agent = (await fabricRequest(inWorkspace(`dataAgents/${target.dataAgentId}`))).value;
if (agent.id !== target.dataAgentId || agent.displayName !== target.dataAgentName) throw new Error('Not the approved Data Agent.');
const receipt = await fabricRequest(inWorkspace(`dataAgents/${target.dataAgentId}/getDefinition`), { method: 'POST' });
let current = receipt.value;
if (receipt.status === 202) {
  const done = await waitForOperation(receipt, 'Read Data Agent definition');
  current = (await fabricRequest(`operations/${done.operationId}/result`)).value;
}

const changes = [];
const parts = current.definition.parts.map((part) => {
  if (!part.path.endsWith('.json') || part.path === '.platform') return part;
  const original = JSON.parse(Buffer.from(part.payload, 'base64').toString('utf8'));
  let touched = false;
  const walk = (value, key) => {
    if (typeof value === 'string' && (key === 'aiInstructions' || key === 'dataSourceInstructions') && staleInstruction.test(value)) {
      touched = true;
      return value.replace(staleInstruction, replacement);
    }
    if (typeof value === 'string' && key === 'description' && staleDescription.test(value)) { touched = true; return desiredDescription; }
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
    return value;
  };
  const updated = walk(original, '');
  if (!touched) return part;
  changes.push({ path: part.path, matchesLocalConfig: JSON.stringify(updated).includes(desiredInstructions.slice(0, 200)) });
  return { ...part, payload: Buffer.from(JSON.stringify(updated)).toString('base64') };
});

const driftFromLocal = parts.filter((part) => part.path.endsWith('stage_config.json')).map((part) => {
  const text = JSON.parse(Buffer.from(part.payload, 'base64').toString('utf8')).aiInstructions;
  return { path: part.path, identicalToConfig: text === desiredInstructions };
});
console.log(JSON.stringify({ apply, partsChanged: changes, instructionsIdenticalToLocalConfig: driftFromLocal }, null, 1));
if (!changes.length) { console.log('Nothing to change.'); process.exit(0); }
if (!apply) { console.log('Dry run only. Re-run with --apply to update the draft and published stages.'); process.exit(0); }
const update = await fabricRequest(inWorkspace(`dataAgents/${target.dataAgentId}/updateDefinition`), { method: 'POST', body: { definition: { parts } } });
await waitForOperation(update, 'Rebrand Data Agent text');
await writeFile(new URL('../../fabric/phase2/agent-rebrand-receipt.json', import.meta.url), `${JSON.stringify({
  appliedAt: new Date().toISOString(), agent: agent.displayName, changedParts: changes.map((item) => item.path),
  note: 'Only instruction/description sentences changed; draft and published stages updated together; rollback copy kept outside the repository.',
}, null, 2)}\n`);
console.log('Applied. Re-read the definition and re-run golden-question verification before relying on it.');
