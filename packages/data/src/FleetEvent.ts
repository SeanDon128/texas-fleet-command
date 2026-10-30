import { authenticated, boolean, date, entity, one, set, text, uuid } from '@microsoft/rayfin-core';
import type { FleetEventRecord } from '@rayfin-app/shared';
import { Vehicle } from './Vehicle.js';
import { Region } from './Region.js';
import { Alert } from './Alert.js';

@entity()
@authenticated(['read', 'create'])
export class FleetEvent implements FleetEventRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @date() occurredAt!: Date;
  @set('status_change', 'delay_update', 'telemetry_lost', 'telemetry_restored', 'alert_created',
    'alert_acknowledged', 'alert_resolved') type!: FleetEventRecord['type'];
  @uuid() vehicle_id!: string;
  @one(() => Vehicle) vehicle?: Vehicle;
  @uuid() region_id!: string;
  @one(() => Region) region?: Region;
  @uuid({ optional: true }) alert_id?: string;
  @one(() => Alert, { optional: true }) alert?: Alert;
  @text({ max: 1000 }) detail!: string;
  @text({ max: 200 }) actor!: string;
}
