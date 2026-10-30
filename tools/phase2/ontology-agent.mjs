import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from '../fabric.mjs';
import { connectSql, inspectLayout, qualified } from '../sql.mjs';

const root = new URL('../../', import.meta.url);
const out = new URL('fabric/phase2/ontology-agent/', root);
const semantic = JSON.parse(await readFile(new URL('config/phase2-semantic-agent.json', root), 'utf8'));
const ontology = JSON.parse(await readFile(new URL('config/phase2-ontology.json', root), 'utf8'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const save = async (name, value) => {
  await mkdir(out, { recursive: true });
  await writeFile(new URL(name, out), `${JSON.stringify(value, null, 2)}\n`);
};

async function definition(id) {
  const receipt = await fabricRequest(inWorkspace(`dataAgents/${id}/getDefinition`), { method: 'POST' });
  if (receipt.status !== 202) return receipt.value.definition;
  const done = await waitForOperation(receipt, 'Read experiment isolation definition');
  return (await fabricRequest(`operations/${done.operationId}/result`)).value.definition;
}

function partHashes(value) {
  return Object.fromEntries([...value.parts].sort((a, b) => a.path.localeCompare(b.path))
    .map((part) => [part.path, hash(Buffer.from(part.payload, 'base64'))]));
}

async function fileHashes() {
  const result = {};
  async function walk(relative) {
    for (const entry of await readdir(new URL(relative, root), { withFileTypes: true })) {
      if (['node_modules', 'dist', '.cache'].includes(entry.name)) continue;
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) await walk(`${path}/`);
      else if (/\.(?:tsx?|css|html|json|ya?ml)$/.test(entry.name)) {
        result[path] = hash(await readFile(new URL(path, root)));
      }
    }
  }
  for (const dir of ['packages/frontend/src/', 'packages/functions/src/', 'packages/data/src/', 'packages/shared/src/', 'rayfin/']) await walk(dir);
  for (const path of ['package.json', 'package-lock.json', 'config/fleet-agent.json']) {
    result[path] = hash(await readFile(new URL(path, root)));
  }
  return result;
}

async function snapshot() {
  await assertTarget();
  assert.equal(ontology.workspaceId, target.workspaceId);
  assert.notEqual(semantic.agentId, target.dataAgentId);
  const existing = await definition(target.dataAgentId);
  const experimental = await definition(semantic.agentId);
  await save('baseline-experimental-definition.json', { definition: experimental });
  await save('baseline.json', {
    recordedAt: new Date().toISOString(), capacity: 'Active',
    hypothesis: 'Ontology context makes the Vehicle-Alert-Region and assignment/reviewer relationships usable without copying the ontology rules into agent instructions.',
    route: 'Documented portal Add sources > Ontology; graph querying is a separate capability and will not be substituted.',
    questions: [
      { id: 'O1', text: 'Which vehicles have active critical alerts, which regions do they operate in, and who is assigned to review each alert? Include unassigned alerts.' },
      { id: 'O2', text: 'For SYN-027, link its current assignment and active alerts: show the assignment destination and delay, each active alert severity, and each assigned reviewer and their home region. Distinguish an unassigned reviewer.' },
    ],
    existingAgentParts: partHashes(existing), experimentalAgentParts: partHashes(experimental),
    files: await fileHashes(),
  });
  const pool = await connectSql();
  try {
    const layout = await inspectLayout(pool);
    const table = (name) => qualified(layout.get(name));
    const critical = await pool.request().query(`
      SELECT v.vehicleCode, r.code AS vehicleRegion, a.id AS alertId,
        a.status, a.severity, t.displayName AS reviewer, tr.code AS reviewerRegion
      FROM ${table('Alert')} a
      JOIN ${table('Vehicle')} v ON v.id = a.vehicle_id
      JOIN ${table('Region')} r ON r.id = v.region_id
      LEFT JOIN ${table('TeamMember')} t ON t.id = a.assignedTo_id
      LEFT JOIN ${table('Region')} tr ON tr.id = t.region_id
      WHERE a.status IN ('open','acknowledged') AND a.severity = 'critical'
      ORDER BY v.vehicleCode, a.id`);
    const investigation = await pool.request().query(`
      SELECT v.vehicleCode, r.code AS vehicleRegion, s.destinationName, s.delayMinutes AS assignmentDelay,
        a.id AS alertId, a.status, a.severity, t.displayName AS reviewer, tr.code AS reviewerRegion
      FROM ${table('Vehicle')} v
      JOIN ${table('Region')} r ON r.id = v.region_id
      LEFT JOIN ${table('Assignment')} s ON s.vehicle_id = v.id AND s.isCurrent = 1
      LEFT JOIN ${table('Alert')} a ON a.vehicle_id = v.id AND a.status IN ('open','acknowledged')
      LEFT JOIN ${table('TeamMember')} t ON t.id = a.assignedTo_id
      LEFT JOIN ${table('Region')} tr ON tr.id = t.region_id
      WHERE v.vehicleCode = 'SYN-027' ORDER BY a.id`);
    await save('ground-truth.json', { measuredAt: new Date().toISOString(), O1: critical.recordset, O2: investigation.recordset });
    console.log(JSON.stringify({ baselineSaved: true, criticalAlerts: critical.recordset.length, investigationRows: investigation.recordset.length }));
  } finally { await pool.close(); }
}

async function verifyIsolation() {
  await assertTarget();
  const baseline = JSON.parse(await readFile(new URL('baseline.json', out), 'utf8'));
  const live = partHashes(await definition(target.dataAgentId));
  const files = await fileHashes();
  const changedFiles = [...new Set([...Object.keys(files), ...Object.keys(baseline.files)])]
    .filter((key) => files[key] !== baseline.files[key]);
  const result = {
    verifiedAt: new Date().toISOString(),
    existingAgentUnchanged: JSON.stringify(live) === JSON.stringify(baseline.existingAgentParts),
    frozenFileCount: Object.keys(baseline.files).length, changedFiles,
  };
  await save('isolation-verification.json', result);
  console.log(JSON.stringify(result));
  assert.ok(result.existingAgentUnchanged, 'Working agent definition changed.');
  assert.equal(changedFiles.length, 0, 'Working application files changed.');
}

async function inspectExperiment() {
  await assertTarget();
  const current = await definition(semantic.agentId);
  const baseline = JSON.parse(await readFile(new URL('baseline.json', out), 'utf8'));
  const currentHashes = partHashes(current);
  const publishedParts = (parts) => Object.entries(parts).filter(([path]) => path.includes('/published/'));
  const sources = current.parts.filter((part) => part.path.endsWith('datasource.json'))
    .map((part) => {
      const source = JSON.parse(Buffer.from(part.payload, 'base64').toString('utf8'));
      return { path: part.path, type: source.type, displayName: source.displayName };
    });
  const result = {
    inspectedAt: new Date().toISOString(), sources, paths: current.parts.map((part) => part.path),
    stages: current.parts.filter((part) => part.path.endsWith('stage_config.json')).map((part) => {
      const stage = JSON.parse(Buffer.from(part.payload, 'base64').toString('utf8'));
      return { path: part.path, previewEnabled: stage.experimental?.enableExperimentalFeatures === true };
    }),
    publishedPartsUnchanged: JSON.stringify(publishedParts(baseline.experimentalAgentParts))
      === JSON.stringify(publishedParts(currentHashes)),
    changedParts: [...new Set([...Object.keys(baseline.experimentalAgentParts), ...Object.keys(currentHashes)])]
      .filter((key) => baseline.experimentalAgentParts[key] !== currentHashes[key]),
  };
  await save('experimental-definition-after.json', { definition: current });
  await save('experimental-inspection.json', result);
  console.log(JSON.stringify(result, null, 2));
}

const command = process.argv[2];
const commands = { snapshot, 'verify-isolation': verifyIsolation, inspect: inspectExperiment };
assert.ok(Object.hasOwn(commands, command), 'Expected snapshot, inspect or verify-isolation.');
await commands[command]();
