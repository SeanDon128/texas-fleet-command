import type { DataAgentFailureCode } from '@rayfin-app/shared';

type Operation = 'fleet.load' | 'alerts.load' | 'alerts.context' | 'agent.ask' |
  'alert.create' | 'alert.acknowledge' | 'alert.resolve' | 'alert.repair';
type DiagnosticCode = DataAgentFailureCode | 'request_failed' | 'timeline_incomplete';
interface Outcome {
  outcome: 'success' | 'failure' | 'partial';
  code?: DiagnosticCode;
  serverRequestId?: string;
}

const codes = new Set<DiagnosticCode>([
  'invalid_question', 'configuration', 'permission', 'unavailable', 'timeout',
  'protocol', 'empty_answer', 'unexpected', 'request_failed', 'timeline_incomplete',
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function observeOperation<T>(
  operation: Operation,
  work: () => Promise<T>,
  classify: (value: T) => Outcome = () => ({ outcome: 'success' }),
): Promise<T> {
  const operationId = crypto.randomUUID();
  const started = performance.now();
  const base = { schemaVersion: 1, source: 'browser', operation, operationId };
  console.info('[fleet-observability]', JSON.stringify({
    ...base, event: 'operation.started', at: new Date().toISOString(),
  }));
  const finish = (result: Outcome) => {
    const record = {
      ...base, event: 'operation.completed', at: new Date().toISOString(),
      elapsedMs: Math.max(0, Math.round(performance.now() - started)),
      outcome: result.outcome,
      ...(result.code && codes.has(result.code) ? { code: result.code } : {}),
      ...(typeof result.serverRequestId === 'string' && uuid.test(result.serverRequestId)
        ? { serverRequestId: result.serverRequestId } : {}),
    };
    const log = result.outcome === 'success' ? console.info : console.warn;
    log('[fleet-observability]', JSON.stringify(record));
  };
  try {
    const value = await work();
    finish(classify(value));
    return value;
  } catch (error: unknown) {
    finish({ outcome: 'failure', code: 'request_failed' });
    throw error;
  }
}
