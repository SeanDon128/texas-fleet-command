import type { VehicleRecord } from '@rayfin-app/shared';
import type { FleetSnapshot } from '@/services/fleet.service';

const asOf = new Date('2026-10-27T15:00:00.000Z');

export function makeVehicle(overrides: Partial<VehicleRecord> = {}): VehicleRecord {
  return {
    id: 'vehicle-1', isSynthetic: true, vehicleCode: 'TX-HOU-001', callSign: 'Test Heron',
    type: 'van', region_id: 'hou', crew_id: 'crew-1', status: 'en_route',
    healthStatus: 'ok', lat: 29.76, lng: -95.36, headingDeg: 90, speedMph: 35,
    energyType: 'diesel', energyPct: 70, lastTelemetryAt: new Date(asOf),
    minutesSinceReport: 0, delayStatus: 'delayed', delayMinutes: 38, unit: 1,
    ...overrides,
  };
}

export function fleetFixture(): FleetSnapshot {
  const vehicles = [
    makeVehicle(),
    makeVehicle({ id: 'vehicle-2', vehicleCode: 'TX-HOU-002', callSign: 'Test Kestrel', status: 'offline',
      lastTelemetryAt: new Date('2026-10-27T14:40:00.000Z'), minutesSinceReport: 20,
      delayStatus: 'not_applicable', delayMinutes: 0 }),
    makeVehicle({ id: 'vehicle-3', vehicleCode: 'TX-DFW-001', callSign: 'Test Finch', region_id: 'dfw', delayStatus: 'on_time', delayMinutes: 0 }),
    makeVehicle({ id: 'vehicle-4', vehicleCode: 'TX-DFW-002', callSign: 'Test Wren', region_id: 'dfw', status: 'idle',
      delayStatus: 'not_applicable', delayMinutes: 0 }),
  ];
  return {
    vehicles,
    regions: [
      { id: 'hou', isSynthetic: true, code: 'HOU', name: 'Houston', hubName: 'Fictional Houston', centerLat: 29.76, centerLng: -95.36, zoom: 8 },
      { id: 'dfw', isSynthetic: true, code: 'DFW', name: 'Dallas / Fort Worth', hubName: 'Fictional DFW', centerLat: 32.77, centerLng: -96.8, zoom: 8 },
    ],
    crews: [{ id: 'crew-1', isSynthetic: true, crewCode: 'CREW-TEST', leadFirstName: 'Test Lead' }],
    clock: { id: 'clock', isSynthetic: true, asOf: new Date(asOf), scenarioName: 'Unit-test fixture', speed: 1 },
    assignments: vehicles.map((vehicle) => ({
      id: `assignment-${vehicle.id}`, isSynthetic: true, vehicle_id: vehicle.id, originRegion_id: vehicle.region_id,
      routeCode: 'TEST-ROUTE', destinationName: 'Fictional destination',
      destLat: 30, destLng: -96, scheduledArrival: new Date('2026-10-27T16:00:00.000Z'),
      estimatedArrival: new Date('2026-10-27T16:38:00.000Z'), delayMinutes: 38, status: 'active', isCurrent: true,
    })),
    alerts: [
      { id: 'alert-1', isSynthetic: true, vehicle_id: 'vehicle-1', region_id: 'hou', type: 'delay',
        severity: 'critical', status: 'open', message: 'Test-only fabricated delay alert.', createdAt: new Date(asOf),
        createdBySub: 'synthetic', assignedTo_id: 'fictional-member', source: 'simulation' },
      { id: 'alert-2', isSynthetic: true, vehicle_id: 'vehicle-1', region_id: 'hou', type: 'health',
        severity: 'warning', status: 'acknowledged', message: 'Test-only fabricated health alert.', createdAt: new Date(asOf),
        createdBySub: 'synthetic', assignedTo_id: 'fictional-member', source: 'simulation' },
      { id: 'alert-3', isSynthetic: true, vehicle_id: 'vehicle-3', region_id: 'dfw', type: 'operations',
        severity: 'info', status: 'resolved', message: 'Test-only resolved alert.', createdAt: new Date(asOf),
        createdBySub: 'synthetic', assignedTo_id: 'fictional-member', source: 'simulation' },
    ],
  };
}
