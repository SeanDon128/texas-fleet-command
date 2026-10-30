import { beforeEach, describe, expect, it, vi } from 'vitest';
import { observeOperation } from './observability';

function records() {
  return [...vi.mocked(console.info).mock.calls, ...vi.mocked(console.warn).mock.calls]
    .map((call) => JSON.parse(String(call[1])) as Record<string, unknown>);
}

describe('content-free operation diagnostics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  it('records a bounded start/completion pair without modifying the result', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(175.4);
    const value = { vehicles: ['not logged'], token: 'not logged' };
    const work = vi.fn(async () => value);
    expect(await observeOperation('fleet.load', work)).toBe(value);
    expect(work).toHaveBeenCalledTimes(1);
    const [start, complete] = records();
    expect(start).toMatchObject({ schemaVersion: 1, source: 'browser', event: 'operation.started', operation: 'fleet.load' });
    expect(complete).toMatchObject({ event: 'operation.completed', operationId: start.operationId, elapsedMs: 75, outcome: 'success' });
    expect(Number.isFinite(Date.parse(String(complete.at)))).toBe(true);
    expect(JSON.stringify(records())).not.toContain('not logged');
    expect(JSON.stringify(complete).length).toBeLessThan(500);
  });
  it('logs a failed transport without including or replacing its thrown error', async () => {
    const error = new Error('Bearer secret / prompt / SQL body / real@example.com');
    await expect(observeOperation('agent.ask', async () => { throw error; })).rejects.toBe(error);
    expect(records().find((record) => record.event === 'operation.completed'))
      .toMatchObject({ outcome: 'failure', code: 'request_failed' });
    expect(JSON.stringify(records())).not.toMatch(/Bearer|secret|prompt|SQL body|example\.com/);
  });
  it('distinguishes partial commit from both success and total failure', async () => {
    const value = { timelineComplete: false, message: 'private alert text' };
    expect(await observeOperation('alert.create', async () => value, () => ({
      outcome: 'partial', code: 'timeline_incomplete',
    }))).toBe(value);
    expect(records().find((record) => record.event === 'operation.completed'))
      .toMatchObject({ outcome: 'partial', code: 'timeline_incomplete' });
    expect(JSON.stringify(records())).not.toContain('private alert text');
  });
  it('records a service-level failure even when HTTP invocation resolves', async () => {
    const reference = 'a1111111-1111-4111-8111-111111111111';
    const result = await observeOperation('agent.ask', async () => ({ kind: 'failure' }), () => ({
      outcome: 'failure', code: 'permission', serverRequestId: reference,
    }));
    expect(result.kind).toBe('failure');
    expect(records().find((record) => record.event === 'operation.completed'))
      .toMatchObject({ outcome: 'failure', code: 'permission', serverRequestId: reference });
  });
  it('projects only allowed fields and omits malformed provider references', async () => {
    const detail = {
      outcome: 'success' as const, serverRequestId: 'secret / unauthorized detail',
      prompt: 'private question', answer: 'private answer', token: 'Bearer credential',
      actor: 'someone@example.com', recordId: 'vehicle-identity', message: 'alert text',
    };
    await observeOperation('agent.ask', async () => ({}), () => detail);
    const complete = records().find((record) => record.event === 'operation.completed');
    expect(complete).not.toHaveProperty('serverRequestId');
    expect(JSON.stringify(records())).not.toMatch(/private|Bearer|unauthorized|example\.com|vehicle-identity|alert text/);
    expect(Object.keys(complete ?? {}).sort()).toEqual([
      'at', 'elapsedMs', 'event', 'operation', 'operationId', 'outcome', 'schemaVersion', 'source',
    ]);
  });
  it('does not imply a hung operation has completed', async () => {
    let done!: (value: number) => void;
    const pending = observeOperation('alerts.load', () => new Promise<number>((resolve) => { done = resolve; }));
    expect(records()).toHaveLength(1);
    expect(records()[0].event).toBe('operation.started');
    done(42);
    expect(await pending).toBe(42);
    expect(records()).toHaveLength(2);
  });
  it('separates overlapping attempts with unique local correlation IDs', async () => {
    await Promise.all([
      observeOperation('alerts.load', async () => 1),
      observeOperation('alerts.load', async () => 2),
    ]);
    const starts = records().filter((record) => record.event === 'operation.started');
    const ends = records().filter((record) => record.event === 'operation.completed');
    expect(new Set(starts.map((record) => record.operationId)).size).toBe(2);
    expect(ends.map((record) => record.operationId).sort()).toEqual(starts.map((record) => record.operationId).sort());
  });
});
