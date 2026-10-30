import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

export const target = JSON.parse(await readFile(new URL('../config/fabric-target.json', import.meta.url), 'utf8'));
const origin = 'https://api.fabric.microsoft.com/v1/';
const workspacePath = `workspaces/${target.workspaceId}`;

function az(args) {
  const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'az';
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', `az ${args.join(' ')}`] : args;
  return JSON.parse(execFileSync(command, commandArgs, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
}

export function accessToken(resource = 'https://api.fabric.microsoft.com') {
  if (!['https://api.fabric.microsoft.com', 'https://analysis.windows.net/powerbi/api',
    'https://database.windows.net/', 'https://storage.azure.com/'].includes(resource)) {
    throw new Error('Unsupported token audience.');
  }
  const account = az(['account', 'show', '--output', 'json']);
  if (account.tenantId !== target.tenantId || account.user?.name?.toLowerCase() !== target.username.toLowerCase()) {
    throw new Error(`Wrong Azure CLI identity. Expected ${target.username} in tenant ${target.tenantId}.`);
  }
  const token = az(['account', 'get-access-token', '--resource', resource, '--tenant', target.tenantId, '--output', 'json']).accessToken;
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  if (claims.tid !== target.tenantId) throw new Error('Token tenant differs from the approved tenant.');
  return token;
}

export async function fabricRequest(path, { method = 'GET', body } = {}) {
  const allowed = path === workspacePath || path.startsWith(`${workspacePath}/`) ||
    (method === 'GET' && /^(capacities(?:\/[0-9a-f-]+)?|operations\/[0-9a-f-]+(?:\/result)?)$/i.test(path));
  if (!allowed) throw new Error(`Refusing Fabric request outside approved workspace: ${path}`);
  const response = await fetch(new URL(path, origin), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(90_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Fabric ${method} ${path}: HTTP ${response.status}; request ${response.headers.get('request-id') ?? 'not supplied'}; ${text}`);
  }
  return { status: response.status, headers: response.headers, value: text ? JSON.parse(text) : undefined };
}

export async function assertTarget() {
  const { value: workspace } = await fabricRequest(workspacePath);
  if (workspace.id !== target.workspaceId || workspace.displayName !== target.workspaceName ||
      workspace.capacityId !== target.capacityId) throw new Error('Workspace or capacity does not match approved target.');
  const { value: capacities } = await fabricRequest('capacities');
  const capacity = capacities.value.find((row) => row.id === target.capacityId);
  if (!capacity || capacity.displayName !== target.capacityName || capacity.region !== target.capacityRegion ||
      capacity.state !== 'Active') throw new Error('Approved East US 2 capacity is not active or not visible.');
  return workspace;
}

export async function waitForOperation(receipt, label, timeoutMs = 600_000) {
  if (receipt.status !== 202) return receipt.value;
  const operationId = receipt.headers.get('x-ms-operation-id');
  if (!operationId || !/^[0-9a-f-]{36}$/i.test(operationId)) {
    throw new Error(`${label}: accepted without an operation ID. Inspect Fabric before retrying; do not resubmit.`);
  }
  console.log(`${label}: accepted as operation ${operationId}. Waiting for completion.`);
  const deadline = Date.now() + timeoutMs;
  let delay = Number(receipt.headers.get('retry-after') ?? 5);
  while (Date.now() < deadline) {
    await sleep(Math.min(Math.max(delay, 1), 120) * 1000);
    const state = await fabricRequest(`operations/${operationId}`);
    console.log(`${label}: ${state.value.status}`);
    if (state.value.status === 'Succeeded') return { operationId, status: 'Succeeded' };
    if (['Failed', 'Cancelled'].includes(state.value.status)) {
      throw new Error(`${label}: ${JSON.stringify(state.value)}`);
    }
    delay = Number(state.headers.get('retry-after') ?? 10);
  }
  throw new Error(`${label}: timed out waiting for operation ${operationId}. Inspect that operation before retrying.`);
}

export const inWorkspace = (suffix) => `${workspacePath}/${suffix}`;
