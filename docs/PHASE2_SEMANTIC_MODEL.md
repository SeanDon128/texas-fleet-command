# Phase 2 - Texas Fleet Operations semantic model

## Outcome and frozen boundary

**Created, persisted and data-verified:** the new **Texas Fleet Operations**
semantic model in **Trucks Rayfin**, using the existing **tx-fleet-command**
SQL Database's OneLake replica. No new operational data source was created.

**Ontology created on October 29:** after user-reported tenant preview
enablement, the generation-2 create API succeeded. All seven entities, seven
relationships, six rules and source-binding definitions were read back.
The prior HTTP 403 `FeatureNotAvailable` is historical feedback, not the current
state. Ontology-backed queries/AI results remain unverified.
See [ontology creation and evidence](PHASE2_ONTOLOGY.md).

Everything is entirely synthetic and belongs to Zava Security, a fictional company.
Nothing describes real vehicles, people, customers, facilities, cargo, security
procedures or operations of any actual company.

The existing application, SQL schema, Function, published Data Agent, Lakehouse
and deployment configuration were not edited or redeployed by this work.
SHA-256 comparison of all **68 frozen local files** passed at
**2026-10-28T21:24:27.787Z**. The pre-existing seven Fabric items remain present;
only the new semantic model was added. No permissions, tenant switches,
capacity configuration, source writes or external notification were introduced.

The existing authenticated browser still displayed the unchanged
`/assets/index-ZXLReunk.js` app bundle. An anonymous HTTP probe returned the
expected protected-site **401**, not a public static bundle. This is a bounded
freeze/gate check, not a new end-to-end app acceptance run or an authenticated
reload claim; earlier browser network messages are not evidence of a current
Fabric outage.

## Open the artifact

- Texas Fleet Operations in Fabric (URL pattern; fill in your own IDs):
  `https://app.fabric.microsoft.com/groups/<workspace-id>/datasets/00000000-0000-4000-8000-feffe397ad55/details?ctid=<tenant-id>&experience=fabric-developer`
- Workspace: `<workspace-id>` (value intentionally omitted)
- Model: `00000000-0000-4000-8000-feffe397ad55`
- Source SQL Database: `00000000-0000-4000-8000-000000000006`
- Capacity: **demodinoeast2**, **East US 2**, F64
- [Isolated model registry](../config/phase2-semantic-model.json)

The native workspace list displayed the actual model link. Opening its modeling
workload in this integrated browser failed with an extension CORS response:
`Access-Control-Allow-Origin: https://teams.powerbi.com` did not match
`https://app.fabric.microsoft.com`. The alternative Power BI host reached its
email/SSO screen but did not complete navigation. **Native model-canvas viewing
is not verified.** This does not invalidate the persisted definition and actual
successful DAX execution; it does limit the screenshot/demo surface verified here.
Do not disable browser security, change tenant settings or redeploy the app.
The [captured workspace listing](../fabric/phase2/semantic-model/workspace-model-created.png)
shows the new item; it is not a native relationship-canvas screenshot.

## Actual architecture

```text
Existing tx-fleet-command SQL Database
  +-- existing app API -> unchanged protected Fleet Command application
  +-- existing OneLake table replica -> NEW Texas Fleet Operations semantic model
  +-- existing SQL analytics endpoint -> NEW Fleet_Operations ontology
                                         (definition/bindings persisted;
                                          ontology data queries not yet verified)

Existing published Data Agent and its Lakehouse-source path: unchanged
New model -> new Data Agent integration: not attempted in this build
```

This is not a verified serial Semantic Model -> Ontology -> Agent chain.
The created ontology directly maps the same source business entities; it does
not require wrapping the semantic model. No explicit Graph materialization or
refresh schedule was requested. The October 29 inventory nevertheless showed
associated GraphModel, Eventhouse and KQLDatabase items provisioned for the
ontology; graph data load and capacity consumption are not verified. See the
ontology evidence for that distinction.

## Business model

Seven **Direct Lake on OneLake** entity partitions remain connected to the
original source table names and lineage. There are **61 curated columns**.
There is no import copy, SQL view, source cast, new database or date table.

| Friendly table | Existing source | Grain and purpose |
|---|---|---|
| Regions | dbo.Regions | One synthetic operating area |
| Vehicles | dbo.Vehicles | One current vehicle snapshot; Truck/Unit/Asset |
| Alerts | dbo.Alerts | One persisted alert; multiple alerts per vehicle |
| Assignments | dbo.Assignments | One work assignment, including history |
| Fleet Events | dbo.FleetEvents | One recorded change/observation |
| Telemetry Readings | dbo.TelemetryPings | One historical speed/location reading |
| Scenario Clock | dbo.SimClocks | One disconnected synthetic as-of clock |

Five active, single-direction, many-to-one relationships:

1. Vehicles.Region Key -> Regions.Region Key
2. Alerts.Vehicle Key -> Vehicles.Vehicle Key
3. Assignments.Vehicle Key -> Vehicles.Vehicle Key
4. Fleet Events.Vehicle Key -> Vehicles.Vehicle Key
5. Telemetry Readings.Vehicle Key -> Vehicles.Vehicle Key

Filtering flows from the one-side lookup to the many-side fact, never
bidirectionally. Default regional alert/event/work analysis follows **current
Vehicle region**. Direct Alert-to-Region, Assignment-origin-to-Region,
Event-to-Region and Event-to-Alert relationships are retained **inactive** to
avoid ambiguous paths. Use an explicitly designed `USERELATIONSHIP` measure for
those alternate roles; none is silently activated.

### Quality and AI context

- Friendly names, descriptions, explicit UTC formats and display folders.
- Technical IDs hidden; source mappings and lineage retained.
- No implicit sums on coordinates, speed, energy level, delay or keys.
- Latitude/longitude geographic categories and six-decimal display formats.
- Identity-subject columns and event actor **removed from the analytical model**,
  not merely hidden. Team identities, emails, free-text notes and platform Users
  are not modeled.
- `Vehicle Code`, not nonunique source `unit`, identifies a truck.
- Business definitions state synonyms, overlapping conditions, current versus
  historical grain, active status, assignment selection and synthetic time.
  This is descriptive metadata, not a separately tested linguistic-synonym layer.
- No new RLS, permissions, certification, endorsement or sensitivity label is
  claimed. Reusing the model does not itself configure enterprise governance.
- Text messages/details remain untrusted data, not agent instructions.

## Seventeen explicit measures

All definitions are reproducible in
[fleet-semantics.mjs](../tools/phase2/fleet-semantics.mjs) and the actual server
readback [model.bim](../fabric/phase2/semantic-model/model.bim).

| Measure | Business definition | Verified value |
|---|---|---:|
| Total Vehicles | Current snapshot rows, not pings or assignments | 120 |
| Active Vehicles | en_route, at_stop or idle | 102 |
| Active Alerts | open OR acknowledged; current record status | 26 |
| Critical Alerts | Active alert rows with critical severity | 4 |
| Vehicles With Active Alerts | Distinct affected vehicles | 20 |
| Vehicles With Critical Alerts | Distinct vehicles with active critical alerts | 4 |
| Delayed Vehicles | Delay Status = delayed; excludes at_risk | 16 |
| Vehicles Not Reporting | Last telemetry strictly older than scenario time minus 15 minutes | 10 |
| Vehicles Reporting Normally | Non-stale reporting; not overall good health | 110 |
| Health Attention Vehicles | watch or service_needed | 24 |
| Out Of Service Vehicles | offline or maintenance | 18 |
| Vehicles Needing Attention | Distinct union of active alert, delayed, stale, health issue or out-of-service | 54 |
| Attention Rate | Attention vehicles / total in current context | 45.0% |
| Average Speed En Route (mph) | Mean latest speed for en_route vehicles only | 46.06 mph |
| Current Assignments | Is Current Assignment = true | 120 |
| Events In Last Scenario Hour | (as-of minus one hour, as-of], not wall clock | 60 |
| Scenario As Of UTC | Authoritative synthetic clock; errors if no single selected timestamp | 2026-10-27 15:00:00 UTC |

Values were compared with contemporaneous operational SQL in the acceptance
run completed **2026-10-28T21:25:39.742Z**. These are observations, not constants
in the DAX. No measure hardcodes expected fleet totals.

**Current source changed during this session:** at acceptance, SQL and DAX both
contained **26 active alerts across 20 vehicles**, versus the original
25/19 seed baseline. A read-only diagnostic found an additional SYN-023 warning
created at **21:16:40.446Z**. This Phase 2 implementation did not create, remove
or modify that record. Its originating actor is not established by this check.
Do not delete another operator's record to make an old slide match.

The attention union remains 54 because that vehicle already qualifies through
another condition. Reason counts overlap and must not be added together.
Scenario telemetry remains frozen while alert workflow timestamps can reflect
actual later UTC actions; the model does not claim historical alert status
reconstruction as-of the scenario clock.

### Regional acceptance

| Region | Vehicles | Needing attention | Attention rate | Active alerts | Delayed | Stale |
|---|---:|---:|---:|---:|---:|---:|
| AMA | 10 | 2 | 20.0% | 1 | 0 | 0 |
| AUS | 14 | 5 | 35.7% | 1 | 1 | 0 |
| CRP | 10 | 5 | 50.0% | 2 | 1 | 1 |
| DFW | 26 | 11 | 42.3% | 5 | 3 | 2 |
| ELP | 8 | 4 | 50.0% | 2 | 0 | 1 |
| HOU | 28 | 17 | 60.7% | 11 | 9 | 4 |
| LBB | 10 | 4 | 40.0% | 1 | 0 | 1 |
| SAT | 14 | 6 | 42.9% | 3 | 2 | 1 |

Four critical vehicles: **SYN-027, SYN-028, SYN-029, SYN-090**.
SYN-027 has **two active alerts**, **one critical**, a **38-minute delay**,
one current assignment and **non-stale** telemetry.

## Acceptance, not just deployment

Actual Power BI `executeQueries` DAX was compared, field-by-field, against
read-only SQL for six answer sets:

1. Fleet-wide totals, all operational measures and overlapping reasons.
2. All eight regions, including rates and alert/vehicle distinction.
3. Exact critical vehicle set with per-vehicle active/critical counts.
4. Exact ten-vehicle stale telemetry set.
5. SYN-027 drill-through.
6. Scenario timestamp.

The validator rejects HTTP and embedded-result errors, output-shape changes,
missing/extra rows, count mismatches, missing clocks/timestamps and orphan
vehicle/alert relationships. Numeric comparisons use a tolerance of `1e-8`.
See [persisted acceptance results](../fabric/phase2/semantic-model/validation.json).

Count measures intentionally return zero for empty contexts. Consequently,
unfiltered `SUMMARIZECOLUMNS` can expose the engine's unknown-region member as
a zero-only blank row. Source inspection verified **zero orphan vehicles,
zero orphan alerts and zero null region codes**. The regional query explicitly
excludes that blank member; its eight real rows and all values must still
match SQL. Do not suppress a nonzero unknown-region member without investigation.

## Safe repeatable commands

From the project root, using the existing approved Azure CLI session:

```powershell
node --test tools\phase2\fleet-semantics.test.mjs
node tools\phase2\semantic-model.mjs inspect-tmsl
node tools\phase2\validate-semantic-model.mjs
```

`inspect-tmsl` reads only the registered new model. `validate-semantic-model`
runs read-only SQL and DAX, and updates local acceptance evidence. It does not
reseed, repair, refresh or modify operational data.

For intentional future model-only maintenance:

```powershell
node tools\phase2\semantic-model.mjs curate
# Review curated-model.bim before explicitly choosing to apply.
node tools\phase2\semantic-model.mjs apply
node tools\phase2\semantic-model.mjs inspect-tmsl
node tools\phase2\validate-semantic-model.mjs
```

`apply` can update **only** the registered new semantic model after exact
workspace/source/name checks. It is not part of app deployment. The accepted
source is a two-part TMSL definition (`model.bim` + `definition.pbism`); do not
mix TMDL and TMSL definitions in one API request.

Do not run `create` again: the item already exists and duplicate creation is
guarded. After an accepted operation timeout, inspect its operation/registered
item instead of resubmitting. A successful update-definition LRO can have no
result body; use operation state and definition readback, not unconditional
`/result` retrieval, to confirm it.

## Eight prepared business questions

These are validated **DAX/source answer patterns**, not claims of new
natural-language agent execution. Existing app-agent answers have not been
reconfigured to use this model.

| Question | Measures / relationship | Accepted answer pattern |
|---|---|---|
| How many trucks currently need attention, and what share of the fleet is that? | Vehicles Needing Attention / Total Vehicles / Attention Rate | 54 of 120, 45%; overlapping reason counts not summed |
| Which Texas region has the most issues, by count and by percentage? | Regions -> Vehicles; attention count/rate | HOU: 17 of 28, 60.7%; distinguish count from rate |
| Which vehicles have active critical alerts? | Vehicles -> Alerts; Vehicles With Critical Alerts / Critical Alerts | Four exact codes above, not all resolved critical history |
| Summarize fleet health without confusing operational status, delay and alert severity. | Active Vehicles, Health Attention Vehicles, Delayed Vehicles, Active Alerts | 102 in service; 24 health flags; 16 delayed; 26 active alerts across 20 vehicles; categories overlap |
| Which trucks stopped reporting relative to the scenario clock? | Vehicles + disconnected Scenario Clock; Vehicles Not Reporting | Ten exact codes in acceptance evidence; strictly older than 15 minutes |
| Why should I investigate SYN-027, and what is its current work? | Vehicle -> Alerts/Assignments; current assignment filter | 38-minute delay, two active/one critical alerts, current fictional route; not stale |
| What are the most common reasons vehicles need attention? | Separate health, alert, out-of-service, delay and stale measures | 24 health, 20 alert-affected, 18 out-of-service, 16 delayed, 10 stale; union 54 |
| What changed in the last scenario hour? | Vehicle -> Fleet Events + Scenario Clock | 60 events in the explicit scenario interval; not the last wall-clock hour |

## Honest Phase 2 demonstration (3-4 minutes)

1. **0:00-0:35:** Keep the existing app as the operational opening. Say:
   "This is synthetic data. We did not rebuild or redeploy the working app."
2. **0:35-1:15:** Open the new model from Trucks Rayfin, if the native UI works
   in the present browser. Show friendly tables and lookup/fact grain. If its
   workload is blocked, show the persisted source definition instead; do not
   imply a screenshot is a live canvas.
3. **1:15-2:15:** Show the acceptance results: 120 vehicles, 54 needing
   attention, HOU 17/28, and the four critical vehicles. Explain that SQL and
   real DAX agreed, and totals were not capped to a 25-row list.
4. **2:15-3:05:** Explain the created ontology: Alert affects Vehicle,
   Vehicle operates in Region, Assignment assigned to Vehicle. Show
   [its actual definition read-back](PHASE2_ONTOLOGY.md), or the native canvas
   only if signed in and it renders. Its business meaning is persisted, but
   ontology-driven AI reasoning has not yet been verified.
5. **3:05-3:45:** Say:
   "The first attempt returned FeatureNotAvailable. After tenant preview
   enablement, the same definition deployed successfully. We verified all
   seven entities and relationships plus six business rules without changing
   the working app. The next acceptance gate is an actual ontology-backed
   query through an authorized consumer, not merely a successful create."

If native modeling is unavailable, skip further browser troubleshooting during
the live demo. The acceptance evidence and existing app are the protected path.
Do not add this segment in full to a 15-minute run without cutting equal time.

## New-feature adoption and next gate

| Capability | Verified classification in this environment |
|---|---|
| Fabric semantic-model create/read/update REST | VERIFIED AVAILABLE; actual new item and round-trip |
| Direct Lake on existing SQL Database OneLake replica | VERIFIED AVAILABLE; real DAX/source comparisons |
| Friendly metadata, explicit measures and one-way relationships | VERIFIED AVAILABLE; persisted and executed |
| Generation-2 ontology API/source format | PREVIEW; creation/read-back VERIFIED AVAILABLE after October 29 enablement retry |
| Ontology persisted entity/relationship/rule/binding definitions | VERIFIED; all 27 parts and 55 property mappings read back |
| Ontology data queries / Agent context | UNVERIFIED; not established by source SQL reads or definition persistence |
| New semantic-model Data Agent integration | NOT TESTED in this frozen-app-safe build |
| Native modeling canvas in integrated browser | BLOCKED in this session; no canvas success claimed |

Next useful step is an **additive separate Data Agent using the model or ontology
context where supported**, only after explicit scope confirmation and actual
source-query validation. Keep the existing app-agent path unchanged.

## Official sources

- [Create semantic model](https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel/items/create-semantic-model)
- [Get semantic model definition](https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel/items/get-semantic-model-definition)
- [Update semantic model definition](https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel/items/update-semantic-model-definition)
- [Definition formats](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition)
- [Direct Lake development](https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-develop)
- [Execute DAX in a workspace](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries-in-group)
- [Ontology source and actual availability evidence](PHASE2_ONTOLOGY.md)

Documentation availability is not tenant enablement. Older semantic-model-bound
ontology restrictions and newer source-native ontology/agent guidance should
not be silently treated as interchangeable; that integration was not executed
here.
