# Zava Security Texas Fleet Command

> **Synthetic data only.** Zava Security is a **fictional company** invented for this
> hackathon. Every vehicle, crew, route, alert and event is made up. Nothing represents
> a real company, customer, facility, person, cargo, incident or security practice,
> and no real customer logos are used. This is a reference prototype, not a
> production system.

> **Sanitized public copy.** Account, tenant, workspace, capacity, Fabric item identifiers and SQL endpoints were replaced with placeholders
> (`<approved-account>`, `<tenant-domain>` and GUIDs of the form `00000000-0000-4000-8000-...`), and deployment state, local settings,
> generated data and the internal plan were left out. Evidence files keep their structure. To run the tools, create your own
> `config/fabric-target.json`; nothing here grants access to any Fabric tenant.

The live demo locator is intentionally omitted. Replace
`<your-protected-fabric-app-url>` with your own approved deployment URL.

The ontology's `<sql-analytics-endpoint>` placeholder also appears in generated
definitions and encoded request payloads. These are sanitized examples, not
deployable bindings; historical verification timestamps and hashes do not validate
the edited examples. Configure an approved source and regenerate/revalidate them
before deployment.

The dependency lockfile preserves its exact versions and integrity hashes but omits
registry download URLs. The project `.npmrc` keeps future lockfiles registry-neutral.
Installs resolve packages through your configured, approved registry; access to
the pinned versions is required. All 754 distinct locked package/version pairs and
their integrity hashes were verified through the configured corporate mirror.
Direct public-npm verification was **unable to complete because HTTPS/TLS failed
in the review environment**, not because a package-not-found response was received.
This is a documented external-verification limitation, not a GitHub source-publication
requirement or a claim that anonymous installation has been verified.

The repository does not configure a private registry, scope override or registry
credential. `@rayfin-app/*` packages are included npm workspaces, not unpublished
packages that must be downloaded. `"private": true` prevents accidental npm
package publication; it does not prevent publishing this source to GitHub.
Microsoft-owned Rayfin dependencies remain required and unchanged. Publisher
metadata for the pinned CLI/guide names GitHub Packages; that does not prove that
the versions are absent from public npm or configure consumers to use that registry.
If an owner-supported installation route uses GitHub Packages, it requires separate
registry authentication even for public packages. Do not copy corporate credentials,
hard-code a corporate mirror, change pinned versions, or disable TLS to install.

> ## Read this first: the live demo runs on a PayGo capacity
>
> The Fabric capacity behind this project, **`demodinoeast2` (F64, East US 2), is a
> PayGo (pay-as-you-go) capacity.** The protected app, the Data Agent, the semantic
> model and the ontology all depend on it, so **the capacity must be turned on before
> any of that content can be viewed.** It is not left running, because it bills while
> on, and may be paused between reviews. The last recorded SQL-connector preflight
> confirmed it **Active on 2026-10-30**; that is not a promise of availability at
> judging time. Recheck before opening the demo.
>
> **The Hackathon owner needs to be nudged by the judges in order to turn on this
> PayGo capacity.** Judges: to view the content, please nudge the Hackathon owner to
> turn it on. Hackathon owner: when nudged, please turn the capacity on, and turn it
> off again afterward to stop billing. Signing in also requires Fabric access to the
> workspace; a link alone does not grant it.

A **reusable Microsoft Fabric Apps (Rayfin) pattern for intelligent operational
applications**, shown as a statewide Texas fleet command center. It takes an
operations manager through one loop on a single Fabric data foundation:
**see an exception -> investigate it -> ask in plain language -> act -> verify**.

The same pattern fits fleet management, logistics, delivery, field service,
utilities, transportation, equipment/asset monitoring, public-safety operations and
mobile-workforce management. Swap the data, regions, terminology and thresholds;
keep the architecture.

## At a glance

| | |
|---|---|
| **Scenario** | Zava Security (fictional) needs one operating picture of 120 invented vehicles across eight Texas regions. |
| **App** | Protected React/Vite Fabric App: Texas map, accessible roster, vehicle details, Houston exception briefing, shared in-app alert inbox. |
| **Data** | App-owned Fabric SQL database defined in code with Rayfin entities and reached through authenticated GraphQL. |
| **AI** | Published Fabric Data Agent called through a Rayfin Function (Fabric-audience token, no stored key). |
| **Semantics** | `Texas Fleet Operations` Direct Lake semantic model (17 measures) and `Fleet_Operations` ontology (7 entities, 7 relationships, 6 rules) over the same SQL data. |
| **Operations** | Native app Metrics, native Function logs, and content-free browser operation diagnostics. |
| **Region** | Fabric capacity in **East US 2**. |
| **Honesty** | Every claim is tied to evidence in [RAYFIN-FEATURES.md](RAYFIN-FEATURES.md); gaps and unverified items are stated, not hidden. |

```text
Browser (private Fabric site, Fabric SSO)
   |  GraphQL (claims-based policies)                  |  askFabricDataAgent
   v                                                   v
Fabric SQL database  <-- app-owned, code-first   Rayfin Function (Fabric token)
   |                                                   |
   |-- OneLake replica --> Lakehouse shortcuts --> Published Fabric Data Agent
   |-- OneLake replica --> Direct Lake semantic model --> (measures)
   '-- SQL analytics endpoint --> Fabric ontology (entities, relationships, rules)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flows and trust boundaries.

## What is verified and what is not

**Verified in this environment:** protected hosting gate, Fabric SSO sign-in and
session restore, complete authenticated reads of all 120 vehicles, filters and
vehicle details, tracked alert lifecycle (create, acknowledge, resolve, reload
repair), Data Agent answers through the deployed Function, native Metrics, native
Function history, six semantic-model DAX results matched against SQL, and ontology
definition read-back plus its rendered native canvas.

**Not implemented or not verified:** Teams/email/webhook delivery to real people,
Secret Store use, Rayfin data connectors in the app, assignee-only access, a second
user's permissions, embedded-in-portal acceptance of the latest build, ontology-backed
queries and Data Agent answers, and realtime GPS. See the limits in each document.

**Separately tested, not shipped in the app:** six [intentional experiments](RAYFIN-FEATURES.md#completed-experiment-results)
cover catalog discovery, semantic/SQL connectors, a second semantic-model agent,
ontology context and local templates. SQL source preflight and local naming worked;
semantic invoke returned 401, ontology context attachment was blocked, and the
minimal-instruction semantic agent scored 5/8 against the existing agent's 7/8.
Tuned results are not an independent benchmark. Feedback through **FB-037** is
summarized in [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md).

## Reuse this pattern

Start with [REUSABLE-PATTERNS.md](REUSABLE-PATTERNS.md) (ten patterns, each with
customization points and limitations). To adapt it to another operation:

1. **Scenario data:** change regions, status vocabularies and counts in the deterministic generator (`tools/synthetic.mjs`, `tools/generate-data.mjs`).
2. **Entities and policies:** change the decorated classes in `packages/data/src` and the shared contracts in `packages/shared/src`.
3. **Map defaults:** region centers and zoom live in the `Regions` data, not in code.
4. **Business rules:** thresholds such as the 15-minute stale rule are in `packages/frontend/src/lib/fleet.ts`, the agent instructions in `config/fleet-agent.json`, the measures in `tools/phase2/fleet-semantics.mjs`, and the ontology in `tools/phase2/ontology.mjs`.
5. **Branding and wording:** the title and header strings in `packages/frontend/index.html` and `packages/frontend/src/App.tsx`.

This is **not** a one-click installer: target workspace, capacity and item IDs are
recorded in `config/fabric-target.json` and must be replaced deliberately.
A parameterization map (what is already configurable and what is a future template
improvement) is in [REUSABLE-PATTERNS.md](REUSABLE-PATTERNS.md#parameterization-map).
The template experiment also confirmed that Git-ignored deployment/environment
state is copied: use the [reviewed staging approach](REUSABLE-PATTERNS.md#safe-future-template-packaging-not-executed),
not the raw working tree, for any future distributable.

## Documentation map

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flows, trust boundaries |
| [REUSABLE-PATTERNS.md](REUSABLE-PATTERNS.md) | Ten reusable patterns and the parameterization map |
| [RAYFIN-FEATURES.md](RAYFIN-FEATURES.md) | Capability claim boundaries and six completed experiment results, with evidence |
| [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md) | Curated, actionable feedback for the Rayfin team |
| [DEMO.md](DEMO.md) | Final judging walkthrough |
| [FEEDBACK-LOG.md](FEEDBACK-LOG.md) | Full evidence ledger behind the feedback (FB-001 onward) |
| [docs/](docs) | Data model, alerts, Data Agent, observability, semantic model, ontology, runbooks |

## Detailed build status and evidence

The sections below are the working build record. Counts such as active alerts change
as operators use the shared inbox; the original scenario baseline is 120 vehicles,
16 delayed (nine in Houston), 25 active alerts across 19 vehicles and 10 stale reports.

## Current state: live fleet map, Data Agent Q&A, tracked alerts and observability

The app-owned Fabric SQL database and history Lakehouse have been provisioned and
populated. Fresh SQL reads verified every field of **3,583 operational records**
and **3,840 history records**, not just deployment or upload acceptance.

- 120 fabricated vehicles in eight Texas regions.
- 38 alerts: 25 open across 19 vehicles, plus 13 resolved.
- 2,880 telemetry points, 150 assignments, and 320 fleet events.
- 30 completed days of regional KPIs and per-vehicle history.
- 13 enabled, trusted SQL foreign keys; six-decimal-place coordinates.
- Deterministic generation and no-overwrite, transactional initial loading.

The fleet map uses authenticated, paginated GraphQL reads from that
database, not bundled fixture data. Normal Fabric popup SSO was verified in a
local production preview, including session restoration after reload.

- All **120** vehicle markers and matching accessible roster rows, with
  Enter/Space marker selection and keyboard-operable controls.
- Region, status, attention, and vehicle/call-sign search filters.
- Source-derived counts: 16 delayed vehicles, 25 active alerts across 19 vehicles,
  four critical alerts, and 10 stale reports in the default scenario.
- A computed Houston exception briefing, vehicle selection, current assignment,
  health/energy information, and existing active alerts.
- Explicit scenario-clock calculations, loading/error/empty states, retry,
  responsive layout, and light/dark themes.
- Below the map, **Ask the fleet** appears before the **Shared alert inbox**,
  matching the investigate-then-act workflow and keyboard reading order.

**Open the protected app:** `<your-protected-fabric-app-url>` (deployment URL placeholder).
Sign in with the approved tenant account. The hosted private-site gate, normal
browser sign-in, session restoration, complete reads, filters, vehicle details,
and controlled data-error/retry recovery have been verified.

The Fabric portal's embedded view initially remained loading/blank (FB-014).
A prior bundle subsequently rendered through the actual Fabric host in the owner
session. The hardened release's embedded handoff is not yet verified, so retain
the validated protected standalone link as the demo entry. Stale/different-user
replacement and second-user behavior remain unverified.

**Data Agent milestone:** the existing Lakehouse now exposes six read-only
OneLake shortcuts to operational tables. The new fleet agent's published MCP
endpoint returned real source-backed answers using the approved author identity.
The deployed Q&A panel calls the published agent through a real Fabric-audience
Rayfin Function. Hosted app-owner access, seven question paths, explicit
failure/retry recovery, and source comparisons have been exercised. Verified
results include 19 alert-affected vehicles, Houston's nine delayed vehicles,
ten stale reports, and SYN-027's 38-minute delay.

A broad attention answer initially miscounted affected vehicles and omitted a
delayed vehicle. Tighter query/response instructions produced the correct
priority-ordered 25-row result on retest; this is **not** a guarantee of generated
answer accuracy. The app always warns users to check answers against source data.
See [Data Agent setup and validation](docs/DATA_AGENT.md) and FB-019.

A fresh hardening check also caught a SYN-027 answer reporting three active
alerts where subsequent operational and agent-source SQL both returned two.
The same unchanged question then returned two correctly; the cause remains
unproven, not fixed by that retest. Use the source-reviewed HOU/nine regional
question for the main demo and keep analysis advisory. See FB-025.

**Alert milestone deployed and verified:** a shared in-app inbox now implements
create -> acknowledge -> resolve and persisted linked events, with fictional
same-region recipients, caller-subject creation checks, and explicit partial-save
repair after reload. Saved records update map counts, badges and selected-vehicle
details. Browser and SQL checks verified the lifecycle, a controlled event-write
outage, same-request recovery, rejected creator spoofing and rejected immutable-field
edits. Only the three temporary verification alerts and their six linked events
were cleaned up; all original operational/history data was independently reverified.
No real teammate notification or assignee-only access is implied. See
[tracked alert workflow](docs/ALERTS.md) for clocks, retries and prototype limits.

**Observability deployed:** native app Metrics and persisted Function invocation
logs were verified in the owner session. Content-free browser operation spans
now distinguish success, failure and a confirmed alert with an incomplete
timeline. Hosted tests verified real reads, agent failure/real retry, partial
save/reload repair and a further persisted alert lifecycle. Only its one
additional temporary alert and three events were cleaned up; no reseed occurred.
Browser console diagnostics are not durable native Logs. See
[observability and troubleshooting](docs/OBSERVABILITY.md).

**Demo package prepared:** use the [six-minute runbook](docs/DEMO_RUNBOOK.md),
[submission draft](docs/SUBMISSION_DRAFT.md) and
[evidence checklist](docs/SUBMISSION_CHECKLIST.md). These are review-ready
working documents, not a submitted or accepted entry.

**Not implemented:** Teams/email delivery, real-recipient identity mapping,
assignee-only access, the app's history connector, and secret integration.
The Data Agent remains read-only and uses platform-provided Fabric tokens, not
a stored API key. No simulator or realtime position feed is implied.

## Additive Phase 2: semantic model verified; ontology created

Phase 2 left the operational app **unchanged**; subsequent user-requested
layout-only updates preserve its existing data and agent paths. A new
**Texas Fleet Operations** semantic model reuses the SQL Database's existing
OneLake replica: seven Direct Lake tables, 61 curated columns, 17 explicit
business measures and five active one-way relationships. Six real DAX answer
sets matched contemporaneous operational SQL, including **120 vehicles,
54 needing attention, four critical vehicles and ten stale reports**.

At Phase 2 acceptance the source contained **26 active alerts across 20
vehicles**, reflecting an additional source record observed during this
session; Phase 2 performed no source writes. Earlier 25/19 counts above are
the original seed/hardening observations, not current guaranteed totals.

After the user enabled the tenant preview, **Fleet_Operations** was created on
October 29. Fabric read-back verified all **27 definition parts**, **seven
entities**, **seven relationships**, **55 bound properties** and **six business
rules**. The earlier **403 FeatureNotAvailable** rejection is retained as
historical feedback. Source SQL reads and definition persistence passed;
queries through the ontology and ontology-backed agent answers remain unverified.
Fabric also provisioned associated GraphModel, Eventhouse and KQLDatabase items;
no explicit graph refresh was submitted, and graph data load/capacity consumption
have not been verified.
No tenant settings, permissions, original agent or app deployment were changed
by the implementation.
See [Phase 2 model, acceptance and demo notes](docs/PHASE2_SEMANTIC_MODEL.md)
and [ontology creation and evidence](docs/PHASE2_ONTOLOGY.md).

## Approved cloud boundary

| Setting | Value |
|---|---|
| Account | `<approved-account>` (value intentionally omitted) |
| Tenant | `<tenant-id>` (value intentionally omitted) |
| Workspace | **Trucks Rayfin** |
| Workspace ID | `<workspace-id>` (value intentionally omitted) |
| Capacity | **demodinoeast2**, F64, **East US 2**, **PayGo: must be turned on to view any content** (see the notice at the top of this file) |
| AppBackend / app-owned SQL database | `tx-fleet-command` |
| Lakehouse | `tx_fleet_history` |
| Published Data Agent | `tx-fleet-operations-agent` |
| Associated UserDataFunction | `tx-fleet-command` |

All new Fabric artifacts belong **only** in this workspace. Do not create another
workspace or switch regions as a workaround. Exact item IDs are recorded in
[config/fabric-target.json](config/fabric-target.json); set your own account, tenant
and workspace ID there (those values are deliberately not written in this
documentation). Cloud tools verify the
account, tenant, workspace assignment, and active capacity before using them.
They use the existing Azure CLI session; they do not initiate login or store tokens.

## Local setup and validation

Run from the project root using PowerShell. Use Node 24 (validated with 24.22.1),
npm 11, and Azure CLI with the approved account. Rayfin packages are pinned to 1.36.2.

### Prerequisites for a new clone

- Obtain registry access to the exact pinned dependencies. The corporate-mirror
  verification above is not a guarantee of anonymous installation from every
  network. The project inherits your npm registry configuration.
- Use the GitHub CLI and normal approved sign-in where required by the pinned
  Rayfin workflow, plus working OS credential storage for Fabric token caching.
  Do not enable a plaintext credential fallback for this reference app.
- Have your own Fabric account, accessible workspace, active capacity, required
  AppBackend/SQL/Functions permissions and tenant feature availability. The
  original demo's tenant, capacity and hosted services are not supplied by cloning
  this repository. No Microsoft-employee-only dependency access requirement was
  established by this review; preview/tenant entitlement and package access still
  need to be checked for your account.
- Replace the placeholders in `config/fabric-target.json` and the relevant
  optional phase-2 configuration with your own approved resource names and IDs.
  Configure your own protected app redirect URI in `rayfin/rayfin.yml`.
- Provision/select your backend using the installed Rayfin 1.36.2 Fabric workflow.
  The custom `app:deploy`/`data:deploy` wrappers deliberately require an existing
  matching backend and CLI-generated `rayfin/.deployments.json`; they are not
  first-time installers. Generated deployment/environment files are intentionally
  absent from this public copy and must not be copied from the original project.

Install dependencies from the workspace root; npm links the four included
workspaces. After configuring the backend, run the validation gates serially:

```powershell
npm ci
npm run typecheck
npm run build
npm run lint
npm test
npm run data:test
```

The data test command builds its entity definitions first, including on a clean
checkout. Frontend and data builds share TypeScript outputs: run these gates
serially, not concurrently.

The frontend prebuild runs `rayfin env --framework vite`; development and runtime
also need the deployment-specific backend configuration. This is a connected
reference implementation, not an offline mock or a one-command installer.
The publication review verified the dependency definitions and an offline
`npm ci --dry-run --ignore-scripts` install plan, not a fresh install/build against
a newly provisioned tenant. The historical release results below are not a claim
that a clean external clone was rebuilt in the publication-review environment.

The 2026-10-30 rebrand release (Node 26.13.0) passed typecheck, build, lint, the
Functions validator, **113 frontend tests across 14 files**, **118 data/schema tests**
and **18 MCP transport tests**. The earlier hardening release (Node 24.22.1) passed
**112** frontend and **116** data/schema tests. Hosted writes and reload-based recovery were
verified, then all **3,583 original operational + 3,840 history rows** and
**13 trusted/enabled foreign keys** were reverified after targeted test cleanup.
A fresh hosted Function-to-agent answer and inbox refresh also passed; regional
vehicle/delay totals matched SQL. Transport tests do not prove arbitrary generated
answer accuracy.

This Windows host intermittently fails to start Vitest workers before any test
executes, with either pool. A single worker is substantially more reliable than
the default parallel run:

```powershell
npm run --workspace=@rayfin-app/frontend test -- --pool=threads --maxWorkers=1
# Alternative if the worker fails to start:
npm run --workspace=@rayfin-app/frontend test -- --pool=forks --maxWorkers=1
```

Treat worker startup failure as a failed gate, not a passing test result.
Rerun the affected suite and require every test file to pass before deploying.
Do not increase assertion timeouts or skip tests to bypass it.

## Running and deploying the app

The configured backend must already exist and the approved capacity must be turned on
(it is a PayGo capacity and is not left running; see the notice at the top).

```powershell
# Standard local development, using the Rayfin CLI's own login:
npx rayfin login --tenant <tenant-id>
npm run dev

# Normal browser SSO without the CLI local-auto-login path:
npm run build
npm run --workspace=@rayfin-app/frontend preview -- --host localhost --port 5173 --strictPort

# Preview deployment; then apply to the existing approved app:
npm run app:deploy
npm run app:deploy -- -Apply
```

In the production preview, use **Sign in with Microsoft** and the approved tenant
account. The Microsoft/Fabric popup brokers the session; do not paste tokens or
credentials. This path was used because the installed CLI reported an unreadable
cache and an unavailable OS keychain. No plaintext credential-storage fallback
was enabled. See FB-010 and FB-012 in [the feedback log](FEEDBACK-LOG.md).

`app:deploy` verifies identity, capacity, workspace, and the recorded existing app
ID, runs a dry run, and includes protected static hosting. It excludes Functions
unless explicitly passed `-IncludeFunctions`; use that switch for the Q&A build.
`data:deploy` still excludes both static content and Functions. Neither command
uses `--force`. Run static gates before deployment and validate the actual hosted
and Fabric-embedded experiences afterward.

The optional public OpenStreetMap basemap requests only viewport tiles, never
the fleet records or application credentials. Tile failures display a warning;
the Fabric-backed markers and roster remain usable. Markers near the same city
can overlap at statewide zoom: zoom in or select the roster to inspect a vehicle.
Leaflet attribution is retained. Fonts use Google Fonts with system fallbacks.

## Reproducing the data

```powershell
npm run data:generate
npm run data:deploy
# Review the dry run before applying:
npm run data:deploy -- -Apply
npm run data:seed
npm run data:verify
npm run data:load-history
npm run data:verify-history
```

These are commands for the **configured existing deployment**, not a one-click
installer for arbitrary tenants. `data:deploy` excludes static content and Functions.
For another environment, obtain approval, provision the correct items, and
deliberately update target configuration first; never reuse these item IDs.

Generation writes ignored files under `data\generated`: the SQL seed, two history
CSVs, and ground truth. The default scenario clock is **2026-10-27 15:00 UTC
(10:00 AM America/Chicago)**, not the current wall clock. Use `SimClock.asOf` for
questions such as "in the last hour" and "not reported recently."

`data:seed` loads an entirely empty operational schema in one transaction. If any
rows already exist, it only verifies an exact match; it never replaces data.
It rejects seed flags. Do not rebase or change the generator seed for this
populated deployment and expect a rerun to overwrite it. A future reset workflow
must preserve operator-created alerts and requires separate design/authorization.

History loading preserves existing tables and identical source files. A completed
Delta load does **not** prove SQL analytics readiness. If tables are temporarily
missing from the SQL catalog:

```powershell
npm run data:refresh-history
npm run data:verify-history
```

The refresh requests no table recreation. `NotRun` with a previous successful sync
is reported explicitly; only the subsequent query verifier proves readiness.
Failed or timed-out operations must be inspected by operation ID before retrying;
never resubmit an accepted load blindly.

## Authentication and permissions

Fabric auth is enabled, password auth is disabled, and entity APIs require an
authenticated user. Reference/telemetry records are API-read-only. Alert and event
write permissions and owner-write note policies are defined in the entity classes.
They are prototype policies, **not** a tested dispatcher/manager RBAC implementation.
Fictional team identities have not been mapped to real recipient accounts.

Owner-token SQL access is verified. A separate SDK direct-Entra-token smoke test
returned `AUTH_FAILED` for both Fabric and Power BI token audiences. Those CLI
tokens contained `user_impersonation`, not the `Item.Execute.All` delegated scope
required by the installed guide. Normal brokered browser SSO and authenticated
Data API reads now succeed on localhost and protected standalone hosting; that
success does not prove the separate direct-token path. Authenticated browser
alert writes were subsequently verified independently; see [alert validation](docs/ALERTS.md).

| Authentication path | Observed outcome |
|---|---|
| Protected site's signed-out asset gate | Passed; private-site sign-in screen before app content |
| Normal Microsoft/Fabric browser sign-in | Passed on localhost and the hosted URL |
| Valid stored-session restoration | Passed after hosted reload; all 120 markers returned |
| Replacing a stale/different-user session | Not exercised live; existing bootstrap/gate tests retained |
| Actual Fabric-embedded handoff | Prior bundle rendered in the owner session; hardened release not yet verified |
| Rayfin CLI local-auto-login | Blocked by secure-cache/keychain errors; no plaintext fallback |
| Direct Entra token exchange | Separate `AUTH_FAILED`; required delegated scope not present |

No anonymous fallback or weakened hosting/API policy was enabled. The alert
milestone verified create, acknowledgement, resolution and linked-event recovery
using temporary operator-created records. Targeted cleanup removed those records
only; no generated fixture row was changed or deleted. Subsequent real operator
actions will naturally change alert/event counts; do not reseed or reset them
just to match the original fixture verifier.

## Project layout and documentation

| Location | Responsibility |
|---|---|
| [packages/data/src](packages/data/src) | Ten decorated, code-first operational entities |
| [packages/shared/src](packages/shared/src) | Browser-safe contracts and enums |
| [packages/frontend](packages/frontend) | Authenticated, SQL-backed Leaflet fleet app |
| [packages/functions](packages/functions) | Fabric-authenticated, bounded MCP agent invocation |
| [tools](tools) | Generator, guarded deployment, SQL/OneLake loading, verification |
| [tests](tests) | Synthetic scenario and schema/helper tests |
| [rayfin/rayfin.yml](rayfin/rayfin.yml) | Services and deployment configuration |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tables, relationships, ground truth, sample SQL |
| [docs/DATA_AGENT.md](docs/DATA_AGENT.md) | Agent source, publication, trust boundary, tests, accuracy limits |
| [docs/ALERTS.md](docs/ALERTS.md) | Shared inbox, lifecycle, clock/identity semantics, partial-save repair and validation |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | Native Metrics/Function history, safe browser spans, interpretation and release evidence |
| [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) | Six-minute story, preflight, bounded recovery and protected demo scope |
| [docs/DEMO_SCRIPT_15MIN.md](docs/DEMO_SCRIPT_15MIN.md) | Fifteen-minute presenter script with spoken lines, timing, cut order and Q&A |
| [docs/SUBMISSION_DRAFT.md](docs/SUBMISSION_DRAFT.md) | Human-review submission narrative and all six judging criteria |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Verified evidence versus remaining packaging/identity gates |
| [FEEDBACK-LOG.md](FEEDBACK-LOG.md) | Reproducible product observations and evidence gaps |

Do not publish the internal plan or source-document excerpts. Review tenant IDs,
screenshots, logs, and feedback evidence before sharing externally. Never include
tokens, connection credentials, webhook URLs, or secret values.
