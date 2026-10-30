import { beforeEach, expect, it, vi } from 'vitest';
import { askFleetAgent } from '@/services/agent.service';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/lib/rayfin-client', () => ({
  getRayfinClient: vi.fn(async () => ({ functions: { askFabricDataAgent: { invoke } } })),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
it('uses the generated function client and a per-call timeout, not a global override', async () => {
  invoke.mockResolvedValue({ kind: 'answer', answer: 'Real service value' });
  expect(await askFleetAgent('Active alerts?')).toEqual({ kind: 'answer', answer: 'Real service value' });
  expect(invoke).toHaveBeenCalledWith({ question: 'Active alerts?' }, { timeoutMs: 245000 });
});
it('correlates an answer without logging its question or answer', async () => {
  const requestId = 'a1111111-1111-4111-8111-111111111111';
  const value = { kind: 'answer', answer: 'Private generated answer', requestId, elapsedMs: 100, truncated: false };
  invoke.mockResolvedValue(value);
  expect(await askFleetAgent('Private operator question')).toBe(value);
  expect(JSON.parse(String(vi.mocked(console.info).mock.calls.at(-1)?.[1])))
    .toMatchObject({ operation: 'agent.ask', outcome: 'success', serverRequestId: requestId });
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('Private');
});
it('records a typed returned failure as failure, not a successful transport', async () => {
  const value = { kind: 'failure', code: 'permission', message: 'Private provider body', retryable: false };
  invoke.mockResolvedValue(value);
  expect(await askFleetAgent('Private question')).toBe(value);
  expect(JSON.parse(String(vi.mocked(console.warn).mock.calls.at(-1)?.[1])))
    .toMatchObject({ operation: 'agent.ask', outcome: 'failure', code: 'permission' });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('Private');
});
it('never forwards an unrecognized provider code or reference into diagnostics', async () => {
  invoke.mockResolvedValue({ kind: 'failure', code: 'Bearer credential', requestId: 'private@example.com' });
  await askFleetAgent('Private question');
  const complete = JSON.parse(String(vi.mocked(console.warn).mock.calls.at(-1)?.[1]));
  expect(complete).toMatchObject({ operation: 'agent.ask', outcome: 'failure' });
  expect(complete).not.toHaveProperty('code');
  expect(complete).not.toHaveProperty('serverRequestId');
  expect(JSON.stringify(complete)).not.toMatch(/Bearer|example\.com/);
});
it('preserves a rejected invocation error identity without logging its message', async () => {
  const error = new Error('Private provider error body');
  invoke.mockRejectedValue(error);
  await expect(askFleetAgent('Private question')).rejects.toBe(error);
  expect(JSON.parse(String(vi.mocked(console.warn).mock.calls.at(-1)?.[1])))
    .toMatchObject({ operation: 'agent.ask', outcome: 'failure', code: 'request_failed' });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('Private');
});
