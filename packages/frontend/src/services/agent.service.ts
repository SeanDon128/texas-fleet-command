import type { DataAgentResult } from '@rayfin-app/shared';
import { getRayfinClient } from '@/lib/rayfin-client';
import { observeOperation } from '@/lib/observability';

export function askFleetAgent(question: string): Promise<DataAgentResult> {
  return observeOperation('agent.ask', async () => {
    const client = await getRayfinClient();
    return client.functions.askFabricDataAgent.invoke({ question }, { timeoutMs: 245_000 });
  }, (result) => result.kind === 'answer'
    ? { outcome: 'success', serverRequestId: result.requestId }
    : { outcome: 'failure', code: result.code, serverRequestId: result.requestId });
}
