import { authenticated, boolean, decimal, entity, int, text, uuid } from '@microsoft/rayfin-core';
import type { RegionRecord } from '@rayfin-app/shared';

@entity()
@authenticated('read')
export class Region implements RegionRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @text({ max: 8, unique: true }) code!: string;
  @text({ max: 100 }) name!: string;
  @text({ max: 100 }) hubName!: string;
  @decimal({ precision: 9, scale: 6 }) centerLat!: number;
  @decimal({ precision: 9, scale: 6 }) centerLng!: number;
  @int() zoom!: number;
}
