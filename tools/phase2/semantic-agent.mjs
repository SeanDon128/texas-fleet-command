import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { accessToken, assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from '../fabric.mjs';
import { askMcp } from '../../packages/functions/dist/mcp.js';

// E-AGENT-SEMANTIC: an ADDITIVE Data Agent grounded on the Texas Fleet Operations semantic
// model. It never touches the existing published agent; `ask existing` only reads it.
const configUrl = new URL('../../config/phase2-semantic-agent.json', import.meta.url);
const modelRegistryUrl = new URL('../../config/phase2-semantic-model.json', import.meta.url);
const modelBimUrl = new URL('../../fabric/phase2/semantic-model/model.bim', import.meta.url);
const outDir = new URL('../../fabric/phase2/semantic-agent/', import.meta.url);
const config = JSON.parse(await readFile(configUrl, 'utf8'));
const model = JSON.parse(await readFile(modelRegistryUrl, 'utf8'));
const [command = 'build', arg = 'new', tag = 'run-a', only] = process.argv.slice(2);
const schema = (name, version = '1.0.0') =>
  `https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/${name}/${version}/schema.json`;
const save = async (name, value) => {
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL(name, outDir), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const sourceName = 'semantic_model-TexasFleetOperations';

function guardTarget() {
  assert.equal(model.workspaceId, target.workspaceId, 'Model is not in the approved workspace.');
  assert.match(model.id, /^[0-9a-f-]{36}$/i);
}

async function buildParts() {
  const bim = JSON.parse(await readFile(modelBimUrl, 'utf8')).model;
  const dataType = { string: 'string', int64: 'int', double: 'double', dateTime: 'datetime', boolean: 'boolean' };
  const elements = bim.tables.map((table) => ({
    id: randomUUID(), is_selected: true, display_name: table.name, type: 'semantic_model.table', description: table.description,
    children: [
      ...table.columns.filter((column) => !column.isHidden).map((column) => ({
        id: randomUUID(), is_selected: true, display_name: column.name, type: 'semantic_model.column',
        data_type: dataType[column.dataType] ?? column.dataType, description: column.description,
      })),
      ...(table.measures ?? []).map((measure) => ({
        id: randomUUID(), is_selected: true, display_name: measure.name, type: 'semantic_model.measure',
        description: measure.description,
      })),
    ],
  }));
  const stage = { $schema: schema('stageConfiguration'), aiInstructions: config.instructions };
  const source = {
    $schema: schema('dataSource'), artifactId: model.id, workspaceId: model.workspaceId, displayName: 'Texas Fleet Operations',
    type: 'semantic_model', userDescription: config.sourceDescription, dataSourceInstructions: config.sourceInstructions, elements,
  };
  const parts = [];
  const add = (path, value) => parts.push({ path, payloadType: 'InlineBase64', payload: Buffer.from(JSON.stringify(value)).toString('base64') });
  add('Files/Config/data_agent.json', { $schema: schema('dataAgent', '2.1.0') });
  for (const stageName of ['draft', 'published']) {
    add(`Files/Config/${stageName}/stage_config.json`, stage);
    add(`Files/Config/${stageName}/${sourceName}/datasource.json`, source);
  }
  add('Files/Config/publish_info.json', { $schema: schema('publishInfo'), description: config.publishDescription });
  const counts = { tables: elements.length, columns: elements.reduce((n, t) => n + t.children.filter((c) => c.type.endsWith('column')).length, 0),
    measures: elements.reduce((n, t) => n + t.children.filter((c) => c.type.endsWith('measure')).length, 0) };
  return { parts, counts };
}

async function readDefinition(id) {
  const receipt = await fabricRequest(inWorkspace(`dataAgents/${id}/getDefinition`), { method: 'POST' });
  if (receipt.status !== 202) return receipt.value.definition;
  const done = await waitForOperation(receipt, 'Read agent definition');
  return (await fabricRequest(`operations/${done.operationId}/result`)).value.definition;
}

async function create() {
  await assertTarget(); guardTarget();
  if (config.agentId) throw new Error('A semantic agent is already registered; never create a duplicate.');
  const { parts, counts } = await buildParts();
  const existing = (await fabricRequest(inWorkspace('items?type=DataAgent'))).value.value;
  if (existing.some((item) => item.displayName === config.displayName)) throw new Error('An agent with this name exists; reconcile it instead of creating another.');
  await save('create-request.json', { displayName: config.displayName, description: config.description, counts });
  const receipt = await fabricRequest(inWorkspace('dataAgents'), { method: 'POST', body: { displayName: config.displayName, description: config.description, definition: { parts } } });
  await save('create-response.json', { status: receipt.status, operationId: receipt.headers.get('x-ms-operation-id'), at: new Date().toISOString(), value: receipt.value ?? null });
  let item = receipt.value;
  if (receipt.status === 202) {
    const done = await waitForOperation(receipt, 'Create semantic Data Agent');
    item = (await fabricRequest(`operations/${done.operationId}/result`)).value;
  }
  assert.ok(item?.id && item.type === 'DataAgent' && item.workspaceId === target.workspaceId, 'Unexpected creation result; inspect, do not retry.');
  assert.notEqual(item.id, target.dataAgentId, 'Refusing to adopt the existing agent.');
  config.agentId = item.id;
  await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
  await save('receipt.json', { createdAt: new Date().toISOString(), item, counts });
  console.log(JSON.stringify({ created: item.id, counts }));
  await verify();
}

async function verify() {
  await assertTarget(); guardTarget();
  const id = config.agentId; assert.ok(id, 'No registered agent.');
  const item = (await fabricRequest(inWorkspace(`dataAgents/${id}`))).value;
  assert.equal(item.displayName, config.displayName);
  const definition = await readDefinition(id);
  const text = (part) => Buffer.from(part.payload, 'base64').toString('utf8');
  const runB = command === 'verify' && tag === 'run-b';
  const expectedInstructions = runB ? config.instructionsRunB : config.instructions;
  const sources = definition.parts.filter((part) => part.path.endsWith('datasource.json')).map((part) => ({ path: part.path, json: JSON.parse(text(part)) }));
  const stages = definition.parts.filter((part) => part.path.endsWith('stage_config.json')).map((part) => ({ path: part.path, instructionsMatch: JSON.parse(text(part)).aiInstructions === expectedInstructions }));
  const summary = {
    verifiedAt: new Date().toISOString(), agentId: id, paths: definition.parts.map((part) => part.path),
    sources: sources.map(({ path, json }) => ({ path, type: json.type, artifactMatchesModel: json.artifactId === model.id,
      tables: json.elements?.length, columns: json.elements?.reduce((n, t) => n + (t.children ?? []).filter((c) => c.type?.endsWith('column')).length, 0),
      measures: json.elements?.reduce((n, t) => n + (t.children ?? []).filter((c) => c.type?.endsWith('measure')).length, 0) })),
    stages,
  };
  await save(runB ? 'verification-run-b.json' : 'verification.json', summary);
  console.log(JSON.stringify(summary, null, 1));
}

const endpointFor = (id) => `https://api.fabric.microsoft.com/v1/mcp/workspaces/${target.workspaceId}/dataagents/${id}/agent`;

async function ask() {
  await assertTarget(); guardTarget();
  const id = arg === 'existing' ? target.dataAgentId : config.agentId;
  assert.ok(id, 'No agent registered.');
  assert.ok(arg === 'existing' || id !== target.dataAgentId);
  const results = [];
  for (const question of config.questions.filter((item) => !only || only.split(',').includes(item.id))) {
    const started = Date.now();
    try {
      const answer = await askMcp({ endpoint: endpointFor(id), token: accessToken(), question: question.text });
      results.push({ id: question.id, question: question.text, askedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started, truncated: answer.truncated, answer: answer.answer });
    } catch (error) {
      results.push({ id: question.id, question: question.text, askedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started, error: String(error.code ?? error.message).slice(0, 200) });
    }
    console.log(`${question.id} ${results.at(-1).error ? 'ERROR ' + results.at(-1).error : 'ok'} ${results.at(-1).elapsedMs}ms`);
  }
  await save(`answers-${arg}-${tag}.json`, { agent: arg, agentId: id, tag, recordedAt: new Date().toISOString(), results });
}

async function dax(query) {
  const response = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${model.workspaceId}/datasets/${model.id}/executeQueries`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken('https://analysis.windows.net/powerbi/api')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries: [{ query }], serializerSettings: { includeNulls: true } }), signal: AbortSignal.timeout(90_000),
  });
  const body = await response.json();
  if (!response.ok || body.error || body.results?.[0]?.error || body.results?.[0]?.tables?.[0]?.error) throw new Error(`DAX failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body.results[0].tables[0].rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^.*\[|\]$/g, ''), value])));
}

async function truth() {
  await assertTarget(); guardTarget();
  const list = (column, measure) => `EVALUATE SELECTCOLUMNS(FILTER(SUMMARIZECOLUMNS('Vehicles'[Vehicle Code], "m", ${measure}), [m] > 0), "code", 'Vehicles'[Vehicle Code]) ORDER BY [code]`;
  const result = {
    measuredAt: new Date().toISOString(),
    Q1: (await dax('EVALUATE ROW("attention", [Vehicles Needing Attention], "total", [Total Vehicles], "rate", [Attention Rate])'))[0],
    Q2: await dax(`EVALUATE SELECTCOLUMNS(FILTER(SUMMARIZECOLUMNS('Regions'[Region Code], "n", [Total Vehicles], "a", [Vehicles Needing Attention], "r", [Attention Rate]), NOT ISBLANK('Regions'[Region Code])), "region", 'Regions'[Region Code], "vehicles", [n], "attention", [a], "rate", [r]) ORDER BY [attention] DESC`),
    Q3: { codes: (await dax(list('Vehicle Code', '[Critical Alerts]'))).map((row) => row.code), vehicles: (await dax('EVALUATE ROW("v", [Vehicles With Critical Alerts], "a", [Critical Alerts])'))[0] },
    Q4: (await dax('EVALUATE ROW("active", [Active Vehicles], "health", [Health Attention Vehicles], "delayed", [Delayed Vehicles], "alerts", [Active Alerts], "alertVehicles", [Vehicles With Active Alerts], "stale", [Vehicles Not Reporting], "outOfService", [Out Of Service Vehicles], "total", [Total Vehicles])'))[0],
    Q5: (await dax(list('Vehicle Code', '[Vehicles Not Reporting]'))).map((row) => row.code),
    Q6: (await dax(`EVALUATE CALCULATETABLE(ROW("delay", MAX('Vehicles'[Delay Minutes]), "alerts", [Active Alerts], "critical", [Critical Alerts], "stale", [Vehicles Not Reporting]), TREATAS({"SYN-027"}, 'Vehicles'[Vehicle Code]))`))[0],
    Q7: (await dax('EVALUATE ROW("health", [Health Attention Vehicles], "alertVehicles", [Vehicles With Active Alerts], "outOfService", [Out Of Service Vehicles], "delayed", [Delayed Vehicles], "stale", [Vehicles Not Reporting], "union", [Vehicles Needing Attention])'))[0],
    Q8: (await dax('EVALUATE ROW("events", [Events In Last Scenario Hour])'))[0],
  };
  await save('ground-truth.json', result);
  console.log(JSON.stringify(result));
}

async function evaluate() {
  const truthValues = JSON.parse(await readFile(new URL('ground-truth.json', outDir), 'utf8'));
  const answers = JSON.parse(await readFile(new URL(`answers-${arg}-${tag}.json`, outDir), 'utf8'));
  const has = (text, value) => new RegExp(`(?<![\\d.])${String(value).replace('.', '\\.')}(?![\\d])`).test(text);
  const codesIn = (text) => [...new Set(text.match(/SYN-\d{3}/g) ?? [])].sort();
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const top = truthValues.Q2[0];
  const checks = {
    Q1: (t) => [['attention', has(t, truthValues.Q1.attention)], ['total', has(t, truthValues.Q1.total)], ['share', /45(\.0)?\s*%/.test(t)]],
    Q2: (t) => [['region', /HOU|Houston/i.test(t)], ['count', has(t, top.attention)], ['rate', has(t, (top.rate * 100).toFixed(1))]],
    Q3: (t) => [['exact vehicle set', same(codesIn(t), truthValues.Q3.codes)]],
    Q4: (t) => ['active', 'health', 'delayed', 'alerts', 'alertVehicles'].map((k) => [k, has(t, truthValues.Q4[k])]),
    Q5: (t) => [['exact vehicle set', same(codesIn(t), truthValues.Q5)]],
    Q6: (t) => [['delay', has(t, truthValues.Q6.delay)], ['active alerts', has(t, truthValues.Q6.alerts)], ['not stale', /not stale|fresh|reporting normally|within/i.test(t)]],
    Q7: (t) => ['health', 'alertVehicles', 'outOfService', 'delayed', 'stale', 'union'].map((k) => [k, has(t, truthValues.Q7[k])]),
    Q8: (t) => [['event count', has(t, truthValues.Q8.events)]],
  };
  const rows = answers.results.map((r) => {
    if (r.error) return { id: r.id, status: 'ERROR', detail: r.error, seconds: (r.elapsedMs / 1000).toFixed(1) };
    const facts = checks[r.id](r.answer);
    const missing = facts.filter(([, ok]) => !ok).map(([name]) => name);
    return { id: r.id, status: missing.length ? 'FAIL' : 'PASS', missing, seconds: (r.elapsedMs / 1000).toFixed(1), codes: ['Q3', 'Q5'].includes(r.id) ? codesIn(r.answer).length : undefined };
  });
  await save(`evaluation-${arg}-${tag}.json`, { evaluatedAt: new Date().toISOString(), note: 'Programmatic key-fact check against fresh DAX; manual review of each answer is recorded separately.', rows });
  console.table(rows);
  console.log(`PASS ${rows.filter((r) => r.status === 'PASS').length}/8`);
}

async function updateInstructions() {
  await assertTarget(); guardTarget();
  const id = config.agentId; assert.ok(id && id !== target.dataAgentId, 'Only the new semantic agent may be updated.');
  const definition = await readDefinition(id);
  const instructions = tag === 'run-b' ? config.instructionsRunB : config.instructions;
  assert.ok(instructions, 'No instructions configured for this run.');
  const parts = definition.parts.map((part) => {
    if (!part.path.endsWith('stage_config.json')) return part;
    const json = JSON.parse(Buffer.from(part.payload, 'base64').toString('utf8'));
    return { ...part, payload: Buffer.from(JSON.stringify({ ...json, aiInstructions: instructions })).toString('base64') };
  });
  const receipt = await fabricRequest(inWorkspace(`dataAgents/${id}/updateDefinition`), { method: 'POST', body: { definition: { parts } } });
  await waitForOperation(receipt, 'Update semantic agent instructions');
  console.log(`Updated instructions (${tag}) on the new agent only.`);
}

const commands = { build: async () => { const { parts, counts } = await buildParts(); await save('create-request.json', { displayName: config.displayName, counts, parts: parts.map((p) => p.path) }); console.log(JSON.stringify({ parts: parts.length, counts })); },
  create, verify, ask, truth, evaluate, 'update-instructions': updateInstructions };
if (!commands[command]) throw new Error(`Expected one of: ${Object.keys(commands).join(', ')}`);
await commands[command]();
