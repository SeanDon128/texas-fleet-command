# Phase 2 — Fleet_Operations ontology

## Result: created and definition-verified on October 29

**Fleet_Operations is now deployed in Trucks Rayfin.** After the user enabled
the tenant's Ontology preview and explicitly authorized retry, the same
generation-2 definition was accepted and all 27 parts were retrieved from Fabric.
This is not an empty shell. The earlier availability rejection is retained below
as historical evidence.

**Open (URL pattern; fill in your own IDs):** `Fleet_Operations` at
`https://app.fabric.microsoft.com/groups/<workspace-id>/ontologies/00000000-0000-4000-8000-f4fa252bba1a?ctid=<tenant-id>`.

**Definition/binding persistence is verified; queries through the ontology and
ontology-backed Data Agent answers are not yet verified.** No new agent was
created during the October 29 ontology deployment, and the existing app and published agent were not changed.

### October 30 - E-AGENT-ONTOLOGY / FB-035

The native ontology canvas now renders entities and relationships. In the separate
experimental semantic agent, **Add sources -> Ontology** found Fleet_Operations,
but Add failed on both Standard and the recommended Preview runtime with
"Couldn't add ontology / Check that you can access this ontology, then try again."
Context was not attached, so the two prepared relationship questions were **not
run against an ontology-backed agent**. The hypothesis remains untested, not
refuted. Standard was restored; the working agent and 65 frozen app/config files
were unchanged. See [attempt evidence](../fabric/phase2/ontology-agent/observations.json)
and [both failure notifications](../fabric/phase2/ontology-agent/portal-add-errors.png).
The ontology is semantic context, not the query execution endpoint; querying its
associated GraphModel would be a different experiment and was not substituted.

| Verification | Actual result |
|---|---|
| Local definition | 27 parts; 7 entities, 7 relationships, 6 natural-language business rules |
| Source schema and data | Fresh read-only SQL analytics endpoint queries passed on October 29 |
| Definition persisted in Fabric | **Yes; generation 2, all 27 parts** |
| Source binding definitions persisted in Fabric | **Yes; seven entities, 55 properties and seven relationships** |
| `getDefinition` round-trip | **Passed at 2026-10-29T20:01:00.834Z** |
| Query through ontology | **Not verified; source SQL reads are a different acceptance boundary** |
| Native ontology canvas | Rendered on October 30; the October 29 attempt had stopped at sign-in |
| Graph refresh/materialization request | None explicitly submitted by this implementation; actual graph data load not verified |
| Associated Fabric items | GraphModel, Eventhouse and KQLDatabase observed after ontology creation |

### Successful enablement retry

- Fresh approved-workspace ontology inventory was empty at
  **2026-10-29T19:57:19.065Z**. The previous request had a definitive 403
  rejection, no accepted-operation receipt and no created item.
- The prior marker/error/request were archived under
  [`attempts/2026-10-28T21-09-11.954Z/`](../fabric/phase2/ontology/attempts/2026-10-28T21-09-11.954Z/).
  Retry authorization and fresh empty-inventory reconciliation were recorded;
  no blind resubmission or existing-item adoption was performed.
- Fabric accepted operation **`00000000-0000-4000-8000-f9efb2f11a5c`**, which
  completed **Succeeded**, creating **`00000000-0000-4000-8000-f4fa252bba1a`**.
- Read-back returned `properties.generation: 2` and all seven entities,
  relationship mappings, six rule parts and source-binding definitions.
  See [creation receipt](../fabric/phase2/ontology/receipt.json),
  [verification](../fabric/phase2/ontology/verification.json) and
  [actual saved definition](../fabric/phase2/ontology/get-definition.json).
- The agent did not enable tenant settings, change capacity, create a source,
  explicitly request graph materialization, set a refresh schedule, expand permissions or redeploy
  the app. **69 frozen app/Function/package/model-configuration hashes matched**
  at **2026-10-29T20:01:43.404Z**.
- Native viewing remains a separate check: the integrated browser required
  interactive password sign-in. No password was requested in chat, accessed
  from storage or entered by this implementation.

### Associated resources observed after creation

The final workspace inventory contained three new associated items whose names
include this ontology's exact ID:

| Item | ID |
|---|---|
| GraphModel | `00000000-0000-4000-8000-f65519034aa5` |
| Eventhouse | `00000000-0000-4000-8000-f829ab153164` |
| KQLDatabase | `00000000-0000-4000-8000-f59ed85928ec` |

The GraphModel description identifies it as the ontology graph; the Eventhouse
lists the KQLDatabase as its child, and the database points back to that parent.
All are in **Trucks Rayfin**. The implementation submitted only the ontology
create request, not separate create, ingestion, Graph refresh or schedule
requests. These platform-associated resources must **not** be reported as absent.
Metadata alone does not establish whether their provisioning was automatic
default behavior or triggered by another native action.

Metadata reads do not establish whether graph data has loaded, what capacity
was consumed or whether a refresh schedule exists by platform default. The
Eventhouse reports minimumConsumptionUnits=0; this is **not** a zero-cost
measurement or guarantee. Resources were not deleted or reconfigured because
their lifecycle can be tied to the ontology. See
[associated-resource metadata](../fabric/phase2/ontology/associated-resource-inspection.json)
and [final isolation inventory](../fabric/phase2/ontology/retry-isolation-verification.json).

Public guidance describes Graph as optional, but does not by itself establish
when associated infrastructure is provisioned. The distinction between provisioned
resources, materialized data and query execution is new feedback, not a proven
documentation contradiction or runtime defect.

### Historical blocking evidence - October 28, resolved by authorized retry

- **Severity: deployment blocker.** At **2026-10-28T21:09:17.565Z**, documented `POST /v1/workspaces/<workspace-id>/ontologies` returned **HTTP 403**, `errorCode: FeatureNotAvailable`, `message: The feature is not available`, `isRetriable: false`. Response-body request ID: **`00000000-0000-4000-8000-f29dfd3a3344`**.
- At **2026-10-28T21:09:55.959Z**, the approved workspace's **New item** catalog, filtered to `ontology`, displayed **Unable to find any search results**.
- At **2026-10-28T21:10:12.797Z**, both workspace `items?type=Ontology` and the documented `ontologies` listing returned empty inventories.
- This established that creation was unavailable to the approved caller in that
  workspace **at the time**. The next-day retry succeeded after user-reported
  preview enablement. That sequence does not independently audit which exact
  tenant switch or propagation event changed. No settings, permissions,
  identities or capacities were altered by the implementation.

Evidence: [`error-create.json`](../fabric/phase2/ontology/error-create.json), [`create-started.json`](../fabric/phase2/ontology/create-started.json), [`availability-verification.json`](../fabric/phase2/ontology/availability-verification.json), and [portal screenshot](../fabric/phase2/ontology/portal-no-ontology-search-results.png).

## Exact target and source

| Resource | Identifier |
|---|---|
| Approved identity | `<approved-account>` (value intentionally omitted) |
| Tenant | `<tenant-id>` (value intentionally omitted) |
| Trucks Rayfin workspace | `<workspace-id>` (value intentionally omitted) |
| demodinoeast2, East US 2 capacity | `00000000-0000-4000-8000-000000000003` |
| Existing tx-fleet-command SQLDatabase | `00000000-0000-4000-8000-000000000006` |
| Existing SQL analytics endpoint | `00000000-0000-4000-8000-000000000007` |
| New ontology | **`00000000-0000-4000-8000-f4fa252bba1a`**, generation 2 |
| Local definition logical ID | `00000000-0000-4000-8000-f44b08529ca2` — distinct from deployed artifact ID |

Reusable workspace URL pattern (fill in your own IDs): `https://app.fabric.microsoft.com/groups/<workspace-id>/list?ctid=<tenant-id>&experience=fabric-developer`.

The SQL replica server is represented by `<sql-analytics-endpoint>` in this sanitized copy, database `00000000-0000-4000-8000-000000000007`. The accepted definition uses the documented DirectLake table partition plus shared `Sql.Database` expression pattern over this existing SQLDatabase replica, not a semantic-model dependency. The original server accepted and persisted the definition; these edited examples require your own approved endpoint, regeneration and revalidation. Historical timestamps and hashes are not verification of the sanitized examples; live binding/query execution remains a separate unverified gate.

## Persisted ontology

All data is synthetic and belongs to Zava Security, a fictional company. Nothing here asserts real operations, deliveries, alerts, or personnel of any actual company.

| Entity | Existing source | Key |
|---|---|---|
| Vehicle | `dbo.Vehicles` | `id`, string |
| Region | `dbo.Regions` | `id`, string |
| Alert | `dbo.Alerts` | `id`, string |
| Assignment | `dbo.Assignments` | `id`, string |
| FleetEvent | `dbo.FleetEvents` | `id`, string |
| ScenarioClock | `dbo.SimClocks` | `id`, string |
| TeamMember | `dbo.TeamMembers` | `id`, string |

Relationships have distinct names and existing foreign-key mappings:

- `operatesIn`: Vehicle.region_id → Region.id (N:1).
- `assignedToVehicle`: Assignment.vehicle_id → Vehicle.id (N:1).
- `affectsVehicle`: Alert.vehicle_id → Vehicle.id (N:1).
- `observedOnVehicle`: FleetEvent.vehicle_id → Vehicle.id (N:1).
- `concernsAlert`: FleetEvent.alert_id → Alert.id (optional N:1).
- `assignedForReview`: Alert.assignedTo_id → TeamMember.id (optional N:1); **not notification**.
- `teamBasedIn`: TeamMember.region_id → Region.id (N:1).

No inferred crew membership, Location, shared Route/Stop, `CURRENTLY_AT`, or notification relationship is introduced. `vehicleCode` is unique; `callSign` is not a key. Decimal properties, including coordinates and speed, are intentionally omitted for this first ontology. Identity subject columns, email, and FleetEvent.actor are excluded.

### Business semantics

The six rule parts encode **natural-language business context**, not an executable rules engine:

1. **ActiveAlert:** status is `open` or `acknowledged`; this is current record state, not a historical snapshot.
2. **DelayedVehicle:** `delayStatus = delayed`; exclude `at_risk`.
3. **StaleTelemetry:** `lastTelemetryAt < ScenarioClock.asOf - 15 minutes`, strictly. Never use wall clock.
4. **NeedsAttention:** distinct uncapped union of active alert, delayed, stale, health not `ok`, or status `offline`/`maintenance`. Multiple alerts must not duplicate vehicles.
5. **CurrentAssignment:** `isCurrent = true` (SQL bit 1).
6. **SyntheticTimeSemantics:** scenario time is **2026-10-27T15:00:00Z**; operator-action timestamps are actual UTC and may be later.

## Actual source-query acceptance

Fresh read-only queries completed at **2026-10-29T19:58:27.222Z**. This verifies
the existing source, **not an ontology query**:

- 120 vehicles, 8 regions, **40 alerts**, 150 assignments, **322 events**, one clock, 14 fictional team members.
- **27 active alerts affecting 21 distinct vehicles; 5 critical active alerts**.
- 54 vehicles need attention; 10 have stale telemetry; 16 are delayed.
- HOU: 28 vehicles, 9 delayed, 11 active alerts, 17 needing attention (**60.7%**).
- SYN-027: HOU, 38-minute delay, 2 active alerts, healthy, not stale.
- Critical vehicles: **SYN-026**, SYN-027, SYN-028, SYN-029, SYN-090.
- All seven entity keys are nonnull and unique; all seven relationship mappings have zero orphan references.
- There are 120 current assignments for 120 distinct vehicles.

These current alert/event counts differ from the original seed and October 28
acceptance. This retry performed no source writes or cleanup; do not reset
operator records to reproduce an older slide.

Full results: [`source-verification.json`](../fabric/phase2/ontology/source-verification.json).
The [local validation](../fabric/phase2/ontology/local-validation.json) checks exact
declared property mappings, nonempty valid source counts, unique part paths,
string keys, relationship-column existence, key integrity, relationship orphans,
scenario time, current assignments and excluded fields. Mutable alert/event totals
are no longer incorrectly fixed to the initial seed. Local validation is separate
from the successful Fabric definition acceptance/read-back.

## Reproducible, additive workflow

Configuration: [`config\phase2-ontology.json`](../config/phase2-ontology.json).
Implementation: [`tools\phase2\ontology.mjs`](../tools/phase2/ontology.mjs).
Generated definition: [`fabric\phase2\ontology\definition`](../fabric/phase2/ontology/definition).
Exact attempted request: [`create-request.json`](../fabric/phase2/ontology/create-request.json).

```powershell
node --check tools\phase2\ontology.mjs
node tools\phase2\ontology.mjs build
node tools\phase2\ontology.mjs source
node tools\phase2\ontology.mjs validate
node --test tools\phase2\ontology.test.mjs
node tools\phase2\ontology.mjs verify
```

`create` makes one additive request only, after validating identity, tenant,
workspace, capacity, source and an unambiguous empty name inventory. It refuses
overwrite/adoption, a registered ontology ID, or a repeated unresolved creation
marker. **The ontology now exists: use `verify`, never `create` or `retry-create`.**

The `retry-create` path was used once after explicit user authorization. It only
re-arms a definitive prior `403 FeatureNotAvailable` rejection with no accepted
receipt, archives the evidence and reconciles fresh inventory. It cannot be used
to bypass uncertainty about an accepted operation or to duplicate this item.
`verify` reuses only the recorded ID, calls `getDefinition` and saves decoded
persisted parts plus associated-resource inventory. Neither command explicitly
requests graph materialization or creates schedules; creation can result in
platform-associated resources as observed above.
An actual source-bound ontology query must still pass before claiming
end-to-end ontology data consumption or agent readiness.

No existing app files, SQL data/schema, Lakehouse/shortcuts, Functions, DataAgent, package manifests, or Rayfin deployment were changed.

## Documentation used

- [Create Ontology REST API](https://learn.microsoft.com/en-us/rest/api/fabric/ontology/items/create-ontology): generation-2 inference and create contract.
- [New ontology item definition](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/ontology-definition): canonical WindFarm TMDL sample, backing tables, property mappings, relationships, and business rules.
- [Bind data](https://learn.microsoft.com/en-us/fabric/iq/ontology/how-to-bind-data): supported SQLDatabase source and source access requirements.
- [Ontology overview](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview): source-native context and optional graph execution.
- [Troubleshooting](https://learn.microsoft.com/en-us/fabric/iq/ontology/resources-troubleshooting): availability settings, decimal graph limitation, and graph capacity risks.
