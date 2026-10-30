import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { accessToken, assertTarget, target } from './fabric.mjs';
import { connectSql, inspectLayout, qualified } from './sql.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'node_modules', '@microsoft', 'rayfin-cli', 'scripts', 'main');
const output = join(root, 'docs', 'evidence', 'connector-sql-experiment.json');
const recoveryOnly = process.argv.includes('--recover-discovery');
assert.ok(!recoveryOnly || existsSync(output), 'Recovery requires an existing experiment record.');
const scratch = await mkdtemp(join(tmpdir(), 'zava-sql-connector-'));
const alias = 'fleetSql';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const report = {
  id: 'E-CONNECTOR-SQL', feedbackId: 'FB-037', startedAt: new Date().toISOString(),
  cliVersion: JSON.parse(await readFile(join(root, 'node_modules', '@microsoft', 'rayfin-cli', 'package.json'), 'utf8')).version,
  nodeVersion: process.version,
  hypothesis: 'The existing Fabric SQL database can be discovered, attached read-only and inspected through the CLI in an isolated project without deploying or changing the working app.',
  expected: 'Search identifies the approved database; add writes read-only application-auth configuration plus schema metadata; one inspection returns one real Region row.',
  safeguards: ['Scratch project outside source tree', 'Read-only operations', 'One connector sample maximum; stop on failure',
    'No deployment, package install, permissions, capacity or source-data changes', 'Tokens passed only in child process environment, never persisted'],
  steps: [],
  limits: ['Node 26 is outside CLI declared Node 20/22/24 support; no supported-runtime portability claim.',
    'CLI source inspection does not prove deployed application-identity access, generated entity authorization or browser integration.',
    'Connector SDK is not installed; no entity generation or frontend wiring is attempted.'],
};
if (existsSync(output)) {
  const previous = JSON.parse(await readFile(output, 'utf8'));
  if (recoveryOnly) {
    assert.equal(previous.steps.find((step) => step.name === 'inspect')?.exitCode, 0,
      'Recovery requires an already successful inspection; it must not repeat the sample.');
    Object.assign(report, previous, { recoveryStartedAt: new Date().toISOString(), scratchRemoved: false });
  } else if (previous.error === "Cannot read properties of undefined (reading 'operations')") {
    report.priorHarnessCorrection = {
      completedAt: previous.completedAt,
      cause: 'The helper assumed the requested camel-case alias was retained. The CLI normalized fleetSql to fleetsql; now it consumes the returned name.',
      stage: 'Before direct SQL control or connector inspection; no connector sample had run.',
      firstAttemptFrozenFilesUnchanged: previous.isolation.changedFiles.length === 0,
      firstAttemptScratchRemoved: previous.scratchRemoved,
    };
  }
}

function sanitize(value) {
  let text = JSON.stringify(value);
  for (const [key, secret] of Object.entries(target)) {
    if (typeof secret === 'string' && (key.endsWith('Id') || key === 'username')) {
      text = text.replaceAll(secret, `<${key}>`);
    }
  }
  for (const [path, replacement] of [[scratch, '<scratch>'], [root, '<project-root>'], [process.env.USERPROFILE, '<user-profile>']]) {
    if (path) text = text.replaceAll(JSON.stringify(path).slice(1, -1), replacement);
  }
  return JSON.parse(text);
}
const save = () => writeFile(output, `${JSON.stringify(sanitize(report), null, 2)}\n`);

async function frozenFiles() {
  const hashes = {};
  async function walk(relative) {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(entry.name) || entry.isSymbolicLink()) continue;
      const path = join(relative, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:tsx?|mjs|css|html|json|ya?ml)$/.test(entry.name) || entry.name.startsWith('.env')) {
        hashes[path] = hash(await readFile(join(root, path)));
      }
    }
  }
  for (const dir of ['packages', 'rayfin', 'config']) await walk(dir);
  for (const path of ['package.json', 'package-lock.json', 'rayfin-template.yml']) hashes[path] = hash(await readFile(join(root, path)));
  return hashes;
}

function run(name, args, token) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [cli, 'connector', ...args, '--json'], {
    cwd: scratch, encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, RAYFIN_TELEMETRY_OPTOUT: '1', RAYFIN_TOKEN: token,
      RAYFIN_TENANT_ID: target.tenantId, RAYFIN_WORKSPACE_ID: target.workspaceId, CI: 'true' },
  });
  if (result.error) throw result.error;
  const stdout = result.stdout.trim();
  let envelope;
  let singleJsonObject = true;
  try { envelope = JSON.parse(stdout); }
  catch (error) {
    singleJsonObject = false;
    const start = stdout.indexOf('{');
    if (start < 0) throw new Error(`${name}: no JSON output; ${error.message}`);
    envelope = JSON.parse(stdout.slice(start));
  }
  const step = {
    name, seconds: (Date.now() - started) / 1000, exitCode: result.status,
    singleJsonObject,
    diagnosticLines: singleJsonObject ? [] : stdout.slice(0, stdout.indexOf('{')).trim().split('\n'),
    response: envelope,
  };
  report.steps.push(step);
  return step;
}

const baseline = await frozenFiles();
await save();
try {
  await assertTarget();
  report.approvedIdentityAndActiveCapacityVerified = true;
  const fabricToken = accessToken();
  const powerBiToken = accessToken('https://analysis.windows.net/powerbi/api');
  report.tokenAudiences = {
    controlPlane: JSON.parse(Buffer.from(fabricToken.split('.')[1], 'base64url').toString('utf8')).aud,
    cliDefaultDataPlane: JSON.parse(Buffer.from(powerBiToken.split('.')[1], 'base64url').toString('utf8')).aud,
  };
  await mkdir(join(scratch, 'rayfin'));
  await writeFile(join(scratch, 'package.json'), '{"name":"sql-connector-probe","private":true,"type":"module"}\n');
  await writeFile(join(scratch, 'rayfin', 'rayfin.yml'), [
    'id: sql-connector-probe', 'name: SQL connector experiment', 'version: 1.0.0', 'services:',
    '  auth:', '    enabled: true', '    fabric:', '      enabled: true', '    password:', '      enabled: false',
    '  data:', '    enabled: false', '  staticHosting:', '    enabled: false', '    assetAccess: protected', '',
  ].join('\n'));

  if (recoveryOnly) {
    const recovery = run('add-recovery', ['add', '--type', 'fabric-sqldatabase', '--workspace-id', target.workspaceId,
      '--item-id', target.sqlDatabaseId, '--name', alias, '--operations', 'read', '--yes'], powerBiToken);
    const config = parse(await readFile(join(scratch, 'rayfin', 'rayfin.yml'), 'utf8'));
    const connector = config.connectors.find((item) => item.name === recovery.response.name);
    assert.deepEqual(connector.operations.map((item) => item.name), ['read']);
    assert.equal(connector.auth.type, 'application');
    const metadataPath = join(scratch, 'rayfin', 'connectors', connector.name, 'metadata.json');
    report.discoveryRecovery = {
      credentialChange: 'Followed the printed hint: Power BI-audience RAYFIN_TOKEN instead of Fabric-audience token.',
      metadataExists: existsSync(metadataPath),
      additionalConnectorSamples: 0,
      readOnlyAndApplicationAuthPreserved: true,
    };
    if (recovery.exitCode === 0 && recovery.response.schemaDiscovery?.status === 'success' && existsSync(metadataPath)) {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      report.discoveryRecovery.metadata = {
        schemas: metadata.schemas.map((schema) => ({
          schemaName: schema.schemaName,
          tables: schema.tables.map((table) => ({ tableName: table.tableName, columnCount: table.columns.length })),
        })),
        tableCount: metadata.schemas.reduce((count, schema) => count + schema.tables.length, 0),
      };
      report.result = 'WORKED after documented token recovery: read-only declaration, schema discovery and one CLI source sample verified. Deployed application integration not tested.';
    } else {
      report.result = 'PARTIAL: one CLI source sample succeeded, but schema-discovery recovery did not complete. Deployed application integration not tested.';
    }
  } else {
    const catalog = run('catalog', ['types'], fabricToken);
    assert.equal(catalog.exitCode, 0);
    const type = catalog.response.types.find((item) => item.type === 'fabric-sqldatabase');
    assert.ok(type?.allowedOperations.includes('read'));
    const search = run('search', ['search', target.appName, '--workspace-id', target.workspaceId, '--type', type.type], fabricToken);
    assert.equal(search.exitCode, 0);
    const matches = search.response.sources.filter((item) => item.itemId === target.sqlDatabaseId && item.workspaceId === target.workspaceId);
    assert.equal(matches.length, 1, 'Expected exactly the approved SQL database.');
    assert.equal(matches[0].connectorType, type.type);
    report.sourceVerified = true;

    const add = run('add', ['add', '--type', type.type, '--workspace-id', target.workspaceId,
      '--item-id', target.sqlDatabaseId, '--name', alias, '--operations', 'read', '--yes'], fabricToken);
    assert.equal(add.exitCode, 0, 'Connector declaration failed.');
    const resolvedAlias = add.response.name;
    assert.equal(typeof resolvedAlias, 'string', 'Add must report its actual connector name.');
    const config = parse(await readFile(join(scratch, 'rayfin', 'rayfin.yml'), 'utf8'));
    const connector = config.connectors.find((item) => item.name === resolvedAlias);
    assert.ok(connector, 'Returned connector name must exist in the generated configuration.');
    assert.deepEqual(connector.operations.map((item) => item.name), ['read']);
    assert.equal(connector.auth.type, 'application');
    report.scaffold = {
      requestedAlias: alias, connector: connector.name, type: connector.type, operations: connector.operations,
      auth: connector.auth.type,
      schemaPlaceholderExists: existsSync(join(scratch, 'rayfin', 'connectors', resolvedAlias, 'schema.ts')),
      metadataExists: existsSync(join(scratch, 'rayfin', 'connectors', resolvedAlias, 'metadata.json')),
      dependenciesInstalled: existsSync(join(scratch, 'node_modules')),
    };
    await save();

    const pool = await connectSql();
    try {
      const layout = await inspectLayout(pool);
      const region = layout.get('Region');
      assert.ok(region.columns.some((column) => column.name === 'code'));
      const { recordset } = await pool.request().query(`SELECT TOP (1) [code] FROM ${qualified(region)} ORDER BY [code]`);
      assert.equal(recordset.length, 1);
      report.separateDirectSqlControl = { route: 'Existing project mssql helper with distinct Fabric and SQL-audience tokens; NOT a connector result',
        succeeded: true, entity: `${region.schema}.${region.name}`, rows: recordset };
      const inspect = run('inspect', ['inspect', '--name', resolvedAlias, '--entity', `${region.schema}.${region.name}`, '--rows', '1'], powerBiToken);
      if (inspect.exitCode === 0) {
        assert.equal(inspect.response.rowsReturned, 1);
        assert.equal(inspect.response.rows.length, 1);
        assert.equal(inspect.response.rows[0].isSynthetic, true);
        assert.equal(inspect.response.entity, `${region.schema}.${region.name}`);
        assert.equal(inspect.response.columns.find((column) => column.name === 'centerLat')?.type, 'decimal');
        assert.equal(inspect.response.columns.find((column) => column.name === 'isSynthetic')?.type, 'boolean');
      }
      report.result = inspect.exitCode === 0 ? 'SOURCE INSPECTION WORKED; deployed application integration not tested.' :
        'PARTIAL: discovery and read-only declaration worked; connector inspection blocked. No more connector samples attempted.';
    } finally { await pool.close(); }
  }
} catch (error) {
  report.result = 'EXPERIMENT STOPPED: see recorded error; do not infer unexecuted stages succeeded.';
  report.error = error.message;
  throw error;
} finally {
  const after = await frozenFiles();
  report.isolation = { frozenFileCount: Object.keys(baseline).length,
    changedFiles: [...new Set([...Object.keys(baseline), ...Object.keys(after)])].filter((path) => baseline[path] !== after[path]) };
  assert.equal(dirname(scratch), resolve(tmpdir()));
  assert.ok(basename(scratch).startsWith('zava-sql-connector-'));
  await rm(scratch, { recursive: true });
  report.scratchRemoved = !existsSync(scratch);
  report.completedAt = new Date().toISOString();
  await save();
}
assert.deepEqual(report.isolation.changedFiles, [], 'Working project changed.');
console.log(JSON.stringify(sanitize({
  result: report.result, steps: report.steps.map(({ name, seconds, exitCode, singleJsonObject, response }) =>
    ({ name, seconds, exitCode, singleJsonObject, schemaDiscovery: response.schemaDiscovery })),
  recovery: report.discoveryRecovery, isolation: report.isolation, scratchRemoved: report.scratchRemoved,
}), null, 2));
