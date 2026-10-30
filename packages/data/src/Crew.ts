import { authenticated, boolean, entity, text, uuid } from '@microsoft/rayfin-core';
import type { CrewRecord } from '@rayfin-app/shared';

@entity()
@authenticated('read')
export class Crew implements CrewRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @text({ max: 40, unique: true }) crewCode!: string;
  @text({ max: 40 }) leadFirstName!: string;
}
