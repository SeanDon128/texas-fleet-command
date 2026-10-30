import { authenticated, boolean, date, decimal, entity, text, uuid } from '@microsoft/rayfin-core';
import type { SimClockRecord } from '@rayfin-app/shared';

@entity()
@authenticated('read')
export class SimClock implements SimClockRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @date() asOf!: Date;
  @text({ max: 100 }) scenarioName!: string;
  @decimal() speed!: number;
}
