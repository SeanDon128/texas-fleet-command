import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { assertTarget, fabricRequest, inWorkspace, target } from '../fabric.mjs';
import { curateModel } from './fleet-semantics.mjs';

const registryUrl = new URL('../../config/phase2-semantic-model.json', import.meta.url);
const definitionDirectory = new URL('../../fabric/phase2/semantic-model/', import.meta.url);
const displayName = 'Texas Fleet Operations';
const sources = ['Regions', 'Vehicles', 'Alerts', 'Assignments', 'FleetEvents', 'TelemetryPings', 'SimClocks'];
const description = 'Zava Security (fictional) Texas fleet business measures over the existing entirely synthetic SQL data. Additive reference model; no real vehicles, people, operations or production guarantees.';

async function operationResult(receipt, label, hasResult = true) {
  if (receipt.status !== 202) return receipt.value;
  const id = receipt.headers.get('x-ms-operation-id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`${label}: accepted without operation ID; inspect before retrying.`);
  console.log(JSON.stringify({ operation: label, operationId: id }));
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    await sleep(Math.min(30, Math.max(1, Number(receipt.headers.get('retry-after') ?? 5))) * 1000);
    const { value: state } = await fabricRequest(`operations/${id}`);
    if (state.status === 'Succeeded') return hasResult ? (await fabricRequest(`operations/${id}/result`)).value : state;
    if (['Failed', 'Cancelled'].includes(state.status)) throw new Error(`${label}: ${JSON.stringify(state)}`);
    console.log(JSON.stringify({ operation: label, status: state.status }));
  }
  throw new Error(`${label}: timeout for ${id}; do not resubmit blindly.`);
}

async function registry() {
  const value = JSON.parse(await readFile(registryUrl, 'utf8'));
  if (value.workspaceId !== target.workspaceId || value.sourceDatabaseId !== target.sqlDatabaseId ||
      value.displayName !== displayName || !/^[0-9a-f-]{36}$/i.test(value.id) ||
      Object.entries(target).some(([key, id]) => key.endsWith('Id') && id === value.id)) {
    throw new Error('Phase 2 registry failed its isolated-resource guards.');
  }
  const { value: item } = await fabricRequest(inWorkspace(`semanticModels/${value.id}`));
  if (item.displayName !== displayName || item.workspaceId !== target.workspaceId) throw new Error('New model identity mismatch.');
  return value;
}

await assertTarget();
const action = process.argv[2] ?? 'preview';
if (action === 'preview' || action === 'create') {
  const { value: inventory } = await fabricRequest(inWorkspace('items'));
  if (inventory.continuationToken) throw new Error('Paged inventory must be reconciled before creation.');
  const matches = inventory.value.filter((item) => item.displayName === displayName);
  if (matches.length) throw new Error('A matching item already exists; use the recorded registry, never adopt or duplicate implicitly.');
  const body = {
    displayName, description,
    creationPayload: {
      oneLakeTables: sources.map((name) =>
        `https://onelake.dfs.fabric.microsoft.com/${target.workspaceId}/${target.sqlDatabaseId}/Tables/dbo/${name}`),
    },
  };
  console.log(JSON.stringify({ action, workspace: target.workspaceName, capacity: target.capacityName,
    source: target.appName, sourceItemId: target.sqlDatabaseId, displayName, tables: sources }, null, 2));
  if (action === 'create') {
    const created = await operationResult(await fabricRequest(inWorkspace('semanticModels'), { method: 'POST', body }), 'Create phase 2 semantic model');
    if (!created?.id || created.type !== 'SemanticModel' || created.workspaceId !== target.workspaceId ||
        created.displayName !== displayName) throw new Error('Creation response mismatch; inspect accepted operation before retrying.');
    await writeFile(registryUrl, `${JSON.stringify({
      id: created.id, displayName, workspaceId: target.workspaceId, sourceDatabaseId: target.sqlDatabaseId,
      sourceTables: sources, createdAt: new Date().toISOString(),
    }, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ created: created.id, displayName }));
  }
} else if (action === 'inspect' || action === 'inspect-tmsl') {
  const item = await registry();
  const suffix = action === 'inspect-tmsl' ? '?format=TMSL' : '';
  const result = await operationResult(await fabricRequest(inWorkspace(`semanticModels/${item.id}/getDefinition${suffix}`),
    { method: 'POST' }), 'Read phase 2 semantic model');
  if (!result?.definition?.parts?.length) throw new Error('No persisted model definition returned.');
  await mkdir(definitionDirectory, { recursive: true });
  for (const part of result.definition.parts) {
    if (!/^(model\.bim|definition\.pbism|definition\/[A-Za-z0-9 _./-]+\.tmdl|diagramLayout\.json|\.platform)$/.test(part.path) ||
        part.path.includes('..') || part.payloadType !== 'InlineBase64') {
      throw new Error(`Unexpected definition part ${part.path}; inspect before saving.`);
    }
    const url = new URL(part.path, definitionDirectory);
    await mkdir(new URL('./', url), { recursive: true });
    const decoded = Buffer.from(part.payload, 'base64');
    await writeFile(url, decoded);
    console.log(JSON.stringify({ path: part.path, bytes: decoded.length,
      sha256: createHash('sha256').update(decoded).digest('hex') }));
  }
  await writeFile(new URL('definition.json', definitionDirectory), `${JSON.stringify(result.definition, null, 2)}\n`);
} else if (action === 'curate' || action === 'apply') {
  const item = await registry();
  const original = JSON.parse(await readFile(new URL('model.bim', definitionDirectory), 'utf8'));
  const expectedSource = `https://onelake.dfs.fabric.microsoft.com/${target.workspaceId}/${target.sqlDatabaseId}`;
  if (original.model.expressions?.length !== 1 || !JSON.stringify(original.model.expressions).includes(expectedSource)) {
    throw new Error('Definition no longer references only the approved SQL Database OneLake source.');
  }
  const curated = curateModel(original);
  await writeFile(new URL('curated-model.bim', definitionDirectory), `${JSON.stringify(curated, null, 2)}\n`);
  const content = [
    ['model.bim', JSON.stringify(curated)],
    ['definition.pbism', await readFile(new URL('definition.pbism', definitionDirectory), 'utf8')],
  ];
  const definition = { parts: content.map(([path, text]) => ({
    path, payloadType: 'InlineBase64', payload: Buffer.from(text).toString('base64'),
  })) };
  await writeFile(new URL('curated-definition.json', definitionDirectory), `${JSON.stringify(definition, null, 2)}\n`);
  console.log(JSON.stringify({ action, modelId: item.id, tables: curated.model.tables.length,
    columns: curated.model.tables.reduce((sum, table) => sum + table.columns.length, 0),
    relationships: curated.model.relationships.length,
    measures: curated.model.tables.reduce((sum, table) => sum + table.measures.length, 0) }));
  if (action === 'apply') {
    await operationResult(await fabricRequest(inWorkspace(`semanticModels/${item.id}/updateDefinition`),
      { method: 'POST', body: { definition } }), 'Apply phase 2 business metadata', false);
    console.log(JSON.stringify({ applied: true, modelId: item.id }));
    const patched = await fabricRequest(inWorkspace(`semanticModels/${item.id}`), { method: 'PATCH', body: { description } });
    console.log(JSON.stringify({ itemDescriptionUpdated: patched.status }));
  }
} else {
  throw new Error('Supported actions: preview, create, inspect, inspect-tmsl, curate, apply.');
}
