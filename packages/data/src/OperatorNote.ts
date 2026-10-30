import { authenticated, boolean, date, entity, one, text, uuid } from '@microsoft/rayfin-core';
import type { OperatorNoteRecord } from '@rayfin-app/shared';
import { Vehicle } from './Vehicle.js';

@entity()
@authenticated('read')
@authenticated(['create', 'update', 'delete'], { policy: (claims, item) => claims.sub.eq(item.authorSub) })
export class OperatorNote implements OperatorNoteRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @uuid() vehicle_id!: string;
  @one(() => Vehicle) vehicle?: Vehicle;
  @text({ max: 200 }) authorSub!: string;
  @text({ max: 2000 }) text!: string;
  @date() createdAt!: Date;
}
