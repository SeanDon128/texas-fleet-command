import { authenticated, boolean, date, decimal, entity, int, one, set, text, uuid } from '@microsoft/rayfin-core';
import type { AssignmentRecord } from '@rayfin-app/shared';
import { Vehicle } from './Vehicle.js';
import { Region } from './Region.js';

@entity()
@authenticated('read')
export class Assignment implements AssignmentRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @text({ max: 40, unique: true }) routeCode!: string;
  @uuid() vehicle_id!: string;
  @one(() => Vehicle) vehicle?: Vehicle;
  @uuid() originRegion_id!: string;
  @one(() => Region) originRegion?: Region;
  @text({ max: 100 }) destinationName!: string;
  @decimal({ precision: 9, scale: 6 }) destLat!: number;
  @decimal({ precision: 9, scale: 6 }) destLng!: number;
  @date() scheduledArrival!: Date;
  @date() estimatedArrival!: Date;
  @int({ min: 0 }) delayMinutes!: number;
  @set('active', 'completed') status!: AssignmentRecord['status'];
  @boolean() isCurrent!: boolean;
}
