import { randomUUID } from 'node:crypto';
import { AudienceType, UserDataFunctions, type RayfinContext } from '@microsoft/fabric-user-data-functions';
import type { DataAgentFailureCode, DataAgentResult, UniversalAppSchema } from '@rayfin-app/shared';
import { AgentError, askMcp, MAX_QUESTION_LENGTH } from './mcp.js';

const udf = new UserDataFunctions();
const endpoint = 'https://api.fabric.microsoft.com/v1/mcp/workspaces/00000000-0000-4000-8000-000000000002/dataagents/00000000-0000-4000-8000-000000000009/agent';
const messages: Record<DataAgentFailureCode, string> = {
  invalid_question: 'Enter a fleet question of 1 to 2,000 characters.',
  configuration: 'The published fleet agent is not ready. Check its publication and source configuration.',
  permission: 'The app identity cannot access this agent. Check Fabric Data Agent permissions.',
  unavailable: 'Fabric Data Agent is unavailable. Try again shortly.',
  timeout: 'The agent did not finish within the request limit. Try a narrower question.',
  protocol: 'Fabric returned an unsupported agent response. Check the integration before retrying.',
  empty_answer: 'Fabric returned no answer. Try a more specific fleet question.',
  unexpected: 'The agent request failed unexpectedly. Use the request reference for support.',
};

udf.func(
  'askFabricDataAgent',
  async (
    ctx: RayfinContext<UniversalAppSchema, AudienceType.Fabric>,
    question: string,
  ): Promise<DataAgentResult> => {
    const requestId = randomUUID();
    const started = Date.now();
    try {
      if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
        throw new AgentError('invalid_question');
      }
      let token: string;
      try { token = ctx.Tokens.Fabric; } catch { throw new AgentError('permission'); }
      const answer = await askMcp({ endpoint, token, question });
      const elapsedMs = Date.now() - started;
      console.info(JSON.stringify({ event: 'fleet-agent-completed', requestId, elapsedMs }));
      return { kind: 'answer', ...answer, requestId, elapsedMs };
    } catch (error: unknown) {
      const code = error instanceof AgentError ? error.code : 'unexpected';
      const elapsedMs = Date.now() - started;
      console.warn(JSON.stringify({ event: 'fleet-agent-failed', requestId, code, elapsedMs }));
      return { kind: 'failure', code, message: messages[code], requestId, elapsedMs,
        retryable: ['unavailable', 'timeout', 'empty_answer'].includes(code) };
    }
  },
  []
);
