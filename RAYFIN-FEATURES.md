# New Rayfin / Fabric Apps features: what we used, what we learned

Zava Security is a **fictional company**; all data is synthetic. This document maps newer
Rayfin and Fabric capabilities to **real implementation and evidence**. A capability counts
only if it was exercised; anything else is labeled as such. Environment: Rayfin 1.36.2,
Fabric capacity `demodinoeast2` (F64, East US 2, **PayGo**: it must be turned on for judges to view anything, and the Hackathon owner needs to be nudged by the judges in order to turn it on), October 2026. Findings are observations in
one tenant, not general claims. Full detail for each lesson is in [FEEDBACK-LOG.md](FEEDBACK-LOG.md);
the curated asks are in [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md).

## Submission claim boundaries

Reconciled on **2026-10-30** against six recorded experiments and **FB-001 through
FB-037**. This is an evidence inventory, **not a claim of 16 new features shipped
in the app**: Rayfin runtime capabilities, supporting Fabric artifacts and isolated
experiments are different scopes. Counts below are recorded snapshots, not fresh
live queries from this documentation update.

| Scope | What the evidence supports | Do not imply |
|---|---|---|
| Working app | Protected hosting, Fabric SSO, code-first SQL/GraphQL, claims-based alert policies, Function-to-Data-Agent MCP, native Logs/Metrics in the owner session | Second-user permissions, real notifications, latest-build portal embedding or guaranteed AI accuracy |
| Supporting Fabric artifacts | OneLake replica/shortcuts, SQL-validated Direct Lake measures, ontology definition and rendered canvas | Ontology graph queries or ontology-backed agent answers |
| Isolated successes | SQL connector source preflight and project-name template scaffolding | A deployed SQL connector in the app or a share-ready business-parameterized template |
| Partial or blocked experiments | Catalog discovery; semantic connector search/add with invoke blocked by 401; ontology context attachment blocked on Standard and Preview | Catalog lineage integration, a proven cause for the 401, or an ontology answer-quality score |
| Separate semantic-agent experiment | Minimal instructions: 5/8 correct versus existing agent 7/8; tuned instructions: 7 full and 1 partial | Superiority, generalization, or visibility into the exact query/measure used |

Use the [completed experiment results](#completed-experiment-results) and
[structured ledger](docs/evidence/experiments-2026-10-30.json) when making judging
claims. Raw evidence still needs the deferred non-Markdown privacy review before
public distribution.

## Part 1 - New Rayfin features used

Each entry answers: what capability, why Zava needed it, how we exercised it, value, result,
friction, feedback and evidence.

### 1. Private sites (protected static hosting)
- **Feature:** `staticHosting.assetAccess: protected`.
- **Scenario:** An operations tool must show nothing to signed-out visitors.
- **Implementation:** [rayfin.yml](rayfin/rayfin.yml); auth gate retained; updates shipped with `rayfin up staticapp deploy`.
- **Value:** Judges and users meet a sign-in gate before any fleet data renders.
- **Result:** Worked. A fresh signed-out browser shows "Sign in to continue / This app is private"; an anonymous HTTP request returned **401** on 2026-10-30 (06:24Z).
- **Friction:** A link does not grant access; permissions are separate. Stale or different-user session replacement was not exercised live.
- **Feedback:** FB-013.
- **Evidence:** Reproducible by anonymous request and by opening the URL in a clean browser.

### 2. Fabric SSO
- **Feature:** Fabric-brokered authentication, password authentication disabled.
- **Scenario:** Sign in with the organization's Microsoft account, no stored credentials.
- **Implementation:** [rayfin.yml](rayfin/rayfin.yml) `auth`; [rayfin-auth.service.ts](packages/frontend/src/services/rayfin-auth.service.ts).
- **Value:** Real identity reaches the data layer, which enables claims-based policies.
- **Result:** Worked for local production preview and hosted standalone, including session restore after reload. Latest-build embedded-in-portal handoff is **not verified**.
- **Friction:** CLI login failed on an unreadable cache and keychain error (FB-010) while browser SSO worked; a direct Entra token exchange failed without naming the missing scope (FB-008).
- **Feedback:** FB-008, FB-010, FB-012, FB-014.
- **Evidence:** README authentication table; hosted sign-in and reload observed on 2026-10-30.

### 3. Code-first data on Fabric SQL, in East US 2
- **Feature:** Decorated TypeScript entities provisioned as a Fabric SQL database; authenticated GraphQL reads and writes; capacity in **East US 2** (region expansion).
- **Scenario:** Zava needs an app-owned operational store the app and later analytics share.
- **Implementation:** [packages/data/src](packages/data/src); [docs/DATA_MODEL.md](docs/DATA_MODEL.md); deterministic generator [tools/synthetic.mjs](tools/synthetic.mjs).
- **Value:** One schema produced 13 trusted foreign keys and the source for every later artifact.
- **Result:** Worked. 120 vehicles, eight regions; complete paginated reads; semantic-model DAX matched SQL.
- **Friction:** Typed lookup and mutation results omitted fields at runtime (FB-021); coordinates need explicit decimal scale (FB-005).
- **Feedback:** FB-004, FB-005, FB-011, FB-021.
- **Evidence:** [docs/DATA_MODEL.md](docs/DATA_MODEL.md); [data and schema tests](tests). This documentation update did not rerun the application suites.

### 4. Row-level data policies using claims
- **Feature:** Entity policies with `claims.sub`.
- **Scenario:** Only the signed-in caller may create an alert in their own name; updates may touch only workflow fields.
- **Implementation:** [Alert.ts](packages/data/src/Alert.ts) (`claims.sub.eq(item.createdBySub)`, update include-list); reference entities are read-only.
- **Value:** Caller identity is enforced by the platform, not by UI code.
- **Result:** Worked: creator spoofing and immutable-field edits were rejected in hosted tests. This uses the **standard** `sub` claim; **custom claims were not exercised**.
- **Friction:** Partial-commit workflows (alert saved, timeline event failed) needed a client-side repair pattern (FB-022).
- **Feedback:** FB-022.
- **Evidence:** [tests](tests) policy assertions; [docs/ALERTS.md](docs/ALERTS.md).

### 5. Functions
- **Feature:** TypeScript User Data Function with a platform-delivered Fabric-audience token.
- **Scenario:** A trusted server-side call to the Data Agent without shipping tokens to the browser.
- **Implementation:** [function_app.ts](packages/functions/src/function_app.ts), [mcp.ts](packages/functions/src/mcp.ts); typed contracts in [packages/shared](packages/shared/src/index.ts).
- **Value:** Browser asks a question; the Function authenticates to the agent as the app.
- **Result:** Worked end to end in the hosted app; 18 transport tests were recorded passing; failures return typed, retryable errors. No new runtime test was run for this documentation update.
- **Friction:** Live MCP protocol differed from the starter reference (FB-017); timeout guidance conflicted with the installed SDK (FB-018).
- **Feedback:** FB-017, FB-018, FB-020.
- **Evidence:** Function source; `npm run agent:test`; native Function history (feature 10).

### 6. Fabric Data Agent through a Rayfin Function
- **Feature:** Published Data Agent called over MCP (the "Data Agent connector" use case, implemented through a Function rather than the `connector` command).
- **Scenario:** "Which Texas region has the most delayed vehicles?" in plain language.
- **Implementation:** [config/fleet-agent.json](config/fleet-agent.json), [tools/configure-agent.mjs](tools/configure-agent.mjs), [tools/verify-agent.mjs](tools/verify-agent.mjs); [docs/DATA_AGENT.md](docs/DATA_AGENT.md).
- **Value:** Conversational operations over the same governed data, advisory and read-only.
- **Result:** Worked with caveats. On 2026-10-30, after the rebrand republish, the Houston question returned **9 delayed vehicles** and SYN-027 returned **38 minutes, two active alerts (one critical), fresh telemetry**. Generated answers can be wrong; two earlier failures are recorded.
- **Friction:** SQL database could not be a source, so a Lakehouse with shortcuts bridged it (FB-016); definition round trip renamed a datasource folder (FB-031).
- **Feedback:** FB-016, FB-019, FB-025, FB-031.
- **Evidence:** Golden-question runs; [rebrand receipt](fabric/phase2/agent-rebrand-receipt.json).

### 7. OneLake (replica and shortcuts)
- **Feature:** The SQL database's OneLake replica reused by a Lakehouse (shortcuts) and a Direct Lake model.
- **Scenario:** Reuse operational data for AI and analytics without copying it.
- **Implementation:** Six read-only shortcuts created by [configure-agent.mjs](tools/configure-agent.mjs); model partitions on the replica.
- **Value:** One source of truth feeding the app, the agent and the semantic model.
- **Result:** Worked; the agent noted replica lag can differ from direct SQL.
- **Friction:** Delta load completion and SQL catalog readiness are different gates (FB-006).
- **Feedback:** FB-006, FB-016.
- **Evidence:** Shortcut inventory preserved by the configuration tool; DAX versus SQL agreement.

### 8. Semantic model (Direct Lake)
- **Feature:** `Texas Fleet Operations` model created from OneLake table URLs via the REST API.
- **Scenario:** Governed business measures so "needs attention" is one uncapped definition (54 of 120), not a list.
- **Implementation:** [fleet-semantics.mjs](tools/phase2/fleet-semantics.mjs) (7 tables, 61 columns, 17 measures, 5 active one-way relationships); [docs/PHASE2_SEMANTIC_MODEL.md](docs/PHASE2_SEMANTIC_MODEL.md).
- **Value:** Verified business definitions for analysts and AI consumers; identity columns removed from the model. Correct measures do not guarantee an agent's answer will match them.
- **Result:** Worked. Six DAX answer sets matched live SQL again on 2026-10-30 (120 vehicles, 54 needing attention, 27 active alerts across 21 vehicles, 5 critical, 10 stale, Houston 17 of 28).
- **Friction:** Native model canvas failed in the integrated browser on a CORS origin mismatch (FB-028); update LRO returns no result body (FB-027).
- **Feedback:** FB-027, FB-028.
- **Evidence:** [validation.json](fabric/phase2/semantic-model/validation.json); [model tests](tools/phase2/fleet-semantics.test.mjs).

### 9. Ontology (preview)
- **Feature:** Generation-2 ontology `Fleet_Operations`: 7 entities, 7 relationships, 55 bound properties, 6 business rules.
- **Scenario:** Business meaning (a vehicle operates in a region, alerts affect vehicles) beyond tables.
- **Implementation:** [ontology.mjs](tools/phase2/ontology.mjs); [docs/PHASE2_ONTOLOGY.md](docs/PHASE2_ONTOLOGY.md).
- **Value:** Reusable vocabulary and scenario-clock semantics for consumers.
- **Result:** Created and **definition read-back verified**; native canvas now renders. **Ontology queries and ontology-backed agent answers are not verified.** E-AGENT-ONTOLOGY could not attach context on either Standard or Preview (FB-035). Creation also provisioned GraphModel, Eventhouse and KQL items.
- **Friction:** First attempt returned 403 `FeatureNotAvailable` until a tenant preview setting was enabled (FB-026, FB-029); associated infrastructure appeared unrequested (FB-030).
- **Feedback:** FB-026, FB-029, FB-030, FB-035.
- **Evidence:** Persisted definition and receipt under [fabric/phase2/ontology](fabric/phase2/ontology); [context-attachment observations](fabric/phase2/ontology-agent/observations.json) and [both failure notifications](fabric/phase2/ontology-agent/portal-add-errors.png).

### 10. Observability: native Logs
- **Feature:** Native persisted Function invocation history.
- **Scenario:** Troubleshoot an agent call without exporting prompts or answers.
- **Implementation:** Content-free JSON events in [function_app.ts](packages/functions/src/function_app.ts).
- **Value:** Persisted execution outcomes can be inspected after the browser session.
- **Result:** Worked in the owner session. Browser console spans are **not** durable native logs.
- **Friction:** Hard to discover; native invocation ID differs from the app's request ID (FB-024). Correlation for the latest build is unverified.
- **Feedback:** FB-024. **Evidence:** [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

### 11. Observability: native Metrics
- **Feature:** Manage app -> Metrics.
- **Scenario:** Understand app usage, query failures and query duration.
- **Implementation:** Existing app's native Metrics view, documented in [OBSERVABILITY.md](docs/OBSERVABILITY.md).
- **Value:** Platform-level operational signals without adding a separate monitoring service.
- **Result:** Six populated metrics in the owner session. Interpretation caveats (window bounds, error-rate arithmetic) are documented and fed back.
- **Friction:** The displayed 1.42% rate does not equal 2/220; aggregation semantics remain unresolved. These are historical query metrics, not Data Agent latency or billing.
- **Feedback:** FB-023. **Evidence:** [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

### 12. OneLake catalog discovery (tested 2026-10-30, partial)
- **Feature:** Read-only Fabric catalog search, not an app-integrated governance UI.
- **Scenario:** Discover the app and supporting artifacts as one reusable solution.
- **Implementation:** Three named searches recorded in [E-CATALOG](docs/evidence/experiments-2026-10-30.json); no application code added.
- **Value:** Establishes discoverability and identifies metadata gaps for another builder.
- **Result:** All 12 workspace items were discoverable with type, description and workspace; no lineage between app, database, Function, agent, model and ontology was returned; four items share one display name. Descriptions on app-created items were empty and were then set.
- **Friction:** Search responses did not explain how the artifacts belong together. This does not establish that Fabric has no lineage elsewhere.
- **Feedback:** FB-032. **Evidence:** [experiments record](docs/evidence/experiments-2026-10-30.json).

### 13. Semantic-model data connector (tested 2026-10-30, partial)
- **Feature:** Rayfin semantic-model connector discovery, declaration and direct CLI invoke.
- **Scenario:** Test access to the existing model before building a query interface.
- **Implementation:** Scratch-project search -> add -> invoke; outputs were removed and no app connector was deployed.
- **Value:** Fast source discovery and a bounded failure before any production change.
- **Result:** Search found three connectable sources in 4.6 s and add completed in 4.5 s. Invoke was **blocked by HTTP 401**. The token carried only `user_impersonation`; missing consented scope is a hypothesis, **not a proven cause**. The same token worked through the separate REST validation path.
- **Friction:** The recovery hint pointed a workspace Admin toward Viewer access without identifying a required scope. CLI login was separately blocked by FB-010.
- **Feedback:** FB-033. **Evidence:** [experiments record](docs/evidence/experiments-2026-10-30.json).

### 14. Data Agent over the semantic model (tested 2026-10-30, hypothesis refuted for minimal instructions)
- **Feature:** A new Data Agent with a `semantic_model` data source, created through the items definition API. The existing agent was not written to.
- **Scenario:** Could governed measures replace the hand-tuned instructions the Lakehouse agent needed?
- **Implementation:** [tool](tools/phase2/semantic-agent.mjs), [configuration](config/phase2-semantic-agent.json); 7 tables, 42 visible columns and 17 measures attached; eight questions checked against fresh DAX ground truth.
- **Value:** A controlled comparison of governed model answers, existing-agent answers and explicit DAX ground truth.
- **Result:** Created and read back on the first attempt. With short generic instructions it answered **5 of 8** correctly by manual grading (existing agent: 7 of 8). Three answers failed the governed-answer checks, including 41 instead of 54; the exact query/measure used was not visible. The same configuration answered differently on repeat. After definitions were restated in its instructions it answered 7 fully and 1 partially of 8. Tuning followed the failures, so this does not show generalization or superiority. Model-level AI preparation settings were not tested.
- **Friction:** No semantic-model example in the definition docs; the service renamed the data-source folder; no visibility into which measure produced a number.
- **Feedback:** FB-034. **Evidence:** [answers and ground truth](fabric/phase2/semantic-agent), [experiments record](docs/evidence/experiments-2026-10-30.json).

### 15. Local templates (tested in isolation, not shipped as a reusable app template)
- **Feature:** Installed CLI `init` with an explicit local directory, project name and no-install automation option.
- **Scenario:** Determine what another developer can safely reuse without changing the working demo.
- **Implementation:** [bounded helper](tools/template-experiment.mjs) scaffolded this project and a controlled synthetic fixture into temporary directories outside the source tree.
- **Value:** Proved project-identity scaffolding and identified the exact packaging work still required.
- **Result:** Both calls and child synchronization succeeded (4.179 s and 2.836 s). Root package/Rayfin identity and documented root README/filename project-name tokens changed; dependency declarations and protected Fabric authentication were preserved. Custom business tokens, nested README and normal source contents did not change.
- **Friction:** `.gitignore` does not filter template copies. The real copy retained operational targets, deployment/environment files, build output and internal evidence; a harmless fixture independently confirmed ignored-file copying. A new project name does not isolate a new environment.
- **Feedback:** FB-036: export preview, explicit inclusion/exclusion, target-state warnings, typed business parameters and a safe packaging guide.
- **Evidence:** [sanitized results](docs/evidence/template-experiment.json), [future packaging recipe](REUSABLE-PATTERNS.md#safe-future-template-packaging-not-executed).
- **Limits:** Scratch outputs removed; 88 frozen app/configuration files unchanged. No install, generated-app execution, deployment or external disclosure. Node 26 was outside declared Node 20/22/24 support; portability remains untested. Do not claim a one-click fleet template.

### 16. SQL connector CLI preflight (verified; deployed integration not tested)
- **Feature:** `fabric-sqldatabase` search, add, schema discovery and read-only inspect through the installed CLI.
- **Scenario:** Reuse the existing operational SQL database from another app without risking the working demo.
- **Implementation:** [bounded helper](tools/connector-sql-experiment.mjs); isolated declarations scoped to `read`, with the generated application-auth default preserved.
- **Value:** Proved source access and real column types before any entity generation, UI work or deployment.
- **Result:** Search found the exact database in 3.135 s. Inspection returned one synthetic `dbo.Regions` row with eight typed columns and `truncated: true` in 3.937 s. Schema discovery initially failed its token-audience check; following the printed hint recovered in 5.397 s and discovered 12 tables across dbo and storage.
- **Friction:** Add can exit zero with nested discovery failure; its `--json` stdout also contained project-root/debug messages. A skill incorrectly implied this CLI probe requires deployment.
- **Feedback:** FB-037: clean JSON stdout, explicit/strict schema readiness, audience prerequisites and consistent pre-deployment guidance.
- **Evidence:** [sanitized commands, sample and metadata inventory](docs/evidence/connector-sql-experiment.json).
- **Limits:** Developer identity only, not the emitted application's identity. SDK installation, entity policies and browser integration were not tested. No source writes or remote resource changes; scratch files removed; 88 frozen files unchanged. Node 26 was outside declared support.

## Part 2 - Classification of every listed capability

| Capability | Label | Why / evidence |
|---|---|---|
| Functions | [ALREADY IMPLEMENTED] | Feature 5 |
| Secret Store | [DOCUMENT ONLY] | `secrets.generated.ts` has an empty registry; the Fabric token needed no secret. Deploying a secret-reading Function to the live Function item before judging is not worth the risk |
| Private sites | [ALREADY IMPLEMENTED] | Feature 1 |
| Observability - Metrics | [ALREADY IMPLEMENTED] | Feature 11 |
| Observability - Logs | [ALREADY IMPLEMENTED] | Feature 10 |
| Data connector: Semantic model | [NOT AVAILABLE / BLOCKED] (invoke in this environment) | Feature 13: discovery/add succeeded, invoke returned 401; scope cause unproven. No deployed app integration |
| Data connector: SQL | [ALREADY IMPLEMENTED] (CLI preflight only) | Feature 16: read-only declaration, recovered schema discovery and one real source row verified; deployed app integration not tested |
| Data connector: Lakehouse | [DOCUMENT ONLY] | Found by search as read-only `fabric-sqlanalytics`; the app does not use it |
| Data connector: Warehouse | [DOCUMENT ONLY] | The project has no warehouse; creating one for a count is not justified |
| Data Agent connector | [ALREADY IMPLEMENTED] | Feature 6, via Function and MCP |
| Kusto connector | [NOT AVAILABLE / BLOCKED] | Installed 1.36.2 docs: Kusto authoring is held; `connector types` and `search` omit it |
| Blob storage + OneLake | [DOCUMENT ONLY] / [ALREADY IMPLEMENTED] | `storage` is disabled. OneLake is used indirectly (feature 7); static hosting also uses OneLake per the pricing guide |
| Basic Fabric RBAC | [UNKNOWN - VALIDATE] | Docs describe Run-and-interact and admin reshare; only the owner session was tested; needs a second identity |
| Link sharing | [TOO RISKY BEFORE JUDGING] | Requires package/app changes and host validation; latest-build embedded acceptance remains unverified. No sharing result claimed |
| OneLake / Govern catalog for Apps | [ALREADY IMPLEMENTED] (catalog discovery only) | Feature 12: 12 items discovered; no lineage returned by search and no app governance UI |
| Custom claims | [DOCUMENT ONLY] | Used standard `claims.sub`; docs list `sub`, `email`, `role` |
| Copilot integration | [UNKNOWN - VALIDATE] | Not described in the installed Rayfin guide; no claim |
| Parameterized app templates | [DOCUMENT ONLY] (business template) | Feature 15 separately verifies local project-name scaffolding. Custom business tokens stay unresolved; no share-ready or deployed fleet template |
| OAP | [UNKNOWN - VALIDATE] | Not defined in the installed docs; ask the hackathon owners, make no claim |
| PostgreSQL support | [NOT AVAILABLE / BLOCKED] | Installed docs: Fabric-managed Rayfin is MSSQL only; PostgreSQL is Rayfin Local |
| Region expansion | [ALREADY IMPLEMENTED] | Feature 3: East US 2 |
| Semantic model | [ALREADY IMPLEMENTED] | Feature 8 |
| Ontology | [ALREADY IMPLEMENTED] | Feature 9, queries unverified |
| Data Agent over semantic model | [ALREADY IMPLEMENTED] (separate experimental agent) | Feature 14: creation/answers verified, mixed accuracy. It does not replace the live app's agent; tuning is not a held-out evaluation |
| Data Agent over ontology | [NOT AVAILABLE / BLOCKED] | E-AGENT-ONTOLOGY attempted: context Add failed on Standard and Preview in this environment (FB-035); no ontology-backed answer verified |

## Completed experiment results

All **six selected experiments have recorded outcomes**. "Completed" includes an
honestly blocked attempt; it does not mean every hypothesis succeeded.

| Experiment / hypothesis | Real result | Limit / judging lesson | Feedback and strongest evidence |
|---|---|---|---|
| **E-CATALOG:** artifacts are discoverable with useful metadata | **Partial:** 12 workspace items found; duplicate names and initially empty descriptions; no lineage returned by search | Discovery is proven, not end-to-end catalog/governance integration | FB-032; [recorded search observations](docs/evidence/experiments-2026-10-30.json) |
| **E-CONNECTOR:** discover, add and query the semantic model | **Partial:** search/add worked; invoke returned HTTP 401 | Cause unproven; do not count a successful query or deployed connector | FB-033; [timings, request IDs and token diagnostic](docs/evidence/experiments-2026-10-30.json) |
| **E-AGENT-SEMANTIC:** minimal model-grounded instructions match or beat the existing agent | **Refuted for that configuration:** manual 5/8 versus 7/8; unchanged repeats varied. Tuned Run B: 7 full, 1 partial | Defined measures are not an answer-accuracy guarantee; no query provenance or held-out/generalization result | FB-034; [DAX truth](fabric/phase2/semantic-agent/ground-truth.json), [Run A](fabric/phase2/semantic-agent/answers-new-run-a.json), [existing agent](fabric/phase2/semantic-agent/answers-existing-run-a.json), [tuned Run B](fabric/phase2/semantic-agent/answers-new-run-b.json) |
| **E-AGENT-ONTOLOGY:** context improves relationship questions | **Blocked:** attachment failed on Standard and Preview; zero ontology-backed questions asked | Hypothesis **not evaluated**, not refuted. Canvas/discovery worked; root cause unknown | FB-035; [observations and isolation](fabric/phase2/ontology-agent/observations.json), [two notifications](fabric/phase2/ontology-agent/portal-add-errors.png) |
| **E-TEMPLATE:** local naming works, business parameters remain limited | **Confirmed in the tested CLI path:** both scaffolds worked; custom business tokens and Git-ignored operational state copied unchanged | Not a second working app or safe distributable template; use deliberate staging | FB-036; [two measured scaffold scenarios](docs/evidence/template-experiment.json) |
| **E-CONNECTOR-SQL:** read-only source preflight works before deployment | **Confirmed after recovery:** one synthetic Region row, eight typed columns; 12 SQL tables discovered using the printed audience hint | Developer identity only, not deployed app identity. Mixed JSON stdout and partial readiness are actionable automation feedback | FB-037; [sample, schema inventory and recovery](docs/evidence/connector-sql-experiment.json) |

Detailed hypotheses, tests, expected/actual results, time boxes and feedback are in
the [structured ledger](docs/evidence/experiments-2026-10-30.json). The semantic-agent
box was 60 minutes, ontology 30, template and SQL preflight 20 each; the initial
semantic connector stopped at about 15 minutes. FB-032 records about 10 minutes for
catalog work including metadata updates; no per-call catalog latency is claimed.
No retrospective time or success figures are invented.

The working app was not replaced. The separate semantic agent remains; its Standard
runtime was restored after the ontology attempt, with an empty `experimental: {}`
draft object retained. Scratch connector/template outputs were removed. The local
template and SQL tests used Node 26 outside the CLI's declared support; supported-
runtime portability remains untested. The next step is evidence packaging and
access/rehearsal, not automatically retrying blocked experiments.

## Evidence index

| Claim | Strongest evidence |
|---|---|
| Private hosting | Anonymous 401; clean-browser sign-in gate |
| Working app | [docs/evidence/zava-fleet-command-overview.png](docs/evidence/zava-fleet-command-overview.png), [panel order shot](docs/evidence/zava-ask-the-fleet-and-inbox.png) |
| Data agrees across surfaces | App KPIs, DAX validation and SQL all show 27 active alerts across 21 vehicles, 5 critical, 10 stale ([validation.json](fabric/phase2/semantic-model/validation.json)) |
| Data Agent works | Golden-question runs, [DATA_AGENT.md](docs/DATA_AGENT.md) |
| Ontology exists | [receipt](fabric/phase2/ontology/receipt.json), [persisted definition](fabric/phase2/ontology/get-definition.json) |
| Rebrand complete | `node tools/check-branding.mjs` returns zero findings, including decoded definition payloads; `tests/branding.test.mjs` |
| Local template behavior and limits | [Two measured scaffold scenarios](docs/evidence/template-experiment.json), [safe future packaging](REUSABLE-PATTERNS.md#safe-future-template-packaging-not-executed); not a deployable-template claim |
| SQL connector source preflight | [Real Region sample, schema inventory and recovery](docs/evidence/connector-sql-experiment.json); not deployed app-identity access |
| Product feedback | [FEEDBACK-LOG.md](FEEDBACK-LOG.md) FB-001 to FB-037 |
