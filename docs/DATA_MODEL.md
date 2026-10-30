# Synthetic fleet data model

## Scope and verified state

All records are invented for a hackathon/reference application about **Zava Security,
a fictional company**. They do not model the people, vehicles, routes, customers,
protected facilities, valuables, security incidents, or operational procedures of
any real company.

The operational source of truth is the **Rayfin-managed Fabric SQL database**
`tx-fleet-command`. Historical data lives in Delta tables in `tx_fleet_history`.
Both are in **Trucks Rayfin**, on **demodinoeast2 / East US 2**. See the approved
[target configuration](../config/fabric-target.json) for exact item IDs.

Fresh SQL reads verified all 3,583 operational rows and 3,840 historical rows.
The Lakehouse tables are readable through its SQL analytics endpoint.
This does not yet verify a Rayfin Lakehouse connector or a Data Agent integration.

## Operational schema

The [entity registry](../packages/data/src/index.ts) owns the schema, not portal
DDL. Browser code uses [shared contracts](../packages/shared/src/index.ts) instead
of importing decorated classes. Every record has a UUID `id` and `isSynthetic`.
All coordinates use `DECIMAL(9,6)` explicitly; default two-place decimal precision
would be inappropriate for the map.

| Entity / SQL table | Rows | Important fields and purpose |
|---|---:|---|
| Region / Regions | 8 | `code`, `name`, `hubName`, `centerLat`, `centerLng`, `zoom` |
| TeamMember / TeamMembers | 14 | Fictional `displayName`, `role`, `region_id`; optional `entraSub`, `email` left unmapped |
| Crew / Crews | 40 | Fictional `crewCode`, `leadFirstName` |
| Vehicle / Vehicles | 120 | `vehicleCode`, `callSign`, `region_id`, `crew_id`, status/health/delay fields, coordinates, speed, energy, last report |
| Assignment / Assignments | 150 | `vehicle_id`, `originRegion_id`, fictional destination, arrival times, `status`, `isCurrent` |
| Alert / Alerts | 38 | `vehicle_id`, `region_id`, `assignedTo_id`, `severity`, `status`, message, creator, optional recipient subject/resolution time |
| FleetEvent / FleetEvents | 320 | `vehicle_id`, `region_id`, optional `alert_id`, event type, time, detail, fictional actor |
| TelemetryPing / TelemetryPings | 2,880 | `vehicle_id`, `ts`, `lat`, `lng`, `speedMph` |
| OperatorNote / OperatorNotes | 12 | `vehicle_id`, `authorSub`, text, time |
| SimClock / SimClocks | 1 | `asOf`, `scenarioName`, `speed` |
| **Total** | **3,583** | |

There are **13 actual foreign-key constraints**, all enabled and trusted:

- TeamMember -> Region.
- Vehicle -> Region, Crew.
- Assignment -> Vehicle, Region (origin).
- Alert -> Vehicle, Region, TeamMember (assignee).
- FleetEvent -> Vehicle, Region, Alert (optional).
- TelemetryPing -> Vehicle.
- OperatorNote -> Vehicle.

There is deliberately no circular Vehicle -> current Assignment pointer.
`Assignments.isCurrent` identifies the current assignment; the seed/validator
enforces exactly one per vehicle, with 30 additional completed assignments.
That cardinality is currently a validated application invariant, not a SQL
filtered-unique constraint.

## API permissions

| Entities | Authenticated API actions |
|---|---|
| Regions, TeamMembers, Crews, Vehicles, Assignments, TelemetryPings, SimClocks | Read only |
| Alerts | Shared read; create checks caller subject; update limited to lifecycle/audit fields |
| FleetEvents | Read, create |
| OperatorNotes | Shared read; create/update/delete with `claims.sub == authorSub` check |

No anonymous entity policies exist. These prototype policies do not implement
assignee-only acknowledgement or regional access separation. A second-user test
and real identity mapping remain required before demonstrating those behaviors.
Seed note subjects use `synthetic-*`; they are not real user identities.
Owner SQL bulk loading is independent of, and does not validate, these API policies.
The alert milestone adds nullable `acknowledgedAt`, `acknowledgedBySub`, and
`resolvedBySub` fields for recoverable event synchronization. It does not add
delete permission or change reference data. See [alert workflow](ALERTS.md) for
partial-save recovery and the prototype concurrency/authorization limitations.

## Scenario ground truth

Default clock: **2026-10-27T15:00:00.000Z** (10:00 AM Central).
Vehicle freshness and scenario-hour analysis use this clock, not the current wall
clock. Newly performed alert actions use actual UTC action timestamps, separately
labeled in the inbox and displayed in Central. They do not advance telemetry or
enter the agent's frozen scenario-hour window.

| Region | Vehicles | Delayed | At risk | Offline | Maintenance | Open alerts | Affected vehicles |
|---|---:|---:|---:|---:|---:|---:|---:|
| DFW | 26 | 3 | 3 | 2 | 2 | 4 | 3 |
| HOU | 28 | 9 | 4 | 4 | 1 | 11 | 8 |
| AUS | 14 | 1 | 1 | 0 | 1 | 1 | 1 |
| SAT | 14 | 2 | 2 | 1 | 1 | 3 | 2 |
| ELP | 8 | 0 | 1 | 1 | 1 | 2 | 2 |
| CRP | 10 | 1 | 1 | 1 | 1 | 2 | 1 |
| LBB | 10 | 0 | 1 | 1 | 1 | 1 | 1 |
| AMA | 10 | 0 | 1 | 0 | 0 | 1 | 1 |
| **Total** | **120** | **16** | **14** | **10** | **8** | **25** | **19** |

- Status: 72 `en_route`, 16 `at_stop`, 14 `idle`, 8 `maintenance`, 10 `offline`.
- Delay: among the 88 moving/at-stop vehicles, 58 `on_time`, 14 `at_risk`,
  16 `delayed`; others are `not_applicable`.
- Health: 96 `ok`, 17 `watch`, 7 `service_needed`.
- Open alert severity: 4 critical (3 Houston, 1 El Paso), 12 warning, 9 info.
- Delayed Houston vehicles average 38 minutes late; other delayed vehicles average 24.
- Exactly 60 fleet events are in the latest scenario hour, at least 36 in Houston.
- 24 five-minute-spaced pings per vehicle end at its **own** last report time.
  Offline vehicles do not acquire contradictory fresh pings.
- Final pings match current vehicle coordinates/speed.
- Locations are fabricated near the eight Texas centers, with additional El Paso
  boundary checks. They are not verified road routes or actual destinations.

## History tables

| Delta / SQL name | Rows | Grain |
|---|---:|---|
| `dbo.fleet_daily_kpi` | 240 | Region x day |
| `dbo.vehicle_daily` | 3,600 | Vehicle x day |

Both cover the **30 complete prior UTC dates**: September 27 through October 26,
2026 for the default clock. Rows use UUID `id`, snake-case fields, and
`is_synthetic: true`. Regional KPIs reconcile with vehicle-level history.
History IDs refer to the operational region/vehicle identities, but cross-store
relationships are verified by the tools, **not** SQL foreign keys across items.

History CSVs are uploaded to `Files/synthetic` in the Lakehouse, then loaded as
Delta tables. Both original load operations succeeded:

- `fleet_daily_kpi`: `00000000-0000-4000-8000-f118f572bf46`
- `vehicle_daily`: `00000000-0000-4000-8000-fe69525bfefd`

After loading, SQL analytics initially returned error 208 despite visible Delta
tables. Background synchronization subsequently completed; a metadata refresh
reported `NotRun` with successful-sync timestamps, and actual SQL reads then
verified all rows. See [feedback FB-006](../FEEDBACK-LOG.md#fb-006---delta-load-completion-and-sql-catalog-readiness-are-different-gates).

## Reproducibility and verification

The [generator](../tools/synthetic.mjs) uses a deterministic RNG and stable UUIDv5
identities. [Generation CLI](../tools/generate-data.mjs) supports `--as-of`,
`--seed`, and explicit `--rebase-now`; default generation reproduces the deployed
fixture. A generated rebase is **not** a supported reset of populated stores.

```powershell
npm run data:test
npm run data:verify
npm run data:verify-history
```

`data:seed` uses SERIALIZABLE isolation, locking reads, constrained bulk inserts,
and one commit. An empty schema is loaded in dependency order. A nonempty schema
is compared with the fixture; mismatches fail without replacement.
History loading preserves existing tables and identical source files.
Verification compares every persisted row/field, validates column shapes and the
scenario invariants, and checks SQL FK trust and coordinate scale.

No tool performs destructive reseeding, schema reset, or unapproved region moves.
Do not delete operator-created records to make a verification mismatch disappear.

## First SQL queries

Run these against the operational SQL database:

```sql
SELECT COUNT(*) AS vehicles FROM dbo.Vehicles;

SELECT COUNT(*) AS activeAlerts, COUNT(DISTINCT vehicle_id) AS affectedVehicles
FROM dbo.Alerts WHERE status IN ('open', 'acknowledged');

SELECT r.code, COUNT(*) AS delayedVehicles
FROM dbo.Vehicles AS v
JOIN dbo.Regions AS r ON r.id = v.region_id
WHERE v.delayStatus = 'delayed'
GROUP BY r.code ORDER BY delayedVehicles DESC;

SELECT v.vehicleCode, v.lastTelemetryAt, c.asOf
FROM dbo.Vehicles AS v CROSS JOIN dbo.SimClocks AS c
WHERE v.lastTelemetryAt < DATEADD(minute, -15, c.asOf)
ORDER BY v.lastTelemetryAt;
```

Expected: 120 vehicles, 25 active alerts across 19 vehicles, and Houston leading
with nine delayed vehicles. Against the **Lakehouse SQL endpoint** instead:

```sql
SELECT COUNT(*) AS regionDays FROM dbo.fleet_daily_kpi; -- 240
SELECT COUNT(*) AS vehicleDays FROM dbo.vehicle_daily; -- 3600
```

The existing Lakehouse also exposes Regions, Vehicles, Assignments, Alerts,
FleetEvents and SimClocks through read-only OneLake shortcuts to the operational
SQL database's existing replica. These are not new seed/history copies. The Data
Agent uses this supported Lakehouse source; see [agent architecture](DATA_AGENT.md)
for freshness, permissions, source selection and golden-query validation.
