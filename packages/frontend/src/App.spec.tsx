import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { loadFleet } from '@/services/fleet.service';
import { saveAlertAction } from '@/services/alerts.service';
import { fleetFixture } from '@/test/fleet-fixture';

vi.mock('@/services/fleet.service', () => ({ loadFleet: vi.fn() }));
vi.mock('@/services/alerts.service', () => ({
  loadAlertContext: vi.fn(async () => ({ members: [], events: [] })),
  missingTimelineEvents: vi.fn(async () => 0),
  saveAlertAction: vi.fn(),
}));
vi.mock('@/components/fleet-map', () => ({
  default: ({ vehicles, onSelect }: { vehicles: { id: string; vehicleCode: string }[]; onSelect: (id: string) => void }) =>
    <div aria-label="Texas fleet map">
      {vehicles.map((vehicle) => <button key={vehicle.id} onClick={() => onSelect(vehicle.id)}>{`Marker ${vehicle.vehicleCode}`}</button>)}
    </div>,
}));

describe('fleet application', () => {
  beforeEach(() => {
    vi.mocked(loadFleet).mockReset();
    vi.mocked(loadFleet).mockResolvedValue(fleetFixture());
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  it('shows loading without invented metrics, then renders the source snapshot', async () => {
    let resolve!: (value: ReturnType<typeof fleetFixture>) => void;
    vi.mocked(loadFleet).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<App />);
    expect(screen.getByText('Connecting the Texas fleet')).toBeVisible();
    expect(screen.queryByText('Vehicles in view')).toBeNull();
    await act(async () => resolve(fleetFixture()));
    expect(await screen.findByText('4 of 4 vehicles shown')).toBeVisible();
    expect(within(screen.getByRole('banner')).getByText(/10:00 AM CDT/)).toBeVisible();
    expect(screen.getByText(/Zava Security is a fictional company/)).toBeVisible();
    expect(document.body.textContent).not.toMatch(new RegExp(['bri', 'nk'].join(''), 'i'));
  });
  it('investigates the actual leading delay region and resets to all vehicles', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Investigate HOU' }));
    expect(screen.getByText('1 of 4 vehicles shown')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('4 of 4 vehicles shown')).toBeVisible();
  });
  it('places Ask the fleet between the map and inbox and retains its draft during vehicle selection', async () => {
    render(<App />);
    const map = await screen.findByRole('region', { name: 'Fleet map and vehicle roster' });
    const agent = screen.getByRole('region', { name: 'Ask the fleet' });
    const inbox = screen.getByRole('region', { name: 'Shared alert inbox' });
    expect(map.compareDocumentPosition(agent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(agent.compareDocumentPosition(inbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const question = within(agent).getByRole('textbox', { name: 'Your fleet question' });
    fireEvent.change(question, { target: { value: 'Which vehicles need attention?' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Marker TX-HOU-001' }));
    expect(question).toHaveValue('Which vehicles need attention?');
    expect(screen.getByRole('region', { name: 'Vehicle details for TX-HOU-001' })).toBeVisible();
  });
  it('selects from map or roster and displays assignment and active alerts', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marker TX-HOU-001' }));
    const detail = screen.getByRole('region', { name: 'Vehicle details for TX-HOU-001' });
    expect(within(detail).getByText('38 min delayed')).toBeVisible();
    expect(within(detail).getByText('Fictional destination')).toBeVisible();
    expect(within(detail).getByText('Active alerts (2)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close vehicle details' }));
    expect(screen.queryByRole('region', { name: /Vehicle details/ })).toBeNull();
    fireEvent.click(within(screen.getByRole('region', { name: 'Vehicle roster' })).getByRole('button', { name: /TX-DFW-001/ }));
    expect(screen.getByRole('region', { name: 'Vehicle details for TX-DFW-001' })).toBeVisible();
    expect(screen.getByText('No active alerts for this vehicle.')).toBeVisible();
  });
  it('clears selected details when filtering and exposes empty results honestly', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marker TX-HOU-001' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Find a vehicle' }), { target: { value: 'absent' } });
    expect(screen.getByText('0 of 4 vehicles shown')).toBeVisible();
    expect(screen.queryByRole('region', { name: /Vehicle details/ })).toBeNull();
    expect(screen.getByText(/No vehicles match/)).toBeVisible();
  });
  it('provides actionable error recovery without showing substitute data', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadFleet).mockRejectedValueOnce(new Error('Permission denied / private provider detail')).mockResolvedValueOnce(fleetFixture());
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Fleet data is unavailable');
    expect(screen.queryByText('Vehicles in view')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry fleet data' }));
    expect(await screen.findByText('4 of 4 vehicles shown')).toBeVisible();
    expect(loadFleet).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(log.mock.calls)).not.toContain('private provider detail');
  });
  it('does not show stale metrics while reloading a snapshot', async () => {
    render(<App />);
    await screen.findByText('4 of 4 vehicles shown');
    vi.mocked(loadFleet).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Reload Fabric data' }));
    expect(screen.getByText('Connecting the Texas fleet')).toBeVisible();
    expect(screen.queryByText('Vehicles in view')).toBeNull();
  });
  it('renders an empty source separately from an error', async () => {
    vi.mocked(loadFleet).mockResolvedValue({ ...fleetFixture(), vehicles: [] });
    render(<App />);
    expect(await screen.findByText(/No vehicles are stored/)).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('updates the operating picture from a saved alert without losing the map selection', async () => {
    const fleet = fleetFixture();
    vi.mocked(saveAlertAction).mockResolvedValue({
      alert: { ...fleet.alerts[0], id: 'new-alert', source: 'operator' }, events: [], timelineComplete: true,
    });
    const { loadAlertContext } = await import('@/services/alerts.service');
    vi.mocked(loadAlertContext).mockResolvedValueOnce({ members: [{
      id: 'fictional-member', isSynthetic: true, displayName: 'Demo Harbor', role: 'Dispatcher', region_id: 'hou',
    }], events: [] });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marker TX-HOU-001' }));
    await screen.findByRole('textbox', { name: 'Synthetic operational message' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Fictional recipient' }), { target: { value: 'fictional-member' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Synthetic operational message' }), { target: { value: 'A new synthetic alert.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create in-app alert' }));
    await screen.findByText(/Alert saved as open/);
    const detail = screen.getByRole('region', { name: 'Vehicle details for TX-HOU-001' });
    expect(within(detail).getByText('Active alerts (3)')).toBeVisible();
    const metrics = screen.getByRole('region', { name: 'Operational summary for filtered vehicles' });
    expect(within(metrics).getByText('1 vehicles / 2 critical alerts')).toBeVisible();
    expect(screen.getByText('4 of 4 vehicles shown')).toBeVisible();
  });
});
