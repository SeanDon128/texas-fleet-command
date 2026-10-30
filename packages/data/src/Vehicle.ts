import { authenticated, boolean, date, decimal, entity, int, one, set, text, uuid } from '@microsoft/rayfin-core';
import type { VehicleRecord } from '@rayfin-app/shared';
import { Region } from './Region.js';
import { Crew } from './Crew.js';

@entity()
@authenticated('read')
export class Vehicle implements VehicleRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @text({ max: 30, unique: true }) vehicleCode!: string;
  @text({ max: 50 }) callSign!: string;
  @text({ max: 30 }) type!: string;
  @uuid() region_id!: string;
  @one(() => Region) region?: Region;
  @uuid() crew_id!: string;
  @one(() => Crew) crew?: Crew;
  @set('en_route', 'at_stop', 'idle', 'maintenance', 'offline') status!: VehicleRecord['status'];
  @set('ok', 'watch', 'service_needed') healthStatus!: VehicleRecord['healthStatus'];
  @decimal({ precision: 9, scale: 6 }) lat!: number;
  @decimal({ precision: 9, scale: 6 }) lng!: number;
  @int() headingDeg!: number;
  @decimal() speedMph!: number;
  @set('diesel', 'electric') energyType!: VehicleRecord['energyType'];
  @int({ min: 0, max: 100 }) energyPct!: number;
  @date() lastTelemetryAt!: Date;
  @int({ min: 0 }) minutesSinceReport!: number;
  @set('on_time', 'at_risk', 'delayed', 'not_applicable') delayStatus!: VehicleRecord['delayStatus'];
  @int({ min: 0 }) delayMinutes!: number;
  @int({ default: 1 }) unit!: number;
}
