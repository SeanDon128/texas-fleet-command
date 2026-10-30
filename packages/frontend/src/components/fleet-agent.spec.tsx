import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FleetAgent } from '@/components/fleet-agent';
import { askFleetAgent } from '@/services/agent.service';
import { FLEET_AGENT_QUESTIONS, type DataAgentResult } from '@rayfin-app/shared';

vi.mock('@/services/agent.service', () => ({ askFleetAgent: vi.fn() }));
const asOf = new Date('2026-10-27T15:00:00Z');
const answer: DataAgentResult = { kind: 'answer', answer: '19 synthetic vehicles have active alerts.',
  truncated: false, elapsedMs: 1200, requestId: 'test-reference' };
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Ask Fabric Data Agent' }));

describe('fleet Data Agent panel', () => {
  beforeEach(() => {
    vi.mocked(askFleetAgent).mockReset();
    vi.mocked(askFleetAgent).mockResolvedValue(answer);
  });
  it('discloses synthetic scope, scenario time and independent filters without a canned answer', () => {
    render(<FleetAgent asOf={asOf} />);
    expect(screen.getByText(/independent of map filters/)).toBeVisible();
    expect(screen.getByText(/10:00 AM CDT/)).toBeVisible();
    expect(screen.queryByTestId('agent-answer')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ask Fabric Data Agent' })).toBeDisabled();
    expect(screen.getByLabelText('Your fleet question')).toHaveAttribute('maxlength', '2000');
  });
  it('runs a golden question and renders the actual result as text, not HTML', async () => {
    vi.mocked(askFleetAgent).mockResolvedValue({ ...answer, answer: '<img src=x onerror=alert(1)> 19 vehicles' });
    render(<FleetAgent asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] }));
    expect(askFleetAgent).toHaveBeenCalledWith(FLEET_AGENT_QUESTIONS[0]);
    expect(await screen.findByTestId('agent-answer')).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(screen.getByTestId('agent-answer').querySelector('img')).toBeNull();
    expect(screen.getByText(/cannot send alerts or change records/)).toBeVisible();
  });
  it('keeps only one bounded invocation active and clears the old answer while waiting', async () => {
    render(<FleetAgent asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] }));
    await screen.findByTestId('agent-answer');
    let done!: (value: DataAgentResult) => void;
    vi.mocked(askFleetAgent).mockReturnValueOnce(new Promise((resolve) => { done = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[1] }));
    expect(screen.getByRole('status')).toHaveTextContent('about four minutes');
    expect(screen.queryByTestId('agent-answer')).toBeNull();
    expect(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] })).toBeDisabled();
    submit();
    expect(askFleetAgent).toHaveBeenCalledTimes(2);
    await act(async () => done(answer));
    expect(await screen.findByTestId('agent-answer')).toBeVisible();
  });
  it('surfaces permission failures without retry loops or a success-shaped fallback', async () => {
    vi.mocked(askFleetAgent).mockResolvedValue({ kind: 'failure', code: 'permission',
      message: 'Check the app identity permission.', retryable: false, requestId: 'permission-reference', elapsedMs: 30 });
    render(<FleetAgent asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the app identity permission.');
    expect(screen.getByRole('alert')).toHaveTextContent('permission-reference');
    expect(screen.queryByRole('button', { name: 'Retry question' })).toBeNull();
    expect(screen.queryByTestId('agent-answer')).toBeNull();
  });
  it('offers an explicit retry for a safe transient failure', async () => {
    vi.mocked(askFleetAgent).mockResolvedValueOnce({ kind: 'failure', code: 'timeout',
      message: 'Try a narrower question.', retryable: true, requestId: 'timeout-reference', elapsedMs: 230000 });
    render(<FleetAgent asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry question' }));
    expect(await screen.findByTestId('agent-answer')).toHaveTextContent('19 synthetic vehicles');
    expect(askFleetAgent).toHaveBeenCalledTimes(2);
  });
  it('sanitizes thrown invocation errors and allows recovery', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(askFleetAgent).mockRejectedValueOnce(new Error('private upstream details'));
    render(<FleetAgent asOf={asOf} />);
    fireEvent.change(screen.getByLabelText('Your fleet question'), { target: { value: '  Active alerts?  ' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your app session');
    expect(screen.queryByText(/private upstream/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry question' }));
    await screen.findByTestId('agent-answer');
    expect(askFleetAgent).toHaveBeenLastCalledWith('Active alerts?');
  });
  it('explicitly discloses answer truncation', async () => {
    vi.mocked(askFleetAgent).mockResolvedValue({ ...answer, truncated: true });
    render(<FleetAgent asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: FLEET_AGENT_QUESTIONS[0] }));
    await screen.findByTestId('agent-answer');
    expect(screen.getByRole('status')).toHaveTextContent('shortened to 20,000 characters');
  });
});
