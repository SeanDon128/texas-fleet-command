# Texas Fleet Command: final proof and submission checklist

**Working checklist / October 28, 2026.** Unchecked boxes are work or review
gates, not assertions that evidence exists. Use the
[human-review draft](SUBMISSION_DRAFT.md) and [six-minute runbook](DEMO_RUNBOOK.md).
This document does not submit anything or authorize cloud changes.

**Hard feature freeze: Wednesday, October 28, 2026, 3:00 PM Eastern.**
After freeze: demo blockers and documentation/evidence corrections only.
Do not add another connector, a secret, a notification integration, or new cloud
resources just for feature count. Confirm the actual submission closing time,
format, access requirements, and video limit separately; do not infer them from
the feature freeze.

## P0 - Truth, privacy, and release gates

- [x] **New protected bundle deployed:** `/assets/index-ZXLReunk.js` on the same
  app. Fresh private gate/sign-in, 120 interactive vehicle markers plus 120 roster
  entries, and actual fleet/inbox success spans passed. This does not close
  new-release embedded acceptance or browser-to-native invocation-log correlation.
- [x] **Final static gates passed on the current hardening source.** These are
  source-validation results, not hosted deployment/runtime acceptance. Repeat
  affected gates if source changes afterward; worker startup failures remain
  failed/incomplete runs, not passes or reasons to skip files.

  | Static gate | Verified result |
  | --- | --- |
  | Typecheck, build, lint | PASS |
  | Frontend tests | 112 passed across 14 files |
  | Data/schema tests | 116 passed |
  | MCP transport tests | 18 passed |
  | Functions validator | PASS; 1 authored/generated Function, 0 unsafe casts |

- [x] **Bounded new-bundle hosted proof passed:** protected access, map/roster,
  explicit alert partial-save/reload repair, full lifecycle/readback, and
  controlled agent 503 followed by a real HOU retry. The separate SYN-027 answer
  discrepancy is unresolved; this check is not semantic accuracy certification.
  Repeat affected hosted checks after any further source/deployment change.
- [x] **Clean standalone closure observed at 2026-10-28 16:49 UTC:** same
  `index-ZXLReunk.js`, 120 interactive vehicle markers/120 roster entries,
  cards 120 vehicles/16 delayed/25 active alerts/10 stale, and
  `fleet.load`/`alerts.load` success spans. Zero page/console errors, failed
  app-origin requests, or app HTTP errors were observed **in that bounded reload
  window only**, not throughout earlier controlled tests or all sessions.
  Subsequently settled context showed 25 active of 38 total alerts, the removed
  temporary message absent, keyboard SYN-027 selection opening actual
  SYN-ROUTE-027, no horizontal overflow at 960px, and honest empty Q&A after reload.
- [ ] **Keep the synthetic disclaimer prominent** in pitch, app/video opening,
  screenshots/captions, and code packaging: all data is invented; Zava Security is a
  fictional company, and no real company's operations, practices, people, customer
  endorsement, or outcomes are represented.
- [ ] **Review the submission draft independently.** Verify every capability and
  outcome against observed evidence. Remove placeholders and unsupported claims;
  retain pending/not-implemented distinctions. Human reviewer approves the final
  text; this file set is not a submission receipt.
- [ ] **Exclude internal planning/source material.** Do not distribute
  `PROJECT_PLAN.md`, internal source-document excerpts, private document links,
  or a copied internal discrepancy register in a public repo/video/report.
  This includes exports, archives, commit history, attachments, and screen tabs.
- [ ] **Do not publish the current repository as-is.** Existing README,
  configuration, feedback, and evidence can contain administrative identities,
  tenant/subscription/workspace/item identifiers, and unsanitized technical detail.
  Review the complete outgoing package and linked files, not just the draft.
  Keep the private working deployment configuration intact; prepare any public
  distribution separately through an authorized follow-up.
- [ ] **Scrub credentials and identifiers.** Exclude admin usernames, tenant,
  subscription, workspace and item GUIDs, tokens, cookies, authorization headers,
  connection credentials, private source links, and raw logs from the public
  narrative/evidence. Inspect browser address bars, account menus, local paths,
  terminal history, request panels, downloadable bundles, and image metadata too.
  Do not share an unsanitized HAR or auth-storage export.
- [ ] **Preserve legitimate state.** Do not reseed/delete or revert alert actions
  to make counts match fixtures. The latest exact-ID guarded cleanup removed
  one additional temporary alert/three events, followed by verification of 3,583
  original operational rows, 3,840 history rows, and 13 foreign keys without
  reseeding. Earlier cleanup of three alerts/six events is separate historical
  evidence, not this cleanup. New actions naturally
  change current alert/event totals. Use targeted, current readback as proof,
  not an exact-seed reset. Do not add a cleanup/delete UI for packaging.

## P0 - Live proof before recording

### Access, identity, and operating picture

- [ ] In normal Edge, open the protected standalone app and verify its signed-out
  gate, approved sign-in, complete vehicle read, details, and restored session
  after reload. Keep authentication off the recording.
- [ ] Confirm 120 vehicles/eight regions and the frozen
  **2026-10-27 15:00 UTC** scenario clock. Read actual active counts before the
  demo; original counts are reference only: 16 delayed, 25 active alerts across
  19 vehicles, four critical, ten stale, Houston nine of 16 delayed.
- [ ] Exercise **Investigate HOU**, **Reset**, **Find a vehicle**, roster/marker
  selection, current assignment, theme, and keyboard focus. Verify narrow/wide
  layouts on the final hosted bundle, not just a previous screenshot.
- [ ] Verify map attribution remains visible. If basemap tiles fail, demonstrate
  the SQL-backed roster honestly; do not present a stale or recorded screen as live.
- [ ] **New-release embedded acceptance is blocked/unverified.** Native
  AppBackend/User Data Functions reload attempts at **16:45-16:48 UTC on
  October 28** left workload frames bootstrap/blank in the integrated browser;
  the new hosted iframe could not be inspected. Prior-bundle embedded rendering
  remains valid, not acceptance of this bundle. Complete authorized normal-Edge
  native follow-up and verify actual new-bundle runtime before closing this gate;
  use the verified standalone route meanwhile.
- [ ] **Second-user/stale-session acceptance is pending.** Test an approved
  non-owner account and stale/different-user replacement only through the
  authorized process. Record pass/fail/unverified honestly; do not infer these
  from the owner's session or grant broader access merely for the demo.

### Agent source correctness and latency

- [ ] Prefer the HOU regional-delay question from the [runbook](DEMO_RUNBOOK.md)
  for the protected demo and source-check before acting. The SYN-027 question
  remains an explicitly fallible, source-gated diagnostic, not a safe default.
  Do not repeat until a desired answer appears and then hide the earlier failure.
- [x] **New semantic discrepancy recorded, not fixed:** the original SYN-027
  question at **2026-10-28 16:37 UTC** returned three active alerts, one critical.
  Operational SQL at **16:42 UTC** and actual Lakehouse agent SQL at
  **16:43 UTC** both had exactly two open alerts, one critical, 38-minute delay,
  healthy/non-stale. The unchanged question repeated during
  **16:43:54-16:44:26 UTC** returned two correctly. Root cause is unproven;
  neither lag/caching nor a fix is established. This is not a passed accuracy gate.
- [ ] Review all seven previously source-tested paths if final acceptance claims
  that coverage. Check entity set/order, joins, distinct vehicles versus alerts,
  active=open-or-acknowledged, strictly-over-15-minute staleness, and last-hour
  semantics against scenario time. Record actual outcomes, not numeric-presence
  smoke results alone.
- [x] **Controlled agent failure/retry passed:** browser-only HTTP 503 removed the
  prior answer, showed safe error/Retry, and preserved the map. After interception
  removal, real keyboard retry returned HOU/nine at **16:40:11.976 UTC on
  October 28**, with 11,569 ms browser wait and 11.1 s app-reported server time.
  One correct recovery sample does not certify all seven questions or an SLO.
- [ ] Retain the broad-attention failure and corrected retest as honest learning.
  Instruction refinement is a mitigation, never a generated-accuracy guarantee.
  Do not claim three-paraphrase coverage or arbitrary-question reliability.
- [ ] Label elapsed time with what was measured: a Function exchange, observed
  browser wait, or native query duration. There is no established latency SLO.
  The runbook's 35-second onstage budget is not the application's timeout.
- [ ] Confirm failures do not show fabricated/canned answers. A backup answer or
  video must come from an actual capture with date and Recorded labeling.
  If there is no capture, use source-backed map evidence, not a recreated answer.
- [ ] Disclose app-owner external-resource identity. Do not claim per-user agent
  RLS, source permissions inherited from each viewer, automatic alert creation
  by the assistant, or instructions as an authorization boundary.

### One synthetic alert and persistent lifecycle

- [x] **New-bundle recovery/lifecycle verified:** an initial Chromium
  `ERR_NETWORK_IO_SUSPENDED` was observed, not a proven Fabric outage. Retry of
  the same request saved one Alert/zero events, with `partial` /
  `timeline_incomplete` diagnostics. Reload repair reconstructed original
  creator/time, then acknowledge/reload/resolve/reload passed. SQL confirmed
  all three event actors/times. Only that one temporary alert/three events
  received exact-ID guarded cleanup; no reseed or baseline reset occurred.
- [ ] Use a new, uniquely labeled invented message for SYN-027 and a configured
  fictional same-region recipient. Save once, acknowledge, resolve, reload, set
  **Inbox status: Resolved**, and select the same alert.
- [ ] Confirm the resolved record and all three linked event kinds actually
  persist. A success notice, local state, or an optimistic count is not readback
  proof. Capture actual action times, separate from the frozen telemetry clock.
- [ ] Confirm current active counts change only as expected; resolving this alert
  does not alter vehicle delay/health or refresh telemetry. Leave the legitimate
  demo record in history rather than deleting it to match the original baseline.
- [ ] Keep existing partial-save/reload-repair evidence available for review.
  If repeated during a controlled rehearsal, retain the same request/alert ID,
  repair missing events from persisted metadata, and remove interception before
  recording. Do not manufacture a duplicate alert or a timeline event on screen.
- [ ] State the permission/workflow boundary: authenticated operators share the
  inbox; fictional assignment is not recipient-only access. Caller-creation and
  field-update restrictions were tested, but no real-person mapping, Teams/email,
  delivery confirmation, atomic transaction, concurrent-state enforcement,
  independently stamped audit authority, or tamper-proof timeline is claimed.

## P0 - Observability evidence, not observability theater

- [ ] Capture native **AppBackend -> Manage app -> Metrics** in the verified owner
  session. Select **Last 24 hours** (`LAST24HOURS`) for recent traffic; preserve
  the displayed UTC window and capture time while hiding identifying chrome.
  Native Metrics is preview; owner-session evidence is not general availability.
- [ ] Show the six actual metrics: `SignInsCount`, `AppLoadsCount`, `QueryCount`,
  `QueryErrorCount`, `QueryErrorRate`, and `QueryDuration`. Let live values vary;
  do not hardcode the historical snapshot into the app or an acceptance test.
- [ ] If citing the October 28 15:00 UTC-ending snapshot, keep its six values
  together with its 24-hour window: 6 / 14 / 220 / 2 JSON-level errors / 1.42%
  backend-aggregated / 229.96 ms backend-average. Do not replace the displayed
  rate with `2 / 220`, assume its denominator, or attribute a root cause.
- [ ] Explain the observed 7/30-day UTC-midnight boundary: those windows excluded
  October 28's partial day. Do not use them to imply today's traffic disappeared.
  Query duration is not end-to-end agent latency; errors are not automatically
  app defects.
- [ ] **Native Function historical-log retrieval is verified in the owner
  session.** Capture a privacy-reviewed summary using **AppBackend Manage app ->
  Functions -> existing associated User Data Functions item -> select
  askFabricDataAgent in Functions explorer -> More -> View historical log ->
  select invocation date**. Native **All historical logs** showed 12 Succeeded
  invocations with UTC date, **Duration(ms)**, and **Invocation ID**. These are
  observed history entries, not final release/test counts.
- [ ] Preserve the inspected example accurately: **2026-10-28 14:15:38.811 UTC /
  41,229 ms** runtime duration; **Invocation details** contained the actual
  content-free `fleet-agent-completed` event with `requestId` and
  `elapsedMs: 40209`. Review a scrubbed field summary rather than publishing raw
  logs or actual identifiers. The distinct timing scopes are not an agent SLO.
- [ ] Explain that invocation **Succeeded** is runtime/transport status, not
  generated-answer semantic success. A typed failure result can complete
  successfully. Check the returned result and source comparison separately.
- [ ] Bound the native claim to **durable per-invocation runtime-log retrieval**.
  General AppBackend/database/frontend log coverage, retention, export, RBAC, and
  ingestion SLO remain unverified. In inspected platform context only
  token-presence/count/audience indicators were observed, with no token values;
  do not infer a blanket privacy guarantee or publish the raw context.
- [ ] Review the implemented local browser helper: start/completion spans use
  fixed allowed operation/outcome/code values, correlation UUID, elapsedMs, and
  optional UUID-only serverRequestId; no content, identity, record IDs, tokens,
  or external sink. Its 26 focused tests and final static gates passed; actual
  fleet/inbox success spans and partial/timeline-incomplete diagnostics were
  observed on the deployed bundle. **New-release browser-to-native invocation-log
  correlation remains blocked/unverified**. Browser spans are not durable history.
- [ ] **Native correlation follow-up remains uncompleted:** the bounded
  16:45-16:48 UTC integrated-browser native reload attempts could not expose a
  new history entry. Earlier owner-session native Metrics/persisted-log retrieval
  remains valid; do not relabel that observation absent or this follow-up complete.
  Do not assert root cause or a general service outage.
- [ ] Verify new-release correlation by comparing actual browser/server request
  references in authorized tooling with the corresponding native invocation.
  Redact actual references in public evidence. Earlier native-history retrieval,
  successful browser spans, and runtime Succeeded do not alone pass this gate.
- [ ] Preserve the narrower verified application-log statement: request
  reference, outcome code, elapsed time; no prompts/answers/tokens. Keep the
  multi-surface discovery and guide 1.36.2 native-observability documentation gap
  as specific feedback. Cross-check [observability scope](OBSERVABILITY.md)
  before final packaging; do not infer embedded acceptance from portal-log access.

## P1 - Normal-Edge screenshots and six-minute video

**Full normal-Edge captures and video remain pending, not submission-ready.**
One newly saved screenshot was inspected and is usable for header/KPIs only,
not the full map or a completed evidence package. Other integrated-browser
screenshots can be clipped/tiled after viewport changes. Suggested capture
subjects below remain to-do items, not invented filenames or completed proof.

- [ ] Statewide operating picture, synthetic disclaimer, scenario time, attribution.
- [ ] Houston delayed view and SYN-027 details/current assignment.
- [ ] Actual source-reviewed HOU response, with generated-analysis warning and
  honest latency context. If including SYN-027, preserve the incorrect answer,
  both-source comparison, and correct unchanged-question repeat as unresolved
  learning, not a fixed before/after story.
- [ ] New synthetic alert, acknowledgement, resolution, and the same complete
  timeline after reload. Do not display sensitive subject identifiers in exports.
- [ ] Native Metrics six-card view, selected Last 24 hours window, actual capture
  timestamp, preview/owner-session context.
- [ ] Native Function historical-log view and reviewed invocation-detail summary,
  with actual identifiers/context redacted and runtime-versus-semantic-success
  caption. Retention/export/access guarantees are not demonstrated by this image.
- [ ] Final hosted mobile/light/dark and keyboard-accessible control evidence.
- [ ] Any failure/recovery capture is clearly labeled **Controlled test**, not a
  real outage. Preserve a safe result summary without credential-bearing requests.
- [ ] Record the [six-minute sequence](DEMO_RUNBOOK.md), including 30-45 seconds of
  native Metrics and the concise privacy/architecture close. Add readable
  captions, keep sign-in offscreen, and confirm the actual submission video limit.
- [ ] Watch the exported video end to end. Ensure links play for the intended
  reviewers, captions match results, recorded substitutions are labeled, and
  screenshots are not clipped/tiled. No fabricated live answers or fake delivery.

## P1 - Code, reuse, sources, licensing, and permissions

- [ ] Review outgoing source/configuration/history and generated/static assets
  for credentials, private identifiers, internal excerpts, real operational
  material, and accidentally included evidence. Do not remove private deployment
  guards merely to make a repository shareable.
- [ ] Explain implemented reuse honestly: deterministic generation, typed
  entities/contracts, map/roster, scenario clock, bounded agent bridge, recovery
  pattern. Mark geography/branding/threshold/scenario/source/target parameters
  and a one-click installer as aspirational unless separately implemented and
  tested. Do not promise zero-change deployment to another tenant.
- [ ] Review public source citations and external-feedback excerpts against
  public documentation and actual observations. Do not cite internal planning
  documents or attach raw feedback logs/configuration to public issues.
- [ ] Confirm third-party dependency licenses and distribution obligations.
  Review basemap/tile and outline-data provenance, retained attribution, fonts,
  icons, and any screenshot/video assets. Confirm actual notices/license files;
  do not assume one exists or that access grants redistribution rights.
- [ ] Confirm repository and recording sharing permissions with the owner.
  Restrict the live app to intended authorized reviewers; do not make hosting
  anonymous to bypass access checks. Explain owner-only deployment/management
  caveats and app-owner agent access separately from consumer permissions.
- [ ] Cover all six criteria in the final narrative: use-case/customer impact,
  reuse/template quality, new feature adoption, implementation quality, specific
  product feedback, uniqueness/learning. No invented scores or measured ROI.
- [ ] For feedback, include positives plus bounded failures and specific asks:
  synthesis provenance, accurate typed projections, partial-write/outbox patterns,
  protocol/timeout guidance, Metrics denominator/window semantics, discoverable
  native invocation-log documentation, and embedded runtime diagnostics. Do not
  invent timing, root causes, issue links, or filings.

## Phase 2 ontology addendum - October 29

The user explicitly authorized additive Phase 2 work after the app freeze.
This does not authorize unrelated app or existing-agent changes.

- [x] **Ontology created after preview enablement:** Fleet_Operations in the
  approved Trucks Rayfin workspace, generation 2. Creation operation succeeded;
  all 27 definition parts were retrieved and checked.
- [x] **Business context persisted:** seven entities, seven relationships,
  55 source-bound properties and six natural-language business rules. Source
  SQL key/relationship checks passed; no new operational data source.
- [x] **Frozen operational app protected:** 69 app/Function/package/model
  configuration file hashes matched; no app deployment, source write,
  existing-agent edit, explicit Graph refresh or schedule request in this retry.
- [x] **Associated resources disclosed:** Fabric provisioned GraphModel,
  Eventhouse and KQLDatabase items in the same workspace. Their metadata was
  read, not deleted or reconfigured. Graph data load, platform-default schedules
  and capacity consumption remain unverified; do not claim no Graph resources
  or zero consumption.
- [x] **Earlier limitation retained honestly:** October 28 FeatureNotAvailable
  attempt is historical evidence; October 29 retry succeeded after user-reported
  tenant preview enablement. Do not describe the old blocker as still current.
- [ ] **Native canvas and data-consumption acceptance:** browser sign-in requires
  user completion; native ontology canvas, actual ontology-backed queries and
  Data Agent answers are not yet verified. Creation/read-back and source SQL
  checks do not prove these separate gates.
- [ ] **Refresh presentation counts from source:** October 29 source check had
  40 total/27 active alerts across 21 vehicles, five active critical alerts and
  322 events. These differ from earlier seed/model acceptance; never reset
  operator records to reproduce an older slide.
- [ ] **Capture and privacy-review ontology evidence** before external use:
  show real entities/relationships/rules, distinguish definition from query
  results, and scrub administrative identities, IDs and connection details.

See [ontology creation, source mappings and evidence](PHASE2_ONTOLOGY.md).
This addendum is not an end-to-end agent-validation or submission receipt.

## Final judging addendum - October 30

Rebrand to **Zava Security** is complete in source, documentation, the Data Agent, the
semantic model and the ontology. Completed evidence work and remaining human
submission/access checks are distinguished below.

- [x] **Customer name removed everywhere it was found**, including inside base64 definition payloads that plain-text search misses. `node tools/check-branding.mjs` returns zero findings and `tests/branding.test.mjs` guards it. Remote artifacts were updated surgically and re-verified (agent answers, six DAX comparisons, ontology read-back).
- [x] **Rebranded app deployed and verified** on the existing protected URL: Zava header, fictional-company disclaimer, 120 markers and rows, panel order, no old name on the page, KPIs equal to DAX and SQL.
- [ ] **Confirm the PayGo capacity is turned on before judging.** `demodinoeast2` (F64, East US 2) is a **PayGo** capacity; the last recorded SQL-connector preflight confirmed it **Active on October 30**, not continuously available. Recheck before review: without it the app, agent, model and ontology cannot be viewed. **The Hackathon owner needs to be nudged by the judges in order to turn it on.** Turn it off afterward to stop billing.
- [ ] **Do not use older screenshots or recordings.** Any capture made before this rebrand shows the old header text, including the images kept outside the repository (hosted and native captures of the fleet app). Recapture in a normal Edge window; the two new images in [docs/evidence](evidence) were taken in the integrated browser and leave blank space below the content.
- [x] **Markdown scrubbed of personal values (October 30).** The account, tenant ID and workspace ID values were removed from every Markdown file and replaced with `<approved-account>`, `<tenant-id>` and `<workspace-id>` placeholders; a corporate email and username in the internal plan were also replaced. Scanned: 59 Markdown files, 0 remaining.
- [x] **Non-Markdown files scrubbed into a separate public copy (October 30).** An export script kept with the private working tree, which it only reads, writes a sanitized copy to a new folder. It replaces account, tenant, workspace, capacity and Fabric item identifiers (including unhyphenated forms inside item names and base64 definition payloads) with placeholders, redacts capacity and Eventhouse hostnames, and leaves out deployment state, local settings, generated data, the internal plan, Git history and dependencies. Its built-in checks and an independent byte-level search found no remaining private values, tokens, connection strings or webhook URLs. The five screenshots were reviewed by eye and carry no metadata, all links resolve, and offline tests passed on the copy (145 Node tests, 113 frontend tests). Kept deliberately: the hosting URL in four judge-facing documents, and capacity, workspace and item names. **Re-export after any change and review every new image by eye. Publish only the copy, as a fresh repository, because the working directory's Git history contains the original identifiers.**
- [x] **PROJECT_PLAN.md excluded from the public copy.** It is internal planning material (it also describes Teams and secrets that were not built); the working directory must not be published.
- [x] **Record the selected experiments, including blocked outcomes.** E-AGENT-SEMANTIC is complete (FB-034: hypothesis refuted for minimal instructions). E-AGENT-ONTOLOGY was blocked at context attachment on Standard and Preview (FB-035); no ontology-backed answers were tested. E-TEMPLATE is complete locally (FB-036): project naming works, custom business tokens remain and Git-ignored operational state is copied. Both scratch outputs were removed; 88 frozen files stayed unchanged. See [results](evidence/template-experiment.json) and [completed experiments](../RAYFIN-FEATURES.md#completed-experiment-results).
- [x] **E-CONNECTOR-SQL complete as a read-only CLI experiment (FB-037).** Exact source discovery, declaration, one real synthetic Region row and recovered schema discovery (12 tables) verified without deployment. [Measured evidence](evidence/connector-sql-experiment.json) records the audience workaround and mixed JSON stdout. Scratch projects removed; 88 frozen files unchanged. Do not claim deployed app-identity access or frontend connector integration.
- [x] **Update the feature and feedback docs with real results.** Six experiment outcomes map to FB-032 through FB-037 and evidence. [Features](../RAYFIN-FEATURES.md), [curated feedback](../PRODUCT-FEEDBACK.md), [ledger](../FEEDBACK-LOG.md), README and demo wording now distinguish live capabilities, isolated tests, blocked paths and untested claims. Scope-related causes are labeled unproven; tuned agent scores are not an independent benchmark. This was documentation reconciliation, not a new experiment or deployment.
- [ ] **Do not distribute the raw working tree as a template.** Local scaffolding was tested, not a second working deployment. Use the [future staging recipe](../REUSABLE-PATTERNS.md#safe-future-template-packaging-not-executed) after the deferred scrub; target/agent rebinding, supported-runtime validation and safe packaging remain unfinished.
- [ ] **Claims check.** Ontology queries, ontology-backed agent answers, embedded-portal acceptance of the latest build, second-user permissions, Secret Store, deployed connector invocation, link sharing and real notification delivery are **not** verified and must not appear as achievements. SQL CLI source inspection is verified separately, not an app-integration claim.

## Final sign-off and stop rule

- [ ] An authorized human approves the evidence, sources, privacy, licensing,
  access, and final narrative. Every claim has a matching actual result or is
  explicitly pending/not implemented.
- [ ] Confirm live link, reviewer access, submission fields, artifact/video limits,
  and the actual deadline. A protected link is not proof judges can sign in.
- [ ] Submit only through the approved human process. Mark the draft submitted
  only after a real submission receipt is available; none is asserted here.

If a pending item is not completed before freeze, **narrow the claim or use a
clearly labeled existing recording**. Do not manufacture evidence, create extra
features/resources, reset state, or hide failed acceptance to make the checklist
look complete. Permission, embedding, observability, and accuracy gaps can be
valuable feedback when their limits are stated precisely.
