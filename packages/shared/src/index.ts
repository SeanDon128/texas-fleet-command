export interface SyntheticRecord {
  id: string;
  isSynthetic: boolean;
}

export type VehicleStatus = 'en_route' | 'at_stop' | 'idle' | 'maintenance' | 'offline';
export type HealthStatus = 'ok' | 'watch' | 'service_needed';
export type DelayStatus = 'on_time' | 'at_risk' | 'delayed' | 'not_applicable';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type FleetEventType = 'status_change' | 'delay_update' | 'telemetry_lost' |
  'telemetry_restored' | 'alert_created' | 'alert_acknowledged' | 'alert_resolved';

export interface RegionRecord extends SyntheticRecord {
  code: string;
  name: string;
  hubName: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface TeamMemberRecord extends SyntheticRecord {
  displayName: string;
  role: string;
  region_id: string;
  entraSub?: string;
  email?: string;
}

export interface CrewRecord extends SyntheticRecord {
  crewCode: string;
  leadFirstName: string;
}

export interface VehicleRecord extends SyntheticRecord {
  vehicleCode: string;
  callSign: string;
  type: string;
  region_id: string;
  crew_id: string;
  status: VehicleStatus;
  healthStatus: HealthStatus;
  lat: number;
  lng: number;
  headingDeg: number;
  speedMph: number;
  energyType: 'diesel' | 'electric';
  energyPct: number;
  lastTelemetryAt: Date;
  minutesSinceReport: number;
  delayStatus: DelayStatus;
  delayMinutes: number;
  unit: number;
}

export interface AssignmentRecord extends SyntheticRecord {
  routeCode: string;
  vehicle_id: string;
  originRegion_id: string;
  destinationName: string;
  destLat: number;
  destLng: number;
  scheduledArrival: Date;
  estimatedArrival: Date;
  delayMinutes: number;
  status: 'active' | 'completed';
  isCurrent: boolean;
}

export interface AlertRecord extends SyntheticRecord {
  vehicle_id: string;
  region_id: string;
  type: 'delay' | 'telemetry' | 'health' | 'operations';
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: Date;
  createdBySub: string;
  assignedTo_id: string;
  assignedToSub?: string;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBySub?: string;
  resolvedBySub?: string;
  source: 'simulation' | 'operator';
}

export interface FleetEventRecord extends SyntheticRecord {
  occurredAt: Date;
  type: FleetEventType;
  vehicle_id: string;
  region_id: string;
  alert_id?: string;
  detail: string;
  actor: string;
}

export interface TelemetryPingRecord extends SyntheticRecord {
  vehicle_id: string;
  ts: Date;
  lat: number;
  lng: number;
  speedMph: number;
}

export interface OperatorNoteRecord extends SyntheticRecord {
  vehicle_id: string;
  authorSub: string;
  text: string;
  createdAt: Date;
}

export interface SimClockRecord extends SyntheticRecord {
  asOf: Date;
  scenarioName: string;
  speed: number;
}

export type UniversalAppSchema = {
  Region: RegionRecord;
  TeamMember: TeamMemberRecord;
  Crew: CrewRecord;
  Vehicle: VehicleRecord;
  Assignment: AssignmentRecord;
  Alert: AlertRecord;
  FleetEvent: FleetEventRecord;
  TelemetryPing: TelemetryPingRecord;
  OperatorNote: OperatorNoteRecord;
  SimClock: SimClockRecord;
};

export type DataAgentFailureCode = 'invalid_question' | 'configuration' | 'permission' |
  'unavailable' | 'timeout' | 'protocol' | 'empty_answer' | 'unexpected';

export type DataAgentResult = {
  requestId: string;
  elapsedMs: number;
} & ({
  kind: 'answer';
  answer: string;
  truncated: boolean;
} | {
  kind: 'failure';
  code: DataAgentFailureCode;
  message: string;
  retryable: boolean;
});

export const FLEET_AGENT_QUESTIONS = [
  'How many vehicles currently have active operational alerts?',
  'Which Texas region has the most delayed vehicles?',
  'Which vehicles have not reported in more than 15 minutes?',
  'Summarize fleet status by Texas region.',
  'Which vehicles need attention, and why?',
  "What changed in the fleet during the scenario's last hour?",
  'Why does SYN-027 need attention?',
] as const;
