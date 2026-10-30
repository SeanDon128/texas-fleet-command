import { authenticated, boolean, email, entity, one, text, uuid } from '@microsoft/rayfin-core';
import type { TeamMemberRecord } from '@rayfin-app/shared';
import { Region } from './Region.js';

@entity()
@authenticated('read')
export class TeamMember implements TeamMemberRecord {
  @uuid() id!: string;
  @boolean({ default: true }) isSynthetic!: boolean;
  @text({ max: 100 }) displayName!: string;
  @text({ max: 60 }) role!: string;
  @uuid() region_id!: string;
  @one(() => Region) region?: Region;
  @text({ max: 200, optional: true }) entraSub?: string;
  @email({ max: 254, optional: true }) email?: string;
}
