import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accessToken, assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from './fabric.mjs';
import { readSeed } from './verify-sql.mjs';

if (process.argv.length > 2) throw new Error('No load flags are supported; existing tables or different source files will not be overwritten.');
await readSeed();
await assertTarget();
const { value: lakehouse } = await fabricRequest(inWorkspace(`lakehouses/${target.lakehouseId}`));
assert.equal(lakehouse.workspaceId, target.workspaceId);
assert.equal(lakehouse.displayName, target.lakehouseName);
const files = new URL(`${lakehouse.properties.oneLakeFilesPath}/synthetic/`);
if (!files.hostname.endsWith('.dfs.fabric.microsoft.com') ||
    !files.pathname.startsWith(`/${target.workspaceId}/${target.lakehouseId}/Files/`)) {
  throw new Error('OneLake path is outside the approved history Lakehouse.');
}
const token = accessToken('https://storage.azure.com/');
async function storage(url, method, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token}`, 'x-ms-version': '2023-11-03', ...extraHeaders },
    ...(body === undefined ? {} : { body }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`OneLake ${method} ${url.pathname}: HTTP ${response.status}; ${await response.text()}`);
  }
  return response;
}

const directory = new URL(files.href.slice(0, -1));
const directoryHead = await storage(directory, 'HEAD');
if (directoryHead.status === 404) {
  directory.searchParams.set('resource', 'directory');
  const created = await storage(directory, 'PUT');
  assert.ok(created.ok, 'OneLake source directory was not created.');
}

for (const name of ['fleet_daily_kpi', 'vehicle_daily']) {
  const content = await readFile(new URL(`../data/generated/${name}.csv`, import.meta.url));
  const destination = new URL(`${name}.csv`, files);
  const existing = await storage(destination, 'GET');
  if (existing.ok) {
    assert.ok(content.equals(Buffer.from(await existing.arrayBuffer())), `Refusing to overwrite different source data for ${name}.`);
    console.log(`${name}: identical source file already present.`);
  } else {
    const createUrl = new URL(destination);
    createUrl.searchParams.set('resource', 'file');
    assert.ok((await storage(createUrl, 'PUT', undefined, { 'If-None-Match': '*' })).ok, 'OneLake source file create failed.');
    const appendUrl = new URL(destination);
    appendUrl.searchParams.set('action', 'append');
    appendUrl.searchParams.set('position', '0');
    assert.ok((await storage(appendUrl, 'PATCH', content, { 'Content-Type': 'application/octet-stream' })).ok, 'OneLake append failed.');
    const flushUrl = new URL(destination);
    flushUrl.searchParams.set('action', 'flush');
    flushUrl.searchParams.set('position', String(content.length));
    assert.ok((await storage(flushUrl, 'PATCH')).ok, 'OneLake flush failed.');
    console.log(`${name}: uploaded ${content.length} bytes to history Lakehouse.`);
  }
  const { value: inventory } = await fabricRequest(inWorkspace(`lakehouses/${target.lakehouseId}/tables?maxResults=100`));
  if (inventory.continuationToken) throw new Error('Unexpected paginated history inventory; inspect all tables before loading.');
  if (inventory.data.some((table) => table.name === name)) {
    console.log(`${name}: existing table preserved. Run data:verify-history to check persisted contents.`);
    continue;
  }
  const receipt = await fabricRequest(inWorkspace(`lakehouses/${target.lakehouseId}/tables/${name}/load`), {
    method: 'POST',
    body: { relativePath: `Files/synthetic/${name}.csv`, pathType: 'File', mode: 'Overwrite',
      recursive: false, formatOptions: { format: 'Csv', header: true, delimiter: ',' } },
  });
  await waitForOperation(receipt, `Load ${name}`);
}
const { value: inventory } = await fabricRequest(inWorkspace(`lakehouses/${target.lakehouseId}/tables?maxResults=100`));
for (const name of ['fleet_daily_kpi', 'vehicle_daily']) {
  assert.equal(inventory.data.find((table) => table.name === name)?.format?.toLowerCase(), 'delta', `${name}: persisted Delta table missing.`);
}
console.log('Both Delta tables exist. SQL endpoint content verification is a separate required gate.');
