import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentError, askMcp, MAX_ANSWER_LENGTH } from '../../packages/functions/dist/mcp.js';

const endpoint = 'https://api.fabric.microsoft.com/v1/mcp/workspaces/00000000-0000-4000-8000-000000000002/dataagents/00000000-0000-4000-8000-000000000009/agent';
function harness(overrides = {}) {
  const calls = [];
  const fetcher = async (_url, init) => {
    const call = JSON.parse(init.body);
    calls.push({ ...call, headers: init.headers, redirect: init.redirect });
    if (overrides[call.method]) return overrides[call.method](call);
    const result = {
      initialize: { protocolVersion: '2025-03-26' },
      'tools/list': { tools: [{ name: 'query_fleet', inputSchema: { properties: { question: { type: 'string' } } } }] },
      'tools/call': { content: [{ type: 'text', text: 'Source-backed test answer' }] },
    }[call.method];
    return call.id ? Response.json({ jsonrpc: '2.0', id: call.id, result }) : new Response('Accepted', { status: 202 });
  };
  return { calls, fetcher };
}
const run = (options = {}) => askMcp({ endpoint, token: 'test-token', question: 'Active alerts?', ...options });
const fails = (code) => (error) => error instanceof AgentError && error.code === code;

test('discovers the advertised tool, accepts text acknowledgement and optional session', async () => {
  const { calls, fetcher } = harness();
  assert.deepEqual(await run({ fetcher }), { answer: 'Source-backed test answer', truncated: false });
  assert.deepEqual(calls.map((call) => call.method), ['initialize', 'notifications/initialized', 'tools/list', 'tools/call']);
  assert.equal(calls[3].params.name, 'query_fleet');
  assert.deepEqual(calls[3].params.arguments, { question: 'Active alerts?' });
  assert.equal(calls[3].redirect, 'error');
  assert.equal(calls[3].headers['Mcp-Session-Id'], undefined);
});
test('forwards a session only when provided', async () => {
  const { calls, fetcher } = harness({
    initialize: (call) => Response.json({ jsonrpc: '2.0', id: call.id, result: { protocolVersion: '2025-03-26' } },
      { headers: { 'Mcp-Session-Id': 'example-session' } }),
  });
  await run({ fetcher });
  assert.equal(calls[1].headers['Mcp-Session-Id'], 'example-session');
});
test('handles SSE comments, progress, CRLF and multi-line response data', async () => {
  const { fetcher } = harness({
    'tools/call': () => new Response(': heartbeat\r\n\r\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\r\n\r\ndata: {"jsonrpc":"2.0","id":3,\r\ndata: "result":{"content":[{"type":"text","text":"19 affected vehicles"}]}}\r\n\r\n',
      { headers: { 'Content-Type': 'text/event-stream' } }),
  });
  assert.equal((await run({ fetcher })).answer, '19 affected vehicles');
});
for (const [status, code] of [[401, 'permission'], [403, 'permission'], [404, 'configuration'], [429, 'unavailable'], [503, 'unavailable'], [504, 'timeout']]) {
  test(`sanitizes HTTP ${status}`, async () => {
    await assert.rejects(run({ fetcher: async () => new Response('private provider details', { status }) }), fails(code));
  });
}
for (const [name, result, code] of [
  ['empty', { content: [] }, 'empty_answer'],
  ['tool failure', { isError: true, content: [{ type: 'text', text: 'provider detail' }] }, 'unavailable'],
  ['missing content', {}, 'protocol'],
]) {
  test(`handles ${name} without fabricated answers`, async () => {
    const { fetcher } = harness({ 'tools/call': (call) => Response.json({ jsonrpc: '2.0', id: call.id, result }) });
    await assert.rejects(run({ fetcher }), fails(code));
  });
}
test('rejects malformed or mismatched JSON-RPC', async () => {
  for (const body of ['not json', '{"jsonrpc":"2.0","id":99,"result":{}}', '{"id":1,"result":{}}', '{"jsonrpc":"2.0","id":1,"error":{}}']) {
    await assert.rejects(run({ fetcher: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) }), fails('protocol'));
  }
});
test('rejects ambiguous tools and argument schemas', async () => {
  for (const tools of [[], [{ name: 'x', inputSchema: { properties: {} } }], [{}, {}]]) {
    const { fetcher } = harness({ 'tools/list': (call) => Response.json({ jsonrpc: '2.0', id: call.id, result: { tools } }) });
    await assert.rejects(run({ fetcher }), fails('protocol'));
  }
});
test('bounds input and keeps invalid input off the network', async () => {
  for (const question of ['', ' ', 'x'.repeat(2001), null]) {
    await assert.rejects(run({ question, fetcher: () => assert.fail('must not fetch') }), fails('invalid_question'));
  }
});
test('bounds response bytes and explicitly marks clipped answers', async () => {
  const { fetcher } = harness({ 'tools/call': (call) => Response.json({ jsonrpc: '2.0', id: call.id,
    result: { content: [{ type: 'text', text: 'a'.repeat(MAX_ANSWER_LENGTH + 1) }] } }) });
  const result = await run({ fetcher });
  assert.equal(result.answer.length, MAX_ANSWER_LENGTH);
  assert.equal(result.truncated, true);
  await assert.rejects(run({ fetcher: async () => new Response('a'.repeat(256001), { headers: { 'Content-Type': 'application/json' } }) }), fails('protocol'));
});
test('prevents bearer redirects and unapproved origins', async () => {
  await assert.rejects(run({ endpoint: endpoint.replace('api.fabric.microsoft.com', 'example.com'),
    fetcher: () => assert.fail('must not fetch') }), fails('configuration'));
});
test('outbound deadline terminates the exchange', async () => {
  await assert.rejects(run({ timeoutMs: 10, fetcher: async (_url, { signal }) => {
    await new Promise((resolve, reject) => {
      const keepAlive = setTimeout(resolve, 1000);
      signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
    });
    return new Response();
  } }), fails('timeout'));
});
