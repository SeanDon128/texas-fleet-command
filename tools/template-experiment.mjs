import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'node_modules', '@microsoft', 'rayfin-cli', 'scripts', 'main');
const evidence = join(root, 'docs', 'evidence', 'template-experiment.json');
const projectName = 'Reusable Field Operations';
const slug = 'reusable-field-operations';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const scratch = await mkdtemp(join(tmpdir(), 'zava-template-'));
const packageMetadata = await json(join(root, 'node_modules', '@microsoft', 'rayfin-cli', 'package.json'));
const report = {
  id: 'E-TEMPLATE', feedbackId: 'FB-036', startedAt: new Date().toISOString(),
  cliVersion: packageMetadata.version, nodeVersion: process.version,
  declaredNodeEngines: packageMetadata.engines.node,
  limits: [
    'Node 26 is outside the CLI declared Node 20/22/24 ranges; both local scaffolds succeeded, but supported-runtime portability was not tested.',
    'No dependency installation, generated-app build, sign-in or deployment was tested; output is not claimed to be a working second app.',
    'Business parameterization conclusions apply to the installed 1.36.2 local-template CLI path and inspected documentation.',
  ],
  hypothesis: 'Local template scaffolding renames project identity, but business customization is limited to the documented project-name placeholders.',
  expected: 'Root package and Rayfin identity renamed; README and filename project-name tokens replaced; custom organization/map tokens and ordinary source contents unchanged.',
  safeguards: ['Local directories only', 'Telemetry opted out', 'No install', 'No workspace/item flags', 'No overwrite', 'No deployment'],
  runs: [],
};
const save = () => writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`);

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
  for (const path of ['package.json', 'package-lock.json', 'rayfin-template.yml']) {
    hashes[path] = hash(await readFile(join(root, path)));
  }
  return hashes;
}

function runCli(source, destination) {
  assert.equal(dirname(destination), scratch, 'Output must be an immediate scratch child.');
  assert.ok(!existsSync(destination), 'Never overwrite an existing output.');
  const env = { ...process.env, RAYFIN_TELEMETRY_OPTOUT: '1', CI: 'true', npm_config_offline: 'true' };
  for (const key of ['RAYFIN_TOKEN', 'RAYFIN_FABRIC_WORKSPACE_ID', 'RAYFIN_FABRIC_ITEM_ID']) delete env[key];
  const started = Date.now();
  const result = spawnSync(process.execPath, [
    cli, '--yes', 'init', destination, '--template', source,
    '--project-name', projectName, '--skip-install',
  ], { cwd: scratch, env, encoding: 'utf8', windowsHide: true, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Scaffold exited ${result.status}; ${result.stderr.slice(-500)}`);
  return {
    seconds: (Date.now() - started) / 1000, exitCode: result.status,
    syncSuccessReported: /Scaffolding files synchronized/.test(`${result.stdout}\n${result.stderr}`),
    dependencyInstallRequested: /Installing .*dependencies with|Running npm command/.test(`${result.stdout}\n${result.stderr}`),
    command: 'node <installed-rayfin-cli> --yes init <scratch-output> --template <local-source> --project-name "Reusable Field Operations" --skip-install',
  };
}

async function sameFile(source, output, relative) {
  const a = join(source, relative), b = join(output, relative);
  return { sourcePresent: existsSync(a), outputPresent: existsSync(b),
    identical: existsSync(a) && existsSync(b) ? hash(await readFile(a)) === hash(await readFile(b)) : null };
}

const baseline = await frozenFiles();
await save();
try {
  const output = join(scratch, 'fleet-copy');
  const execution = runCli(root, output);
  const config = parse(await readFile(join(output, 'rayfin', 'rayfin.yml'), 'utf8'));
  const sourceConfig = parse(await readFile(join(root, 'rayfin', 'rayfin.yml'), 'utf8'));
  const copied = {};
  for (const path of [
    'README.md', 'package-lock.json', 'config\\fabric-target.json', 'packages\\frontend\\src\\App.tsx',
    'packages\\functions\\src\\function_app.ts', 'rayfin\\.deployments.json', 'rayfin\\.env',
    '.env.local', 'packages\\functions\\local.settings.json', 'PROJECT_PLAN.md',
  ]) copied[path] = await sameFile(root, output, path);
  const sourcePackage = await json(join(root, 'package.json'));
  const outputPackage = await json(join(output, 'package.json'));
  const dependencyDeclarationsPreserved = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    .every((key) => JSON.stringify(sourcePackage[key]) === JSON.stringify(outputPackage[key]));
  report.runs.push({
    name: 'Current project as-is', execution,
    packageName: outputPackage.name,
    dependencyDeclarationsPreserved,
    rayfinIdentity: { id: config.id, name: config.name },
    protectedAssetsPreserved: config.services.staticHosting.assetAccess === 'protected',
    authPreserved: config.services.auth.fabric.enabled === true && config.services.auth.password.enabled === false,
    originalHostedRedirectRetained: config.services.auth.allowedRedirectUris
      .some((value) => sourceConfig.services.auth.allowedRedirectUris.includes(value) && value.startsWith('https://')),
    copiedFiles: copied,
    directories: Object.fromEntries(['.git', 'node_modules', 'data\\generated', 'packages\\frontend\\dist', 'docs\\evidence', 'fabric']
      .map((path) => [path, { sourcePresent: existsSync(join(root, path)), outputPresent: existsSync(join(output, path)) }])),
    agentFilesInstalled: existsSync(join(output, '.mcp.json')) && existsSync(join(output, '.agents', 'skills', 'rayfin', 'SKILL.md')),
  });
  assert.equal(report.runs[0].packageName, slug);
  assert.equal(config.id, slug);
  assert.equal(config.name, projectName);
  assert.ok(report.runs[0].protectedAssetsPreserved && report.runs[0].authPreserved);
  assert.ok(dependencyDeclarationsPreserved && execution.syncSuccessReported);
  assert.equal(execution.dependencyInstallRequested, false);
  await save();

  const fixture = join(scratch, 'probe-source');
  const fixtureFiles = {
    'rayfin-template.yml': 'apiVersion: v1\nmetadata:\n  name: template-probe\n  displayName: Template probe\nentries:\n  - name: probe\n    path: .\n',
    'package.json': JSON.stringify({ name: 'source-probe', private: true, version: '0.0.0' }),
    'README.md': '{{PROJECT_NAME}}\n{{PROJECT_NAME_KEBAB}}\n{{PROJECT_NAME_PASCAL}}\n{{ORGANIZATION_NAME}}\n{{MAP_CENTER}}\n',
    '__projectName__.ts': 'export const name = "{{PROJECT_NAME}}";\n',
    '__organizationName__.txt': '{{ORGANIZATION_NAME}}\n',
    'docs\\README.md': '{{PROJECT_NAME}}\n',
    '.gitignore': 'ignored.txt\n.env.local\ndist\n',
    'ignored.txt': 'Synthetic copy-filter probe only.\n',
    '.env.local': 'TEMPLATE_PROBE_NOT_A_SECRET=1\n',
    'dist\\marker.txt': 'Synthetic build-output probe.\n',
    '.git\\marker.txt': 'Synthetic git-metadata probe.\n',
    'node_modules\\marker.txt': 'Synthetic dependency-directory probe.\n',
    'packages\\child\\package.json': JSON.stringify({ name: 'source-child', version: '0.0.0' }),
    'rayfin\\rayfin.yml': 'id: source-probe\nname: Source probe\nversion: 1.0.0\nservices:\n  auth:\n    enabled: true\n    fabric:\n      enabled: true\n    password:\n      enabled: false\n  data:\n    enabled: false\n  staticHosting:\n    enabled: false\n',
  };
  for (const [path, content] of Object.entries(fixtureFiles)) {
    await mkdir(dirname(join(fixture, path)), { recursive: true });
    await writeFile(join(fixture, path), content);
  }
  const probeOutput = join(scratch, 'probe-output');
  const probeExecution = runCli(fixture, probeOutput);
  const readme = await readFile(join(probeOutput, 'README.md'), 'utf8');
  const filename = `${projectName}.ts`;
  const probe = {
    name: 'Controlled placeholder and copy-filter probe', execution: probeExecution,
    rootReadme: readme.trim().split('\n'),
    projectFilenameRendered: existsSync(join(probeOutput, filename)),
    projectTokenInsideTypeScriptUnchanged: (await readFile(join(probeOutput, filename), 'utf8')).includes('{{PROJECT_NAME}}'),
    customFilenameTokenUnchanged: existsSync(join(probeOutput, '__organizationName__.txt')),
    nestedReadmeUnchanged: (await readFile(join(probeOutput, 'docs', 'README.md'), 'utf8')).includes('{{PROJECT_NAME}}'),
    nestedPackageName: (await json(join(probeOutput, 'packages', 'child', 'package.json'))).name,
    gitignoredFileCopied: existsSync(join(probeOutput, 'ignored.txt')),
    syntheticEnvFileCopied: existsSync(join(probeOutput, '.env.local')),
    buildOutputCopied: existsSync(join(probeOutput, 'dist', 'marker.txt')),
    gitMetadataSkipped: !existsSync(join(probeOutput, '.git')),
    dependencyDirectorySkipped: !existsSync(join(probeOutput, 'node_modules')),
    templateManifestSkipped: !existsSync(join(probeOutput, 'rayfin-template.yml')),
  };
  report.runs.push(probe);
  assert.ok(probeExecution.syncSuccessReported);
  assert.equal(probeExecution.dependencyInstallRequested, false);
  assert.deepEqual(probe.rootReadme, [projectName, slug, 'ReusableFieldOperations', '{{ORGANIZATION_NAME}}', '{{MAP_CENTER}}']);
  for (const key of ['projectFilenameRendered', 'projectTokenInsideTypeScriptUnchanged', 'customFilenameTokenUnchanged',
    'nestedReadmeUnchanged', 'gitignoredFileCopied', 'syntheticEnvFileCopied', 'buildOutputCopied',
    'gitMetadataSkipped', 'dependencyDirectorySkipped', 'templateManifestSkipped']) assert.equal(probe[key], true, key);
  assert.equal(probe.nestedPackageName, 'source-child');
  report.result = 'CONFIRMED for the installed local-template CLI path: project-identity scaffolding works; custom business tokens remain unresolved; .gitignore is not a template export filter.';
} catch (error) {
  report.result = 'FAILED: inspect the recorded error before making a feature claim.';
  report.error = String(error.message).replaceAll(scratch, '<scratch>').replaceAll(root, '<project-root>').slice(0, 1200);
  throw error;
} finally {
  const after = await frozenFiles();
  report.isolation = {
    frozenFileCount: Object.keys(baseline).length,
    changedFiles: [...new Set([...Object.keys(baseline), ...Object.keys(after)])].filter((path) => baseline[path] !== after[path]),
  };
  assert.equal(dirname(scratch), resolve(tmpdir()));
  assert.ok(basename(scratch).startsWith('zava-template-'));
  await rm(scratch, { recursive: true });
  report.scratchRemoved = !existsSync(scratch);
  report.completedAt = new Date().toISOString();
  await save();
}
assert.deepEqual(report.isolation.changedFiles, [], 'Working project changed.');
console.log(JSON.stringify(report, null, 2));
