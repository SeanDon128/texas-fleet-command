import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FleetMap from './fleet-map';
import { fleetFixture } from '@/test/fleet-fixture';

describe('Leaflet vehicle markers', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function renderMap() {
    const fleet = fleetFixture();
    const onSelect = vi.fn();
    render(<FleetMap vehicles={fleet.vehicles} regions={fleet.regions} reset={0} onSelect={onSelect} />);
    return onSelect;
  }

  it('renders every vehicle with an accessible status label and click selection', () => {
    const onSelect = renderMap();
    for (const vehicle of fleetFixture().vehicles) {
      expect(screen.getByTitle(new RegExp(`^${vehicle.vehicleCode}:`))).toHaveAttribute('tabindex', '0');
    }
    fireEvent.click(screen.getByRole('button', { name: 'TX-HOU-001: En route' }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('vehicle-1');
  });

  it.each(['Enter', ' '])('selects a focused vehicle with %s', (key) => {
    const onSelect = renderMap();
    const marker = screen.getByRole('button', { name: 'TX-HOU-001: En route' });
    marker.focus();
    expect(marker).toHaveFocus();
    const allowDefault = fireEvent.keyDown(marker, { key });
    expect(allowDefault).toBe(false);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('vehicle-1');
  });

  it('does not select a vehicle when using navigation keys', () => {
    const onSelect = renderMap();
    fireEvent.keyDown(screen.getByRole('button', { name: 'TX-HOU-001: En route' }), { key: 'ArrowRight' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
