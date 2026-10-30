import { describe, expect, it, vi } from 'vitest';
import { fleetFixture, makeVehicle } from '@/test/fleet-fixture';
import { activeAlerts, centralDate, centralTime, EMPTY_FILTERS, filterVehicles, isStale, reportAge, summarizeFleet } from './fleet';

describe('fleet presentation model', () => {
  it('distinguishes alert count from distinct affected vehicles and excludes resolved alerts', () => {
    const fleet = fleetFixture();
    expect(summarizeFleet(fleet, fleet.vehicles)).toEqual({
      total: 4, moving: 2, delayed: 1, stale: 1, alerts: 2, affected: 1, critical: 1,
    });
    expect(activeAlerts(fleet)).toHaveLength(2);
  });
  it('scopes every metric to the filtered vehicles', () => {
    const fleet = fleetFixture();
    const vehicles = filterVehicles(fleet, { ...EMPTY_FILTERS, region: 'dfw' });
    expect(summarizeFleet(fleet, vehicles)).toMatchObject({ total: 2, alerts: 0, affected: 0, delayed: 0, stale: 0 });
  });
  it.each([
    ['alerts', ['vehicle-1']],
    ['delayed', ['vehicle-1']],
    ['stale', ['vehicle-2']],
  ])('filters by %s', (attention, expected) => {
    expect(filterVehicles(fleetFixture(), { ...EMPTY_FILTERS, attention }).map(({ id }) => id)).toEqual(expected);
  });
  it('combines region, status and case-insensitive trimmed search', () => {
    expect(filterVehicles(fleetFixture(), { region: 'dfw', status: 'en_route', attention: 'all', search: '  finCH  ' })
      .map(({ id }) => id)).toEqual(['vehicle-3']);
  });
  it('does not silently replace empty filter results', () => {
    expect(filterVehicles(fleetFixture(), { ...EMPTY_FILTERS, search: 'no-such-truck' })).toEqual([]);
  });
  it('calculates report age from the scenario clock even when wall time differs', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
      const clock = fleetFixture().clock.asOf;
      expect(reportAge(makeVehicle({ lastTelemetryAt: new Date('2026-10-27T14:45:00.000Z') }), clock)).toBe(15);
      expect(filterVehicles(fleetFixture(), { ...EMPTY_FILTERS, attention: 'stale' })).toHaveLength(1);
    } finally { vi.useRealTimers(); }
  });
  it.each([
    ['2026-10-27T14:45:00.001Z', false],
    ['2026-10-27T14:45:00.000Z', false],
    ['2026-10-27T14:44:59.999Z', true],
    ['2026-10-27T14:44:30.000Z', true],
    ['2026-10-27T14:44:00.000Z', true],
  ])('uses the precise greater-than-15-minute threshold for %s', (lastTelemetryAt, stale) => {
    const fleet = fleetFixture();
    fleet.vehicles = [makeVehicle({ lastTelemetryAt: new Date(lastTelemetryAt) })];
    expect(isStale(fleet.vehicles[0], fleet.clock.asOf)).toBe(stale);
    expect(summarizeFleet(fleet, fleet.vehicles).stale).toBe(Number(stale));
    expect(filterVehicles(fleet, { ...EMPTY_FILTERS, attention: 'stale' })).toHaveLength(Number(stale));
  });
  it('formats dates explicitly in Texas Central time', () => {
    expect(centralTime(fleetFixture().clock.asOf)).toBe('10:00 AM CDT');
    expect(centralDate(fleetFixture().clock.asOf)).toBe('Oct 27, 2026');
  });
});
