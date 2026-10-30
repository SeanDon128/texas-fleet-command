//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Region } from './Region.js';
import { TeamMember } from './TeamMember.js';
import { Crew } from './Crew.js';
import { Vehicle } from './Vehicle.js';
import { Assignment } from './Assignment.js';
import { Alert } from './Alert.js';
import { FleetEvent } from './FleetEvent.js';
import { TelemetryPing } from './TelemetryPing.js';
import { OperatorNote } from './OperatorNote.js';
import { SimClock } from './SimClock.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

export type { UniversalAppSchema };
export { Region, TeamMember, Crew, Vehicle, Assignment, Alert, FleetEvent, TelemetryPing, OperatorNote, SimClock };
export const schema = [Region, TeamMember, Crew, Vehicle, Assignment, Alert, FleetEvent, TelemetryPing, OperatorNote, SimClock];
