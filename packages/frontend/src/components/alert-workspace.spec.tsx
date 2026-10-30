import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertRecord } from '@rayfin-app/shared';
import { AlertWorkspace } from './alert-workspace';
import { loadAlertContext, missingTimelineEvents, saveAlertAction, type AlertSaveResult } from '@/services/alerts.service';
import { loadAlerts } from '@/services/fleet.service';
import { fleetFixture } from '@/test/fleet-fixture';

vi.mock('@/services/alerts.service', () => ({
  loadAlertContext: vi.fn(), missingTimelineEvents: vi.fn(), saveAlertAction: vi.fn(),
}));
vi.mock('@/services/fleet.service', async (original) => ({
  ...await original<typeof import('@/services/fleet.service')>(), loadAlerts: vi.fn(),
}));
const members = [{ id: 'fictional-member', isSynthetic: true, displayName: 'Demo Harbor', role: 'Dispatcher', region_id: 'hou' }];
const onSave = vi.fn();
const onRefresh = vi.fn();
const fixture = () => fleetFixture();
const result = (): AlertSaveResult => ({ alert: { ...fixture().alerts[0], id: 'a1111111-1111-4111-8111-111111111111', source: 'operator' }, events: [], timelineComplete: true });
async function fill() {
  await screen.findByRole('textbox', { name: 'Synthetic operational message' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Fictional recipient' }), { target: { value: 'fictional-member' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Synthetic operational message' }), { target: { value: 'A fabricated workflow check.' } });
}
describe('shared alert inbox', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('a1111111-1111-4111-8111-111111111111');
    vi.mocked(loadAlertContext).mockResolvedValue({ members, events: [] });
    vi.mocked(missingTimelineEvents).mockResolvedValue(0);
    vi.mocked(saveAlertAction).mockResolvedValue(result());
    vi.mocked(loadAlerts).mockResolvedValue(fixture().alerts);
  });
  it('labels fictional recipients and blocks creation until a vehicle is selected', async () => {
    render(<AlertWorkspace fleet={fixture()} onSave={onSave} onRefresh={onRefresh} />);
    expect(await screen.findByText('Select a vehicle on the map or roster to begin.')).toBeVisible();
    await screen.findByRole('textbox', { name: 'Synthetic operational message' });
    expect(screen.getByRole('button', { name: 'Create in-app alert' })).toBeDisabled();
    expect(screen.getByText(/No email, Teams message/)).toBeVisible();
  });
  it('keeps form text on failure and retries the exact same request even after map selection changes', async () => {
    vi.mocked(saveAlertAction).mockRejectedValueOnce(new Error('Offline'));
    const fleet = fixture();
    const { rerender } = render(<AlertWorkspace fleet={fleet} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    await fill();
    fireEvent.click(screen.getByRole('button', { name: 'Create in-app alert' }));
    await screen.findByText(/write could not be confirmed/);
    expect(screen.getByRole('textbox', { name: 'Synthetic operational message' })).toHaveValue('A fabricated workflow check.');
    expect(onSave).not.toHaveBeenCalled();
    const request = vi.mocked(saveAlertAction).mock.calls[0][0];
    rerender(<AlertWorkspace fleet={fleet} vehicle={fleet.vehicles[2]} onSave={onSave} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry same request' }));
    await screen.findByText(/Alert saved as open/);
    expect(vi.mocked(saveAlertAction).mock.calls[1][0]).toEqual(request);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Synthetic operational message' })).toHaveValue('');
  });
  it('prevents double-submit and does not invent a successful record while pending', async () => {
    let done!: (value: AlertSaveResult) => void;
    vi.mocked(saveAlertAction).mockReturnValueOnce(new Promise((resolve) => { done = resolve; }));
    const fleet = fixture();
    render(<AlertWorkspace fleet={fleet} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    await fill();
    fireEvent.submit(screen.getByRole('form', { name: 'Create synthetic alert' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Create synthetic alert' }));
    expect(saveAlertAction).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => done(result()));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it('distinguishes a partial save and clears the draft only after explicit timeline recovery', async () => {
    vi.mocked(saveAlertAction).mockResolvedValueOnce({ ...result(), timelineComplete: false });
    const fleet = fixture();
    render(<AlertWorkspace fleet={fleet} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    await fill();
    fireEvent.click(screen.getByRole('button', { name: 'Create in-app alert' }));
    await screen.findByText(/timeline is incomplete/);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Synthetic operational message' })).toHaveValue('A fabricated workflow check.');
    fireEvent.click(screen.getByRole('button', { name: 'Repair timeline' }));
    await screen.findByText(/Alert saved as open/);
    expect(saveAlertAction).toHaveBeenLastCalledWith({ kind: 'repair', alertId: result().alert.id });
    expect(screen.getByRole('textbox', { name: 'Synthetic operational message' })).toHaveValue('');
  });
  it('offers only the next lifecycle action and keeps resolved history available', async () => {
    const fleet = fixture();
    const { rerender } = render(<AlertWorkspace fleet={fleet} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    const queue = await screen.findByRole('list', { name: 'Alert queue' });
    fireEvent.click(within(queue).getByRole('button', { name: /fabricated delay alert/ }));
    expect(screen.getByRole('button', { name: 'Acknowledge alert' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Resolve alert' })).toBeNull();
    const acknowledged: AlertRecord = { ...fleet.alerts[0], status: 'acknowledged' };
    rerender(<AlertWorkspace fleet={{ ...fleet, alerts: [acknowledged] }} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    expect(await screen.findByRole('button', { name: 'Resolve alert' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Acknowledge alert' })).toBeNull();
    rerender(<AlertWorkspace fleet={{ ...fleet, alerts: [{ ...acknowledged, status: 'resolved' }] }} vehicle={fleet.vehicles[0]} onSave={onSave} onRefresh={onRefresh} />);
    expect(screen.getByRole('region', { name: 'Selected alert timeline' })).toHaveTextContent('resolved');
    expect(screen.queryByRole('button', { name: 'Resolve alert' })).toBeNull();
  });
  it('surfaces context failures without enabling writes and lets the user retry', async () => {
    vi.mocked(loadAlertContext).mockRejectedValueOnce(new Error('Denied'));
    render(<AlertWorkspace fleet={fixture()} onSave={onSave} onRefresh={onRefresh} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Alert actions are disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Alert queue' })).toBeVisible();
  });
  it('refreshes real alerts and reference data together, retaining the previous view on failure', async () => {
    const fleet = fixture();
    vi.mocked(loadAlerts).mockRejectedValueOnce(new Error('Denied'));
    render(<AlertWorkspace fleet={fleet} onSave={onSave} onRefresh={onRefresh} />);
    await screen.findByRole('list', { name: 'Alert queue' });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
    await screen.findByText(/previously loaded inbox is still shown/);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: 'Alert queue' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry inbox refresh' }));
    await screen.findByText(/Inbox refreshed from Fabric SQL/);
    expect(onRefresh).toHaveBeenCalledWith(fleet.alerts);
  });
});
