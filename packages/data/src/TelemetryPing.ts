import { authenticated, boolean, date, decimal, entity, one, uuid } from '@microsoft/rayfin-core';
import type { TelemetryPingRecord } from '@rayfin-app/shared';
import { Vehicle } from './Vehicle.js';

@entity()
@authenticated('read')
export class TelemetryPing implements TelemetryPingRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @uuid() vehicle_id!: string;
  @one(() => Vehicle) vehicle?: Vehicle;
  @date() ts!: Date;
  @decimal({ precision: 9, scale: 6 }) lat!: number;
  @decimal({ precision: 9, scale: 6 }) lng!: number;
  @decimal() speedMph!: number;
}
