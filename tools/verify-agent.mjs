import assert from 'node:assert/strict';
import { accessToken, assertTarget, target } from './fabric.mjs';
import { askMcp } from '../packages/functions/dist/mcp.js';
import { FLEET_AGENT_QUESTIONS } from '../packages/shared/dist/index.js';

await assertTarget();
const index = Number(process.argv[2] ?? 0);
assert.ok(Number.isInteger(index) && index >= 0 && index < FLEET_AGENT_QUESTIONS.length, 'Choose a golden-question index from 0 to 6.');
const expected = [[19], [9], [], [], [], [], [38]][index];
const started = Date.now();
const result = await askMcp({
  endpoint: `https://api.fabric.microsoft.com/v1/mcp/workspaces/${target.workspaceId}/dataagents/${target.dataAgentId}/agent`,
  token: accessToken(), question: FLEET_AGENT_QUESTIONS[index],
  fetcher: async (url, init) => {
    const method = JSON.parse(init.body).method;
    const response = await fetch(url, init);
    console.log(`MCP ${method}: HTTP ${response.status}`);
    return response;
  },
});
for (const value of expected) assert.ok(new RegExp(`\\b${value}\\b`).test(result.answer),
  `Golden question ${index}: expected numeric evidence ${value} not present. Inspect the answer in the app.`);
console.log(JSON.stringify({ goldenQuestion: index, elapsedMs: Date.now() - started,
  answerCharacters: result.answer.length, truncated: result.truncated, expectedNumbersPresent: expected,
  note: 'Numeric checks do not prove semantic accuracy; review the real answer in the app.' }));
