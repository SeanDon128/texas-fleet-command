# Zava Security Texas Fleet Command

**DRAFT FOR HUMAN REVIEW - NOT SUBMITTED**

> **October 30 update:** the current feature claims, reusable patterns and product
> feedback are maintained in [RAYFIN-FEATURES.md](../RAYFIN-FEATURES.md),
> [REUSABLE-PATTERNS.md](../REUSABLE-PATTERNS.md) and
> [PRODUCT-FEEDBACK.md](../PRODUCT-FEEDBACK.md). Where this draft is older, those
> documents win. The semantic model and ontology (Phase 2) are described there.

Prepared October 28, 2026. The new protected bundle is deployed; static gates,
standalone runtime, and recovery checks passed within the scopes below.
New-release embedded acceptance and browser-to-native log correlation are
blocked/unverified in the latest native follow-up; full normal-Edge captures,
video, and submission review remain incomplete. A new generated-answer failure
remains unresolved. No judging scores, production readiness, or customer ROI
are asserted.

## Pitch

Texas Fleet Command connects a statewide operating picture to investigation and
a tracked action. An operator explores 120 fictional vehicles across eight Texas
regions, asks a published Fabric Data Agent about an exception, and creates an
in-app alert assigned to a fictional teammate. The shared inbox supports
acknowledgement, resolution, and a linked timeline that survives reloads.

The prototype uses Microsoft Fabric Apps/Rayfin, an app-owned SQL database,
OneLake shortcuts, and a server-side Function. Native preview Metrics and durable
Function invocation-log retrieval were verified in the owner session. The goal
is a credible, inspectable
**observe -> investigate -> act -> verify** reference, not a simulation of a
real company's operations.

**All data is completely invented. Zava Security is a fictional company; this is not
real operational data, practices, procedures, people, vehicles, facilities, or
incidents of any actual company.** No customer
endorsement, real-person alert delivery, or production deployment is implied.

Protected demo: `<your-protected-fabric-app-url>` (deployment URL placeholder).
Access requires approved authentication and permissions; a link does not grant
judges access.

> **PayGo capacity: it must be turned on before judges can view the content.** The
> Fabric capacity `demodinoeast2` (F64, East US 2) is a **PayGo** capacity. The app,
> Data Agent, semantic model and ontology all depend on it, so none of them can be
> viewed while it is off. **The Hackathon owner needs to be nudged by the judges in
> order to turn it on.** It bills while on, so it should be turned off again after judging.

New-bundle standalone owner-session acceptance is verified.
New-release embedded runtime and browser-to-native log correlation remain
blocked/unverified; second-user acceptance is also uncompleted.

## Illustrative customer problem and potential impact

A fictional fleet operator needs to answer three connected questions: where is
an exception, what does the underlying data say, and has anyone tracked the
follow-up? The prototype brings those tasks into one interface rather than
leaving investigation and action disconnected.

The original frozen scenario makes the story concrete: Houston accounts for
nine of 16 delayed vehicles, and SYN-027 is 38 minutes late with two active
alerts, including one critical. These are synthetic seed facts, not measured
customer outcomes. Current alert counts can change as operators use the app.

Potential benefits are easier exception discovery, source-backed investigation,
and visible follow-through. No time savings, safety improvement, cost reduction,
adoption result, or real-world effectiveness has been measured. Reuse would
require domain validation and stronger production authorization/workflow controls.

## Implemented architecture

```text
Approved browser session / protected Fabric App
  |
  +-- Map, roster, details and shared alert inbox
  |     -> typed authenticated GraphQL
  |     -> app-owned Fabric SQL: operational records, alerts, linked events
  |
  +-- Read-only Q&A
        -> typed server-side Rayfin Function
        -> platform-provided Fabric token / app-owner external-resource identity
        -> published Fabric Data Agent via bounded MCP
        -> six read-only shortcuts in the existing Lakehouse
        -> existing OneLake replica of operational SQL

Owner management view -> native preview App Metrics
Associated User Data Functions item -> native per-invocation historical logs
```

The six agent tables cover regions, vehicles, assignments, alerts, fleet events,
and the scenario clock. There is no second operational seed or manually
synchronized copy. OneLake/catalog replication can lag direct SQL reads.
Thirty days of synthetic history exist, but the history connector is not wired
into the app.

Telemetry and analytical time windows use **2026-10-27 15:00 UTC**, the frozen
scenario clock. New alert actions use actual UTC action timestamps, displayed in
Central time. A new action is not evidence that telemetry advanced.

Agent access to external Fabric resources uses the app owner's identity, not
each viewer's source permissions. Source selection and agent instructions are
not authorization boundaries; per-user agent row-level security is not claimed.
The browser does not receive a Fabric bearer-token bridge or a stored API key.

## Response to the six judging criteria

### 1. Use-case strength and customer impact

The demonstration has one persona-driven task: investigate a regional exception
and track a follow-up on a selected vehicle. The map, concrete source comparison,
and saved alert lifecycle make the outcome inspectable. Impact is an
illustrative opportunity, not a verified customer improvement.

### 2. Reusability and template quality

Reusable implementation patterns include typed entities and client contracts,
deterministic synthetic generation, a scenario clock, a filterable map/roster,
a bounded server-side agent bridge, and explicit two-write recovery.
These patterns could inform logistics, field service, utilities, or delivery
prototypes without representing any actual customer's workflow.

This repository is configured for its existing deployment. It is **not** a
validated one-click cross-tenant template. Geography, branding, thresholds,
scenario packs, source selection, and target resources are potential template
parameters, not a completed parameterized installer. Another environment needs
deliberate configuration, authorization, provisioning, and end-to-end acceptance.
The inherited target configuration must not be blindly reused.

### 3. New feature adoption

The reference combines capabilities into a working slice instead of adding
connectors or secrets solely to increase a feature count:

| Capability used | Evidence and learning | Boundary |
| --- | --- | --- |
| Fabric App protected hosting, Fabric SSO, code-first relational data, typed GraphQL | Hosted reads, reload restoration, alert mutations, and linked-event readback were exercised. Original data/relationships were independently rechecked after exact temporary-test cleanup. | Owner-session evidence is not a consumer-permission matrix or production RBAC proof. |
| Rayfin Function with Fabric-audience application authentication | The hosted Function invoked the published agent with the platform-provided token; the transport performs MCP initialization and tool discovery with bounded time/response sizes. | No stored secret, service-principal integration, or browser token bridge is claimed. |
| Published Fabric Data Agent over six OneLake shortcuts | Seven question paths were compared with source data, including regional delays and one vehicle investigation. The existing SQL replica is reused. | Read-only advisory analysis; replication lag and generated-answer errors remain possible. This is not an implemented app history connector. |
| Native App Metrics, preview | The owner-session Metrics UI loaded; its native metrics-query request returned HTTP 200 and populated six metrics. | No broad availability or end-to-end agent-latency claim; native Function logs were verified separately. |
| Native Function historical logs | The associated User Data Functions item's owner-session history showed 12 Succeeded invocations with UTC date, duration, and invocation reference; inspected details contained the actual content-free application completion event. | Durable per-invocation runtime retrieval, not general AppBackend/database/frontend coverage. Retention/export/RBAC/ingestion SLO are unverified. Succeeded is not semantic answer success. |
| Shared alert workflow with explicit partial-save repair | Create, acknowledge, resolve, reload, and recovery after a controlled event-write failure were verified. | App logic, not a new native workflow/transaction service; assignments do not send notifications. |

The Metrics observation is dated: the 24-hour window ending
**2026-10-28 15:00 UTC** showed six sign-ins, 14 app loads, 220 queries, two
JSON-level errors, 1.42% backend-aggregated error rate, and 229.96 ms
backend-average query duration. These are snapshots, not targets or agent
response timings. The error-rate denominator/aggregation semantics remain
unconfirmed; no root cause is asserted. For recent demo traffic, the verified
choice is **Last 24 hours**: the observed 7/30-day windows ended at UTC midnight
and omitted the current partial day.

For native runtime logs, the verified route is **AppBackend Manage app ->
Functions -> existing associated User Data Functions item -> askFabricDataAgent
in Functions explorer -> More -> View historical log -> invocation date**.
The most recent inspected invocation was **2026-10-28 14:15:38.811 UTC**, with
**41,229 ms** runtime duration; its `fleet-agent-completed` event reported
**40,209 ms** elapsed time and a request reference. These are an observed
invocation's different timing scopes, not a latency SLO. No raw log payload or
actual invocation/request identifier is included here.

Runtime **Succeeded** is not proof of a correct answer: the Function can return
a typed failure result while completing successfully. Inspected platform context
contained token-presence/count/audience indicators; no token values were
observed. That inspection does not certify every possible log or source.

### 4. Implementation quality

The implemented slice includes paginated data reads, explicit loading/empty/error
states, keyboard-operable controls, responsive light/dark layouts, and visible
generated-analysis warnings. Alert creation checks caller identity; update
permissions restrict mutable fields. Same-tab guards, stable request IDs,
deterministic event IDs, and saved metadata support explicit retry and repair.

Alert and event changes are separate writes. Recovery is not a transactional,
concurrency, exactly-once, or tamper-proof audit guarantee. Final static gates for
the current hardening source passed:

| Static gate | Verified result |
| --- | --- |
| Typecheck, build, lint | PASS |
| Frontend tests | 112 passed across 14 files |
| Data/schema tests | 116 passed |
| MCP transport tests | 18 passed |
| Functions validator | PASS; 1 authored/generated Function, 0 unsafe casts |

The new protected bundle is deployed to the same app. Fresh private gate/sign-in,
120 interactive markers and 120 roster entries, and actual fleet/inbox success
spans passed. **New-release embedded acceptance and browser-to-native
invocation-log correlation remain blocked/unverified**, not completed by
standalone acceptance.

A clean standalone reload at **2026-10-28 16:49 UTC** served the same deployed
bundle with 120 interactive markers, 120 roster entries, cards **120 vehicles /
16 delayed / 25 active alerts / 10 stale**, and `fleet.load` / `alerts.load`
success spans. **Zero page/console errors, failed app-origin requests, or app HTTP
errors were observed in that bounded reload window only.** This does not describe
the earlier controlled failures or all sessions. After context settled, the
inbox showed 25 active of 38 total alerts, the cleaned-up temporary message was
absent, keyboard SYN-027 selection opened actual assignment SYN-ROUTE-027, the
960px layout had no horizontal overflow, and Q&A was honestly empty after reload.

Native AppBackend/User Data Functions reload attempts during **16:45-16:48 UTC**
remained bootstrap/blank in the integrated browser, preventing inspection of the
new hosted iframe or new history entry. Prior-bundle embedded rendering and
earlier owner-session native Metrics/persisted-log retrieval remain valid
observations; neither proves new-bundle embedding or cross-reference correlation.
No root cause or general service outage is established.

One additional temporary alert encountered Chromium `ERR_NETWORK_IO_SUSPENDED`,
not a proven Fabric outage. After an initial failure, retry of the same request
saved one Alert and no events, with explicit partial/timeline-incomplete
diagnostics. Reload repair reconstructed the original creator/time.
Acknowledgement/reload/resolution/reload passed, and SQL confirmed all three
event actors/times. Exact-ID guarded cleanup removed only this one temporary
alert and its three events; the earlier release's three alerts/six events were
separate historical checks. Original 3,583 operational rows, 13 foreign keys, and
3,840 history rows were reverified without reseeding.

A controlled browser-only agent HTTP 503 removed the prior answer, showed safe
error/Retry, and left the map intact. After interception was removed, real
keyboard retry returned HOU/nine at **2026-10-28 16:40:11.976 UTC**: 11,569 ms
observed browser wait versus 11.1 s app-reported server time. This is a recovery
sample, not a latency SLO or proof of answer reliability.

**New semantic failure, unresolved:** at **16:37 UTC on October 28**, the original
"Why does SYN-027 need attention?" question returned three active alerts, one
critical. Operational SQL at **16:42 UTC** and the actual Lakehouse agent SQL at
**16:43 UTC** each showed exactly **two open alerts**, one critical, a 38-minute
delay, healthy status, and non-stale telemetry. The unchanged question repeated
during **16:43:54-16:44:26 UTC** returned two correctly. Root cause is unproven:
do not assume lag/caching or describe this as fixed. Prefer the HOU regional-delay
question for the protected demo and source-check before acting. Transport success
and a correct repeat do not certify this question or all seven historical paths.

### 5. Product feedback quality

Feedback separates observed behavior, bounded reproduction, impact, mitigation,
and a specific improvement request. Important findings include:

| Observation | Evidence-informed mitigation | Specific product/documentation request |
| --- | --- | --- |
| A broad attention answer miscounted affected vehicles and omitted a delayed vehicle despite a correct source query. | Refined query/answer instructions; exact-question and one priority-paraphrase retests matched the reviewed source result, including row order. | Surface query/result provenance and synthesis-consistency checks; distinguish capped lists from fleet totals. Successful samples still do not guarantee accuracy. |
| A new SYN-027 answer counted three active alerts; both operational SQL and the actual agent-source SQL showed two. An unchanged-question repeat then returned two correctly. | Keep the failure visible; prefer the HOU demo question and compare complete answers with source before action. No fix or lag/caching diagnosis is established. | Add repeatability/source-comparison diagnostics and synthesis-consistency checks; separate runtime success from semantic correctness. |
| Typed convenience lookups returned only an ID at runtime; update results were projected, not full entities. | Explicit field selection, authoritative returned-field merging, and mocks matching actual response shapes. | Make result projections explicit in types and documentation; include readback examples. |
| An alert could save while its separate timeline write failed. | Keep the confirmed alert, expose partial completion, and reconstruct missing events after reload using saved metadata and stable IDs. | Provide a caller-authorized conditional transaction/outbox pattern and clear policy-denial diagnostics. |
| Live MCP version negotiation and installed Function timeout signatures differed from starter guidance. | Support the reviewed protocol versions and follow installed per-call timeout contracts; fail visibly rather than fabricate an answer. | Keep starter transports, skills, SDK signatures, and host-limit documentation version-aligned. |
| Native Metrics now loads, but the displayed rate is not explained by dividing the displayed error count by query count. | Preserve the observed values/window without inferring the denominator or blaming a component. | Document metric aggregation/denominator and UTC-window semantics; clarify JSON-level error classification and safe drill-down. |
| Native Function historical logs are retrievable, but discovery crossed several portal surfaces and the installed guide 1.36.2 has a native-observability documentation gap. | Follow the associated User Data Functions item's historical-log route and inspect the actual completion event, separately from the invocation status. | Document the end-to-end navigation, timing scopes, runtime versus typed-result success, and supported retention/export/access boundaries. |
| A prior bundle rendered embedded, but the latest native AppBackend/User Data Functions reload attempts remained bootstrap/blank, blocking new-iframe/history inspection. | Keep the verified protected standalone route; retain earlier native Metrics/log observations without marking new-release embedding or correlation passed. | Distinguish management-page, workload, iframe, and runtime readiness; document actionable handoff and native-history diagnostics. |

Positive evidence matters too: owner-runtime token delivery, source reuse through
shortcuts, field-level update denial, and reload-based alert repair worked in the
tested environment. Any external feedback package still needs independent privacy
review and scrubbed evidence; no issue filing or feedback submission is claimed.

### 6. Uniqueness and learning value

The distinguishing feature is the closed investigation-to-action loop over one
synthetic operating picture, together with honest failure semantics. The frozen
scenario clock makes analytical questions reproducible while actual action times
keep workflow history intelligible. Separating source correctness, generated
synthesis, transport success, and persisted action evidence is a reusable lesson.

## Verified, pending, and not implemented

| Status | Scope |
| --- | --- |
| **New protected bundle verified / tested owner session** | Fresh gate/sign-in; final 16:49 UTC clean standalone reload with 120 interactive markers/120 roster entries, cards 120/16/25/10 and success spans; zero page/console/app-origin request/app HTTP errors in that reload window only. Settled inbox 25 active/38 total; removed temporary message absent; keyboard actual-assignment selection; no 960px overflow; empty Q&A after reload. Same-request alert recovery, lifecycle, SQL confirmation, controlled agent 503/HOU retry, and exact one-alert/three-event cleanup with original-data reverification remain separate observed checks. |
| **Historical sampled paths, not an accuracy certification** | Seven question paths had earlier source comparisons; the new SYN-027 overcount and correct unchanged-question repeat are documented above. Earlier creator/immutable-field denial checks and three-alert/six-event cleanup are separate historical evidence. |
| **Native observability verified separately this turn** | Six native preview Metrics and durable Function per-invocation historical-log retrieval in the owner session. Dated snapshots; Metrics aggregation semantics remain unresolved. Native history is not generalized application log coverage. |
| **Browser helper hosted / final static gates passed** | Content-free spans use fixed allowed operation/outcome/code values, correlation UUID, elapsedMs, and optional UUID-only serverRequestId; no content/identity/record IDs/tokens or external sink. Hosted fleet/inbox success and partial/timeline-incomplete spans were observed. Browser-to-native correlation remains separate. |
| **Blocked/unverified native follow-up** | Integrated-browser native reload attempts at 16:45-16:48 UTC could not expose the new hosted iframe or new history entry. New-release embedding and browser-to-native correlation are not proven; earlier native Metrics/logs and prior-bundle embedded rendering remain valid historical observations. |
| **Pending packaging, other acceptance, and unresolved accuracy** | Unresolved SYN-027 semantic discrepancy; full normal-Edge captures/video and native follow-up; second-user permissions and stale/different-user replacement; generalized AppBackend/database/frontend log coverage and retention/export/RBAC/ingestion SLO; final source/privacy/licensing review and submission/access requirements. One inspected saved image supports header/KPIs only, not a full map or submission-ready visual package. |
| **Not implemented / not claimed** | Teams/email, real-person delivery or recipient mapping, assignee-only access, per-user agent RLS, transactional/concurrent workflow or production audit guarantees, app history connector, secret integration, realtime telemetry/simulator, packaged parameterized installer. |

Existing Function application logs contain request reference, outcome code, and
elapsed time, not prompts, answers, or tokens; the actual completion event was
retrieved through native invocation history. New hosted browser spans were also
observed, but remain separate from durable native retrieval; new-release
browser-to-native correlation remains blocked/unverified. No new cloud resources were
needed solely for this hardening.

## Final human-review actions

Confirm the current hosted release and access path, source-check the recorded
questions, capture the persisted lifecycle, native Metrics, and a privacy-reviewed
native invocation-history summary in normal Edge,
complete the code/privacy/license review, and reconcile every pending claim with
actual evidence. Do not publish the working repository or linked material
unreviewed. The newly inspected header/KPI screenshot does not complete full-map
capture, normal-Edge evidence, video, or submission-readiness gates.

Use the [demo runbook](DEMO_RUNBOOK.md) for the six-minute walkthrough and the
[submission checklist](SUBMISSION_CHECKLIST.md) for final gates. Technical
explanations are in [Alerts](ALERTS.md), [Data Agent](DATA_AGENT.md), and
[Observability](OBSERVABILITY.md); their
linked configuration/evidence must also pass external-sharing review.
