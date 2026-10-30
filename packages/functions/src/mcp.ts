import type { DataAgentFailureCode } from '@rayfin-app/shared';

export const MAX_QUESTION_LENGTH = 2_000;
export const MAX_ANSWER_LENGTH = 20_000;
const MAX_RESPONSE_BYTES = 256_000;
const PROTOCOL_VERSION = '2025-06-18';

type JsonObject = Record<string, unknown>;

export class AgentError extends Error {
  constructor(readonly code: DataAgentFailureCode) {
    super(`Fleet Data Agent: ${code}`);
    this.name = 'AgentError';
  }
}

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rpc(text: string, id: number): JsonObject | undefined {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new AgentError('protocol'); }
  if (!object(value) || value.jsonrpc !== '2.0') throw new AgentError('protocol');
  if (value.id !== id) return undefined;
  if (value.error !== undefined || !object(value.result)) throw new AgentError('protocol');
  return value.result;
}

async function readResult(response: Response, id?: number): Promise<JsonObject | undefined> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const sse = contentType.includes('text/event-stream');
  if (id !== undefined && !sse && !contentType.includes('application/json')) {
    throw new AgentError('protocol');
  }
  if (!response.body) {
    if (id !== undefined) throw new AgentError('protocol');
    return undefined;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  const eventResult = (event: string) => {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, '')).join('\n');
    return data && id !== undefined ? rpc(data, id) : undefined;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      bytes += value?.byteLength ?? 0;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new AgentError('protocol');
      }
      text += decoder.decode(value, { stream: !done });
      if (sse) {
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(text))) {
          const event = text.slice(0, boundary.index);
          text = text.slice(boundary.index + boundary[0].length);
          const result = eventResult(event);
          if (result) {
            await reader.cancel();
            return result;
          }
        }
      }
      if (done) break;
    }
    if (id === undefined) return undefined; // Notifications can acknowledge with plain-text Accepted.
    const result = sse ? eventResult(text) : rpc(text, id);
    if (!result) throw new AgentError('protocol');
    return result;
  } finally {
    reader.releaseLock();
  }
}

export async function askMcp({
  endpoint, token, question, fetcher = fetch, timeoutMs = 230_000,
}: {
  endpoint: string; token: string; question: string;
  fetcher?: typeof fetch; timeoutMs?: number;
}): Promise<{ answer: string; truncated: boolean }> {
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
    throw new AgentError('invalid_question');
  }
  const url = new URL(endpoint);
  if (url.origin !== 'https://api.fabric.microsoft.com' ||
      !/^\/v1\/mcp\/workspaces\/[0-9a-f-]{36}\/dataagents\/[0-9a-f-]{36}\/agent$/i.test(url.pathname) ||
      url.search || url.hash || url.username || url.password || !token) {
    throw new AgentError('configuration');
  }
  const signal = AbortSignal.timeout(timeoutMs);
  let sessionId: string | null = null;
  let protocolVersion = PROTOCOL_VERSION;
  const post = async (method: string, params?: JsonObject, id?: number) => {
    const response = await fetcher(endpoint, {
      method: 'POST', redirect: 'error', signal,
      headers: {
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', 'MCP-Protocol-Version': protocolVersion,
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, ...(params ? { params } : {}) }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AgentError('permission');
      if (response.status === 404) throw new AgentError('configuration');
      if (response.status === 408 || response.status === 504) throw new AgentError('timeout');
      throw new AgentError('unavailable');
    }
    sessionId = response.headers.get('mcp-session-id') ?? sessionId;
    return readResult(response, id);
  };
  try {
    const initialized = await post('initialize', {
      protocolVersion: PROTOCOL_VERSION, capabilities: {},
      clientInfo: { name: 'synthetic-texas-fleet', version: '1.0.0' },
    }, 1);
    if (initialized?.protocolVersion !== PROTOCOL_VERSION && initialized?.protocolVersion !== '2025-03-26') {
      throw new AgentError('protocol');
    }
    protocolVersion = initialized.protocolVersion;
    await post('notifications/initialized');
    const listed = await post('tools/list', {}, 2);
    const tools = listed?.tools;
    if (!Array.isArray(tools) || tools.length !== 1 || !object(tools[0])) throw new AgentError('protocol');
    const tool = tools[0];
    if (typeof tool.name !== 'string' || !object(tool.inputSchema) || !object(tool.inputSchema.properties)) {
      throw new AgentError('protocol');
    }
    const properties = Object.entries(tool.inputSchema.properties);
    const candidates = properties.filter(([, value]) => object(value) && value.type === 'string');
    if (candidates.length !== 1 || properties.length !== 1) throw new AgentError('protocol');
    const result = await post('tools/call', { name: tool.name, arguments: { [candidates[0][0]]: question.trim() } }, 3);
    if (result?.isError === true) throw new AgentError('unavailable');
    if (!Array.isArray(result?.content)) throw new AgentError('protocol');
    const text = result.content.flatMap((part: unknown) =>
      object(part) && part.type === 'text' && typeof part.text === 'string' ? [part.text] : []).join('\n\n').trim();
    if (!text) throw new AgentError('empty_answer');
    return { answer: text.slice(0, MAX_ANSWER_LENGTH), truncated: text.length > MAX_ANSWER_LENGTH };
  } catch (error: unknown) {
    if (signal.aborted) throw new AgentError('timeout');
    if (error instanceof AgentError) throw error;
    throw new AgentError('unavailable');
  }
}
