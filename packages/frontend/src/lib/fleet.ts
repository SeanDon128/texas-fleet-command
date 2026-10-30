import type { VehicleRecord, VehicleStatus } from '@rayfin-app/shared';
import type { FleetSnapshot } from '@/services/fleet.service';

export const STATUS = {
  en_route: { label: 'En route', color: 'text-moving', background: 'bg-moving' },
  at_stop: { label: 'At stop', color: 'text-stopped', background: 'bg-stopped' },
  idle: { label: 'Idle', color: 'text-idle', background: 'bg-idle' },
  maintenance: { label: 'Maintenance', color: 'text-maintenance', background: 'bg-maintenance' },
  offline: { label: 'Offline', color: 'text-offline', background: 'bg-offline' },
} satisfies Record<VehicleStatus, { label: string; color: string; background: string }>;

export interface FleetFilters {
  region: string;
  status: string;
  attention: string;
  search: string;
}

export const EMPTY_FILTERS: FleetFilters = { region: 'all', status: 'all', attention: 'all', search: '' };

export function reportAge(vehicle: VehicleRecord, asOf: Date): number {
  return Math.max(0, Math.floor((asOf.getTime() - vehicle.lastTelemetryAt.getTime()) / 60_000));
}

export function isStale(vehicle: VehicleRecord, asOf: Date): boolean {
  return asOf.getTime() - vehicle.lastTelemetryAt.getTime() > 15 * 60_000;
}

export function activeAlerts(fleet: FleetSnapshot) {
  return fleet.alerts.filter((alert) => alert.status !== 'resolved');
}

export function filterVehicles(fleet: FleetSnapshot, filters: FleetFilters): VehicleRecord[] {
  const alertVehicleIds = new Set(activeAlerts(fleet).map((alert) => alert.vehicle_id));
  const search = filters.search.trim().toLocaleLowerCase();
  return fleet.vehicles.filter((vehicle) =>
    (filters.region === 'all' || vehicle.region_id === filters.region)
    && (filters.status === 'all' || vehicle.status === filters.status)
    && (filters.attention !== 'alerts' || alertVehicleIds.has(vehicle.id))
    && (filters.attention !== 'delayed' || vehicle.delayStatus === 'delayed')
    && (filters.attention !== 'stale' || isStale(vehicle, fleet.clock.asOf))
    && (!search || `${vehicle.vehicleCode} ${vehicle.callSign}`.toLocaleLowerCase().includes(search))
  ).sort((a, b) =>
    Number(alertVehicleIds.has(b.id)) - Number(alertVehicleIds.has(a.id))
    || b.delayMinutes - a.delayMinutes
    || a.vehicleCode.localeCompare(b.vehicleCode)
  );
}

export function summarizeFleet(fleet: FleetSnapshot, vehicles: VehicleRecord[]) {
  const ids = new Set(vehicles.map(({ id }) => id));
  const alerts = activeAlerts(fleet).filter((alert) => ids.has(alert.vehicle_id));
  return {
    total: vehicles.length,
    moving: vehicles.filter((vehicle) => vehicle.status === 'en_route').length,
    delayed: vehicles.filter((vehicle) => vehicle.delayStatus === 'delayed').length,
    stale: vehicles.filter((vehicle) => isStale(vehicle, fleet.clock.asOf)).length,
    alerts: alerts.length,
    affected: new Set(alerts.map((alert) => alert.vehicle_id)).size,
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
  };
}

export const centralTime = (date: Date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(date);

export const centralDate = (date: Date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric',
}).format(date);
