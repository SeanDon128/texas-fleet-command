import { authenticated, boolean, date, entity, one, set, text, uuid } from '@microsoft/rayfin-core';
import type { AlertRecord } from '@rayfin-app/shared';
import { Vehicle } from './Vehicle.js';
import { Region } from './Region.js';
import { TeamMember } from './TeamMember.js';

@entity()
@authenticated('read')
@authenticated('create', { policy: (claims, item) => claims.sub.eq(item.createdBySub) })
@authenticated('update', { include: ['status', 'acknowledgedAt', 'acknowledgedBySub', 'resolvedAt', 'resolvedBySub'] })
export class Alert implements AlertRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @uuid() vehicle_id!: string;
  @one(() => Vehicle) vehicle?: Vehicle;
  @uuid() region_id!: string;
  @one(() => Region) region?: Region;
  @set('delay', 'telemetry', 'health', 'operations') type!: AlertRecord['type'];
  @set('critical', 'warning', 'info') severity!: AlertRecord['severity'];
  @set('open', 'acknowledged', 'resolved') status!: AlertRecord['status'];
  @text({ max: 1000 }) message!: string;
  @date() createdAt!: Date;
  @text({ max: 200 }) createdBySub!: string;
  @uuid() assignedTo_id!: string;
  @one(() => TeamMember) assignedTo?: TeamMember;
  @text({ max: 200, optional: true }) assignedToSub?: string;
  @date({ optional: true }) resolvedAt?: Date;
  @date({ optional: true }) acknowledgedAt?: Date;
  @text({ max: 200, optional: true }) acknowledgedBySub?: string;
  @text({ max: 200, optional: true }) resolvedBySub?: string;
  @set('simulation', 'operator') source!: AlertRecord['source'];
}
