import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from './fabric.mjs';
import { connectHistorySql, quote } from './sql.mjs';

const config = JSON.parse(await readFile(new URL('../config/fleet-agent.json', import.meta.url), 'utf8'));
const instructions = [config.instructions, ...(config.answerRules ?? [])].join('\n');
const apply = process.argv.includes('--apply');
const publish = process.argv.includes('--publish');
if (publish && !apply) throw new Error('--publish requires --apply.');
if (apply && !publish) throw new Error('Use --apply --publish explicitly; draft-only updates could remove an existing published stage.');
await assertTarget();
const { value: agent } = await fabricRequest(inWorkspace(`dataAgents/${target.dataAgentId}`));
if (agent.displayName !== target.dataAgentName || agent.workspaceId !== target.workspaceId) {
  throw new Error('Data Agent does not match the approved existing draft.');
}
const shortcutPath = inWorkspace(`items/${target.lakehouseId}/shortcuts`);
const { value: inventory } = await fabricRequest(shortcutPath);
if (inventory.continuationToken) throw new Error('Shortcut inventory is paged; inspect all pages before applying.');
for (const table of config.tables) {
  const desired = {
    name: table.name, path: 'Tables/dbo',
    target: { oneLake: { workspaceId: target.workspaceId, itemId: target.sqlDatabaseId, path: `Tables/dbo/${table.name}` } },
  };
  const normalizePath = (path) => path.replace(/^\/+|\/+$/g, '');
  const existing = inventory.value.find((row) => row.name === table.name && normalizePath(row.path) === desired.path);
  if (existing && (!existing.target.oneLake || ['workspaceId', 'itemId', 'path']
    .some((key) => existing.target.oneLake[key] !== desired.target.oneLake[key]))) {
    throw new Error(`Existing shortcut ${table.name} points elsewhere; refusing to overwrite.`);
  }
  console.log(`${existing ? 'Preserve' : apply ? 'Create' : 'Would create'} read-only source shortcut: dbo.${table.name}`);
  if (!existing && apply) await fabricRequest(shortcutPath, { method: 'POST', body: desired });
}
if (!apply) {
  console.log(`Would configure ${config.tables.length} operational tables and ${config.examples.length} SQL examples; publish=${publish}. No remote writes.`);
} else {
  const refreshed = await fabricRequest(inWorkspace(`sqlEndpoints/${target.historySqlEndpointId}/refreshMetadata`), {
    method: 'POST', body: { recreateTables: false, tables: [{ schema: 'dbo', tableNames: config.tables.map((table) => table.name) }] },
  });
  await waitForOperation(refreshed, 'Refresh shortcut SQL metadata');
  const pool = await connectHistorySql();
  try {
    const { recordset: columns } = await pool.request().query(
      'SELECT TABLE_NAME AS tableName,COLUMN_NAME AS name,DATA_TYPE AS dataType FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=\'dbo\'');
    for (const table of config.tables) {
      for (const name of table.columns) {
        if (!columns.some((column) => column.tableName === table.name && column.name === name)) {
          throw new Error(`SQL catalog has not exposed dbo.${table.name}.${name}; wait for synchronization before retrying. Shortcuts are preserved.`);
        }
      }
      const { recordset } = await pool.request().query(`SELECT COUNT(*) AS rows FROM dbo.${quote(table.name)}`);
      console.log(`Verified Lakehouse SQL source dbo.${table.name}: ${recordset[0].rows} rows`);
    }
    for (const example of config.examples) {
      const { recordset } = await pool.request().query(example.query);
      console.log(`Verified example: ${example.question} (${recordset.length} result rows)`);
    }
    const schema = (name, version = '1.0.0') =>
      `https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/${name}/${version}/schema.json`;
    const stage = { $schema: schema('stageConfiguration'), aiInstructions: instructions };
    const source = {
      $schema: schema('dataSource'), artifactId: target.lakehouseId, workspaceId: target.workspaceId,
      displayName: target.lakehouseName, type: 'lakehouse_tables',
      userDescription: 'Read-only OneLake shortcuts to the authoritative synthetic fleet SQL database. No duplicated operational seed.',
      dataSourceInstructions: instructions,
      elements: [{
        display_name: 'dbo', type: 'lakehouse_tables.schema', is_selected: false,
        children: config.tables.map((table) => ({
          display_name: table.name, type: 'lakehouse_tables.table', is_selected: true,
          description: table.description,
          children: table.columns.map((name) => ({
            display_name: name, type: 'lakehouse_tables.column', is_selected: true,
            data_type: columns.find((column) => column.tableName === table.name && column.name === name).dataType,
          })),
        })),
      }],
    };
    const examples = { $schema: schema('fewShots'), fewShots: config.examples.map((example) => ({ id: randomUUID(), ...example })) };
    const parts = [];
    const part = (path, value) => parts.push({ path, payloadType: 'InlineBase64', payload: Buffer.from(JSON.stringify(value)).toString('base64') });
    part('Files/Config/data_agent.json', { $schema: schema('dataAgent', '2.1.0') });
    for (const name of publish ? ['draft', 'published'] : ['draft']) {
      part(`Files/Config/${name}/stage_config.json`, stage);
      part(`Files/Config/${name}/lakehouse-${target.lakehouseName}/datasource.json`, source);
      part(`Files/Config/${name}/lakehouse-${target.lakehouseName}/fewshots.json`, examples);
    }
    if (publish) part('Files/Config/publish_info.json', {
      $schema: schema('publishInfo'),
      description: 'Read-only synthetic Zava Security Texas fleet operations: active alerts versus affected vehicles, regional delays, stale telemetry, status, attention reasons and scenario-relative recent changes. Entirely fictional demo data.',
    });
    const receipt = await fabricRequest(inWorkspace(`dataAgents/${target.dataAgentId}/updateDefinition`), {
      method: 'POST', body: { definition: { parts } },
    });
    await waitForOperation(receipt, 'Configure fleet Data Agent');
    console.log(`Agent definition applied with ${publish ? 'draft and published' : 'draft only'} stages. Actual MCP invocation must still be verified.`);
  } finally {
    await pool.close();
  }
}
