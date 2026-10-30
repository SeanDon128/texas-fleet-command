# Fabric Apps implementation feedback log

## Evidence policy

This log records observed outcomes, not a quota of defects. Successful experiments
are useful feedback too. An API acceptance, item listing, or completed load is not
proof that a downstream query works. Do not classify local invocation mistakes,
normal synchronization lag, or missing delegated scopes as confirmed service bugs.

Environment: Windows, Rayfin 1.36.2; Fabric F64 PayGo in East US 2. This ledger
covers **October 27-30, 2026**, with **37 entries** and six intentional experiments.
Initial runs used Node 24.22.1, npm 11.19.1 and Azure CLI 2.91.0.
E-TEMPLATE and E-CONNECTOR-SQL used Node 26.13.0, outside the CLI's declared
Node 20/22/24 ranges; their entries preserve that portability limitation.
Remote mutations targeted the approved Trucks Rayfin workspace; local experiments
used disposable directories. Exact item IDs are
in the [target configuration](config/fabric-target.json); redact tenant/item
identifiers if sharing outside the authorized audience.

Times are only stated when measured. Hosted statewide, Houston-detail, narrow
layout, and portal-loading screenshots are saved in the session evidence files.
The entries identify missing evidence explicitly; command results are available
in the build conversation, but should be exported/scrubbed before submission.
Never include tokens, secret values, webhook URLs, or internal document excerpts.

Severity: S0 core demo blocked; S1 feature blocked; S2 recoverable friction;
S3 documentation/polish; Positive successful behavior worth preserving.
Severity records the observed incident, not necessarily an unresolved issue today.
For reconciled results and claim boundaries, use [RAYFIN-FEATURES.md](RAYFIN-FEATURES.md#completed-experiment-results);
for the prioritized engineering asks, use [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md).

## FB-001 - Scaffold option placement is not obvious

| Field | Observation |
|---|---|
| Feature / availability | Universal App scaffold, installed Rayfin 1.36.2 |
| Scenario attempted | Initialize an unattended app in the existing project folder |
| Expected behavior | Noninteractive scaffold with an obvious option syntax |
| Actual behavior | `create-rayfin ... --yes` rejected the option; global `--yes` placement worked, then the nonempty-directory check stopped initialization |
| Setup experience | Required correcting invocation order before reaching the directory check |
| Documentation quality | This is an option-discoverability observation; no verified documentation contradiction established |
| Errors / friction | Unknown-option failure; nonempty-directory refusal |
| Workaround required | Correct global option placement; explicitly review overwrite behavior |
| Time lost | Not measured separately |
| What worked well | Existing-directory protection prevented a silent overwrite |
| Enterprise/customer impact | Automation authors need predictable CLI parsing and safe existing-folder behavior |
| Severity / outcome | S2; recovered |
| Suggested product improvement | Include the accepted option location and corrected invocation in the parser error |
| Suggested documentation improvement | Add PowerShell and noninteractive existing-directory examples |
| Screenshot/evidence needed | Capture `--help`, the failed invocation, corrected invocation, and directory prompt; no raw terminal export saved yet |

## FB-002 - Windows initialization stopped after copying template files

| Field | Observation |
|---|---|
| Feature / availability | Universal App initialization, Rayfin 1.36.2 |
| Scenario attempted | Initialize into a reviewed nonempty directory with overwrite explicitly selected |
| Expected behavior | Complete configuration or identify a clearly retryable failure stage |
| Actual behavior | Template files copied, then initialization raised `EPERM` involving `.template-features`; post-copy configuration was incomplete |
| Setup experience | A partially initialized project looked present but was not ready to deploy |
| Documentation quality | Recovery required inspecting copied configuration and capability instructions |
| Errors / friction | Windows `EPERM`; exact operating-system cause not established |
| Workaround required | Apply the supported data-modeling pack, set project/service configuration, pin packages, install, and validate; preserve the original plan |
| Time lost | Not isolated; dependency installation itself took approximately six minutes and is not counted as a defect |
| What worked well | Capability-pack application and explicit configuration allowed recovery without repeatedly overwriting the project |
| Enterprise/customer impact | Interrupted bootstrap can lead to incorrect services or versions if partial state is mistaken for completion |
| Severity / outcome | S2; recovered, Windows root cause unconfirmed |
| Suggested product improvement | Report the failed stage, resulting configuration state, and safe resume/rollback instructions |
| Suggested documentation improvement | Add partial-initialization recovery guidance for Windows filesystem errors |
| Screenshot/evidence needed | Preserve scrubbed original error and reproduction environment; directory permission/lock details still needed before filing a confirmed bug |

## FB-003 - Partial bootstrap left version ranges instead of exact pins

| Field | Observation |
|---|---|
| Feature / availability | Scaffold dependencies and installed version-matched guidance |
| Scenario attempted | Reproduce the app against a known Rayfin release |
| Expected behavior | Exact, coherent Rayfin package versions |
| Actual behavior | Copied manifests retained alpha ranges after the interrupted bootstrap; recovery pinned all Rayfin packages to 1.36.2 |
| Setup experience | Required reconciling package declarations before installation |
| Documentation quality | Installed instructions favor version consistency; interrupted-copy behavior needs to be distinguished from a successful scaffold |
| Errors / friction | Risk of dependency drift; no runtime incompatibility was observed |
| Workaround required | Pin release-matched packages, keep one root lockfile, install once |
| Time lost | Not measured separately |
| What worked well | Exact pins installed and built successfully |
| Enterprise/customer impact | Reusable hackathon templates should reproduce the same package behavior |
| Severity / outcome | S3; mitigation complete; not established as a normal successful-scaffold defect |
| Suggested product improvement | Validate/report final dependency pins before declaring initialization complete |
| Suggested documentation improvement | Document the expected manifest state after interrupted initialization |
| Screenshot/evidence needed | Manifest/lockfile and installed versions; a successful clean-scaffold comparison remains needed |

## FB-004 - East US 2 code-first relational provisioning succeeded

| Field | Observation |
|---|---|
| Feature / availability | AppBackend and app-owned Fabric SQL; verified in this tenant/region |
| Scenario attempted | Deploy ten authenticated operational entities with nullable relationships |
| Expected behavior | Correct tables, relationships, and authorization configuration |
| Actual behavior | AppBackend, managed SQL database, and SQL endpoint created in Trucks Rayfin; 13 enabled/trusted FKs verified; 3,583 SQL rows reread successfully |
| Setup experience | Reviewed dry run, exact workspace/tenant targeting, owner-token deployment |
| Documentation quality | Relationship and optional-FK guidance was usable; installed package docs were important |
| Errors / friction | No remaining schema-provisioning error; end-user API authentication is a separate gate |
| Workaround required | Avoid a circular current-assignment reference by using `Assignment.isCurrent`; both optional navigation and FK must be nullable |
| Time lost | Not separately measured |
| What worked well | Typed contracts, bounded text fields, real FKs, and owner SQL access composed successfully |
| Enterprise/customer impact | A viable relational app foundation without a separate manually managed database schema |
| Severity / outcome | Positive; SQL provision and persistence verified, API access not yet verified |
| Suggested product improvement | Preserve dry-run clarity and expose generated schema/constraint checks as a deployment report |
| Suggested documentation improvement | Include a small fleet-like relational example with optional relationships and API/SQL verification distinguished |
| Screenshot/evidence needed | Workspace inventory, 13 trusted FK results, populated tables; capture portal screenshots before submission |

## FB-005 - Coordinate columns require explicit decimal scale

| Field | Observation |
|---|---|
| Feature / availability | Code-first `@decimal`, Rayfin 1.36.2 |
| Scenario attempted | Store map coordinates accurately |
| Expected behavior | Six-decimal coordinate storage suitable for synthetic map markers |
| Actual behavior | Default decimal metadata is `DECIMAL(18,2)`; explicit precision 9/scale 6 produced the intended SQL columns and exact fixture round trip |
| Setup experience | Needed to inspect decorator defaults rather than assume coordinate precision |
| Documentation quality | Generic decimal behavior is not a geospatial recommendation |
| Errors / friction | Potential coordinate rounding; no claim that inaccurate coordinates were deployed |
| Workaround required | Specify `@decimal({ precision: 9, scale: 6 })` for every latitude/longitude column |
| Time lost | Not measured |
| What worked well | Explicit precision is supported, persisted, and testable |
| Enterprise/customer impact | Two-place coordinates would produce visibly misleading fleet locations |
| Severity / outcome | S3 documentation opportunity; prevented before data loading |
| Suggested product improvement | Consider a coordinate-specific field helper or validation warning for low-scale coordinate fields |
| Suggested documentation improvement | Add a latitude/longitude example with explicit precision and scale |
| Screenshot/evidence needed | Decorator metadata and INFORMATION_SCHEMA precision/scale query; source/schema tests already encode the requirement |

## FB-006 - Delta load completion and SQL catalog readiness are different gates

| Field | Observation |
|---|---|
| Feature / availability | OneLake file upload, Preview Lakehouse Load Table API, SQL analytics metadata sync |
| Scenario attempted | Upload two CSVs, load Delta tables, then query history through SQL analytics |
| Expected behavior | Completed table loads followed by discoverable SQL tables, with clear readiness status |
| Actual behavior | Both load operations succeeded and OneLake listed both tables in `dbo`; SQL initially returned error 208 for `dbo.fleet_daily_kpi`; subsequent synchronization and fresh SQL reads verified 240 and 3,600 rows |
| Setup experience | Needed three distinct checks: load operation, Delta inventory, and SQL query |
| Documentation quality | Learn documents background synchronization and a manual metadata-refresh API; load completion alone does not communicate query readiness |
| Errors / friction | A bounded 180-second query retry expired; refresh later reported `NotRun` with prior successful sync timestamps around 15:45:11 UTC |
| Workaround required | Inspect completed operation IDs; request refresh with `recreateTables: false`; accept neither listing nor `NotRun` as proof and run exact-content SQL verification |
| Time lost | One verification window exceeded 180 seconds; total service synchronization latency not measured |
| What worked well | Uploads, both Delta loads, metadata diagnostics, and eventual SQL row-for-row verification succeeded without reloading tables |
| Enterprise/customer impact | A downstream app/agent can fail immediately after an apparently successful ingestion |
| Severity / outcome | S2; resolved; observed lag is not by itself a confirmed service defect |
| Suggested product improvement | Surface SQL-ready state or a link to catalog-sync diagnostics beside load completion |
| Suggested documentation improvement | Provide a load -> catalog -> query verification example, including `NotRun` semantics |
| Screenshot/evidence needed | Operation IDs in the data-model doc, error 208 transcript, per-table sync timestamps, final verifier output, portal table screenshots |

Sources: [Load Table API](https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/tables/load-table),
[metadata synchronization](https://learn.microsoft.com/en-us/fabric/data-engineering/sql-analytics-endpoint-metadata-sync),
[Refresh SQL Endpoint Metadata](https://learn.microsoft.com/en-us/rest/api/fabric/sqlendpoint/items/refresh-sql-endpoint-metadata).

## FB-007 - Table format response casing differs from the example

| Field | Observation |
|---|---|
| Feature / availability | Lakehouse List Tables API |
| Scenario attempted | Verify that uploaded tables were created as Delta |
| Expected behavior | Response compatible with the example format string `Delta` |
| Actual behavior | Service returned lowercase `delta`; the first case-sensitive verifier rejected otherwise valid tables |
| Setup experience | A client-side validation assumption failed after successful loads |
| Documentation quality | Example casing should not be mistaken for a guaranteed enum contract |
| Errors / friction | False-negative verification; no server load failure |
| Workaround required | Normalize the response case before comparing format |
| Time lost | Not measured separately |
| What worked well | The table inventory exposed both expected tables and their format |
| Enterprise/customer impact | Strict example-derived checks can incorrectly report successful provisioning as failure |
| Severity / outcome | S3; local verifier corrected |
| Suggested product improvement | Keep serialized enum values consistent if casing is contractual |
| Suggested documentation improvement | State whether casing is contractual; align examples with live responses |
| Screenshot/evidence needed | Save scrubbed List Tables response and corrected validation output |

Source: [List Tables API](https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/tables/list-tables).

## FB-008 - Direct Entra exchange did not identify the missing-scope prerequisite

| Field | Observation |
|---|---|
| Feature / availability | SDK `signInWithEntraToken`, installed 1.36.2 direct-Entra guide |
| Scenario attempted | Authenticate an automated Data API smoke test using the approved Azure CLI session |
| Expected behavior | Authenticated API access, or a specific scope/permission diagnostic |
| Actual behavior | Fabric and Power BI audience tokens both returned `AUTH_FAILED`; their decoded claims had `user_impersonation`, not the guide's required `Item.Execute.All` delegated scope |
| Setup experience | Correct tenant/audiences and `externalEntraExchange: true` were insufficient for this test |
| Documentation quality | Guide states the Execute scope requirement; the observed error did not point to it |
| Errors / friction | Generic `Entra authentication failed`; missing-scope prerequisite is a likely explanation, not a proven root cause |
| Workaround required | None applied to API auth; owner-token SQL established the data foundation independently. Next validate supported Fabric SSO/Execute-scoped auth without anonymous policies |
| Time lost | Not measured separately |
| What worked well | Tenant checks prevented wrong-account access; SQL seeding did not require weakening API authorization |
| Enterprise/customer impact | Automation needs actionable separation of scope, audience, tenant, item permission, and feature-configuration failures |
| Severity / outcome | S1 for automated API validation; still open, not evidence that Fabric SSO is broken |
| Suggested product improvement | Return safe, specific prerequisite diagnostics with request ID, without echoing tokens |
| Suggested documentation improvement | Show an end-to-end supported method of obtaining the required delegated scope, plus common failure examples |
| Screenshot/evidence needed | Error code/request ID if available, config flag, scrubbed claims limited to tenant/audience/scope; never save raw tokens. Normal SSO result still missing |

## FB-009 - Safe deterministic seeding is a reusable application pattern

| Field | Observation |
|---|---|
| Feature / availability | App-owned SQL accessed with owner Entra token; custom reference tooling |
| Scenario attempted | Populate and then rerun the same synthetic load without duplicating or overwriting data |
| Expected behavior | All-or-nothing initial load and an exact idempotent rerun |
| Actual behavior | 3,583 rows committed transactionally, reread field by field, and a second seed run verified the nonempty database instead of overwriting it |
| Setup experience | Deterministic UUIDs, schema discovery, and explicit load ordering were necessary |
| Documentation quality | API policies and owner SQL access must be described as separate authorization paths |
| Errors / friction | No remaining seed failure; destructive rebasing intentionally unsupported |
| Workaround required | Custom initial-load/verification tooling, not temporary anonymous APIs |
| Time lost | Not measured; this was planned implementation |
| What worked well | Actual FK enforcement, precision checks, fixture reconciliation, and no-overwrite reruns |
| Enterprise/customer impact | Reference apps need repeatable demos without erasing operator-created alerts |
| Severity / outcome | Positive; verified; not a claim that Rayfin provides this reset workflow |
| Suggested product improvement | Offer a supported authenticated seed/reset workflow with clear preservation semantics |
| Suggested documentation improvement | Include deterministic IDs, transaction boundaries, verification, and safe rerun behavior |
| Screenshot/evidence needed | Save first-load and exact-rerun output; include mismatch/no-overwrite automated test evidence if added later |

## FB-010 - CLI cache/keychain failure did not block normal browser SSO

| Field | Observation |
|---|---|
| Feature / availability | Rayfin CLI 1.36.2 authentication and supported local development on Windows |
| Scenario attempted | Reuse the approved account for the CLI-backed local automatic sign-in path |
| Expected behavior | Read the credential cache or complete secure interactive sign-in |
| Actual behavior | `login status` reported an unparseable token cache and `not-signed-in`; tenant-specific `login` then failed with `OS keychain is not available and plaintext token storage is not enabled` |
| Setup experience | Azure CLI and Fabric browser sessions were valid, but they are not the same cache as Rayfin CLI |
| Documentation quality | Error documents the explicit plaintext fallback; installed auth guide also documents normal Fabric browser brokerage |
| Errors / friction | Cache parse failure, followed by secure-storage failure; exact OS/native-module root cause remains unconfirmed |
| Workaround required | Build and run Vite production preview on the allowed localhost origin; use the normal Microsoft/Fabric popup, preserving the existing auth gate |
| Time lost | Not isolated; no precise duration claimed |
| What worked well | Normal popup SSO completed and authenticated GraphQL reads succeeded without plaintext CLI storage or anonymous access |
| Enterprise/customer impact | Secure-cache failures should not force developers to weaken protected hosting or API authorization |
| Severity / outcome | S2; CLI local-auto-login path remains blocked, browser-broker path verified |
| Suggested product improvement | Distinguish unreadable encrypted cache from invalid JSON and unavailable keychain; report safe native-module/keychain diagnostics and supported alternatives |
| Suggested documentation improvement | Show normal browser SSO in production preview as a separate validation path; clearly distinguish Azure CLI, Rayfin CLI, browser broker, and direct-token prerequisites |
| Screenshot/evidence needed | Scrubbed cache/keychain errors and successful fleet read counts; never export credential caches or raw tokens |

## FB-011 - Complete pagination matters even for a 120-vehicle prototype

| Field | Observation |
|---|---|
| Feature / availability | App-owned GraphQL fluent client, installed Rayfin 1.36.2 |
| Scenario attempted | Load the complete persisted fleet and current assignments |
| Expected behavior | Exactly 120 vehicles and 120 current assignments, with no silent 100-record truncation |
| Actual behavior | `.first(100).executePaginated()` followed by `.after(endCursor)` returned all 120; browser DOM contained 120 vehicle markers |
| Setup experience | Stable ID ordering and identical query shape were retained between pages |
| Documentation quality | Installed GraphQL guide explicitly warns that `.execute()` returns only the current page; this guidance prevented an easy demo defect |
| Errors / friction | No observed backend pagination defect; `.execute()` ergonomics remain a discoverability risk |
| Workaround required | Reusable complete-read helper with duplicate-ID, cursor-progress, page-limit, and per-page timeout checks; partial failures reject the entire snapshot |
| Time lost | None measured; planned implementation |
| What worked well | Source metrics reconcile to SQL: 120 vehicles, 16 delayed, 25 active alerts across 19 vehicles, 10 stale reports |
| Enterprise/customer impact | A plausible-looking map can hide vehicles and undercount exceptions if a default page is mistaken for a full result |
| Severity / outcome | Positive; complete authenticated reads and marker counts verified |
| Suggested product improvement | Consider a supported bounded `executeAll` helper or an explicit completeness indicator for collection reads |
| Suggested documentation improvement | Preserve the warning and include tests for 100+20 rows, repeated/missing cursors, and later-page failures |
| Screenshot/evidence needed | Statewide map, all-vehicle roster, reconciled counts, and pagination tests; avoid saving response authorization headers |

## FB-012 - Normal Fabric popup SSO and stored-session restoration succeeded

| Field | Observation |
|---|---|
| Feature / availability | Fabric brokered auth provider, Rayfin 1.36.2 |
| Scenario attempted | Open the production-built app on localhost, authenticate with Microsoft, and reload |
| Expected behavior | No protected fleet content before authentication; session established by the broker, then reused safely on standalone reload |
| Actual behavior | Sign-in gate displayed first; Microsoft/Fabric popup completed; live fleet reads returned 120 vehicles, eight regions, 120 assignments, and 38 alerts; reload restored access |
| Setup experience | Existing Fabric browser session was signed into the approved tenant, including user-completed MFA |
| Documentation quality | Normal broker flow is distinct from direct-Entra exchange and CLI local-auto-login, as the installed docs explain |
| Errors / friction | The other two auth paths had separate failures recorded in FB-008 and FB-010; neither established that browser SSO was broken |
| Workaround required | None to auth policy; used the documented popup flow from a user gesture |
| Time lost | Not measured separately |
| What worked well | Existing bootstrap/provider/auth gate/client singleton remained intact; no app-owned Azure/MSAL cache bridge was needed |
| Enterprise/customer impact | Independent validation of auth paths prevents one developer-tool failure from being misclassified as a general SSO outage |
| Severity / outcome | Positive for local production popup and reload; protected-host/embedded validation recorded separately when completed |
| Suggested product improvement | Surface which auth path is active and provide actionable safe diagnostics |
| Suggested documentation improvement | Add a validation matrix separating popup, embedded, direct-token, and CLI-auto-login results |
| Screenshot/evidence needed | Signed-out gate, signed-in fleet counts, hosted/embedded follow-up; never include MFA codes, passwords, session storage, or tokens |

## FB-013 - Protected hosting works with the existing SQL-backed app

| Field | Observation |
|---|---|
| Feature / availability | Protected static hosting and Fabric brokered auth; verified with Rayfin 1.36.2 in East US 2 |
| Scenario attempted | Publish the read-only fleet frontend onto the existing AppBackend, then open its direct hosting URL |
| Expected behavior | No signed-out app assets; authenticated live SQL data, complete pagination, and reload restoration |
| Actual behavior | Private-site gate appeared first; normal sign-in loaded all 120 markers and roster entries; reload restored access with zero app console/page errors during the clean reload |
| Setup experience | Target guard verified the approved tenant/workspace/capacity and existing app ID; dry run and apply both targeted the same item; no Functions or connectors declared |
| Documentation quality | Installed guide's direct-hosting validation requirement was useful; CLI success alone would not have proved browser behavior |
| Errors / friction | No hosted auth/data failure observed; separate Fabric embedded issue is FB-014 |
| Workaround required | None to hosting/auth policy; no anonymous access or plaintext credential cache |
| Time lost | Not isolated |
| What worked well | Houston investigation reconciled nine delayed vehicles, 11 active alerts across eight vehicles, and three critical alerts; controlled browser-only GraphQL 503s produced an explicit error and removed old metrics, then Retry restored all 120 |
| Enterprise/customer impact | A protected app can provide a useful source-backed operating picture without exposing its frontend or substituting cached/demo results during data failures |
| Severity / outcome | Positive for protected standalone; stale/different-user session replacement is not yet a live-tested claim |
| Suggested product improvement | Preserve explicit hosting URLs, existing-item targeting, and private-site gating in deployment output |
| Suggested documentation improvement | Include the private asset gate -> app session -> complete data read -> reload -> controlled failure/retry validation sequence |
| Screenshot/evidence needed | Captured `fleet-hosted-statewide.png`, `fleet-hosted-houston-dark.png`, and `fleet-hosted-mobile.png` in session files; export scrubbed deployment/read verification results; no credentials captured |

## FB-014 - Fabric portal embedded validation did not complete

| Field | Observation |
|---|---|
| Feature / availability | Actual AppBackend portal/embedded experience; standalone hosting separately verified |
| Scenario attempted | Open the existing app through its CLI-emitted Fabric portal link and the approved workspace |
| Expected behavior | Workload view loads, hosts the deployed app, and completes the Fabric auth handoff |
| Actual behavior | Workspace inventory loaded all five existing items, but the app route remained loading/blank in the VS Code integrated browser; the fleet app was not rendered and handoff could not be verified |
| Setup experience | Retried the exact app URL with/without the shell experience parameter; no workspace/region/policy changes made |
| Documentation quality | Guide correctly requires separate real-host validation; standalone success is not sufficient evidence for embedding |
| Errors / friction | Workload iframe was initially `about:blank`; later its request to `pbiabd.powerbi.com` was aborted and the iframe disappeared; a 404 was identified as userPhoto, not a fleet-app error; a separate HEAD request to the workload root returned HTTP 200 |
| Workaround required | Use the verified protected standalone app URL for this map milestone; retain embedded validation as an explicit follow-up |
| Time lost | Not isolated; no precise duration claimed |
| What worked well | Protected hosting, normal auth, source data, and SQL persistence remained usable independently of the portal view |
| Enterprise/customer impact | A nonsettling workload shell prevents an in-Fabric demo and obscures whether the problem is browser support, network loading, or the workload host |
| Severity / outcome | S2 recoverable for the standalone demo; embedded experience unverified, service root cause not established |
| Suggested product improvement | Time out workload bootstrap with actionable diagnostics and a direct hosted-app recovery link instead of indefinite loading/blank content |
| Suggested documentation improvement | Document supported browsers/iframe prerequisites and how to distinguish workload bootstrap from deployed app/auth failures |
| Screenshot/evidence needed | `fabric-embedded-loading.png` captured in session files; collect a scrubbed workload diagnostic/correlation ID and compare with normal Edge before filing a confirmed service defect |

**October 28 observability follow-up:** The native management surface eventually
loaded, and keyboard activation of **View app** rendered the prior hosted bundle
with all 120 vehicles and source-derived 120/16/25/10 cards. This is a real
owner-session rendering observation, not acceptance of another user's identity.
After the hardening deployment, bounded portal reloads at 16:45-16:48Z again left
workload frames at bootstrap/blank in the integrated browser; the new hosted
iframe and updated Function-history details could not be inspected. Consequently
new-bundle embedding and new browser-to-native request correlation remain
unverified. Standalone reload at 16:49Z independently succeeded. Do not assign a
service root cause or promise that earlier successful embedding is reproducible.

## FB-015 - Intermittent test-worker startup failure is a local validation constraint

| Field | Observation |
|---|---|
| Feature / availability | Scaffold Vitest validation on the shared Windows/Node 24 host; not established as a Rayfin service defect |
| Scenario attempted | Run the full frontend gate before publishing |
| Expected behavior | Every test file starts and finishes before deployment |
| Actual behavior | One run passed 60 tests in seven files, but the remaining worker failed to start; the guarded command stopped before any deployment; a subsequent single-thread run passed all 71 tests then present |
| Setup experience | Worker failure occurred before test execution; assertion timeout was not the cause |
| Documentation quality | Single-worker retry is documented locally; broader supported Node/Windows comparison still needed |
| Errors / friction | `[vitest-pool-runner]: Timeout waiting for worker to respond`; thread and fork startup both showed intermittent friction |
| Workaround required | Run one worker; for the later real-Leaflet marker tests, one fork passed all four after the thread failed to start; never report a failed worker run as passing |
| Time lost | Failed full run reported 116.97 seconds; failed marker-worker run reported 60.04 seconds; not all elapsed time is attributed to Rayfin |
| What worked well | Deployment exit-code guards prevented publishing after a failed gate; browser testing caught missing Enter/Space activation, and four actual Leaflet tests now protect the fix rather than testing only a mock map |
| Enterprise/customer impact | Flaky worker startup increases iteration time and can tempt teams to bypass validation |
| Severity / outcome | S2 local tooling friction; root cause remains unconfirmed |
| Suggested product improvement | Consider a supported low-concurrency validation profile with clear worker-start diagnostics |
| Suggested documentation improvement | Separate worker startup, test timeout, and application assertion failures in Windows troubleshooting guidance |
| Screenshot/evidence needed | Scrubbed failed/passing runner summaries plus environment; no machine credential caches or unrelated process details |

Final follow-up: the final-source full run passed 68 tests in eight files but
could not start the app-suite worker. That seven-test suite then passed on a
targeted retry (9.80 seconds), completing all 75 tests across nine files before
deployment. The final deployed map bundle was observed in the hosted browser;
both Enter and Space selected a vehicle successfully. A fresh SQL verification
then confirmed all 3,583 records and 13 foreign keys remained intact.

## FB-016 - Operational SQL through existing OneLake replication

| Field | Observation |
|---|---|
| Feature / availability | Fabric SQL OneLake replication, Lakehouse shortcuts, Data Agent Lakehouse source; verified in this tenant, not a general availability assertion |
| Scenario attempted | Query the authoritative synthetic fleet without a second seed or ETL pipeline |
| Expected behavior | Six existing replicated SQL tables accessible read-only through the existing Lakehouse |
| Actual behavior | Six shortcuts created; SQL initially lacked Regions.id, then explicit non-recreating metadata refresh exposed all six with correct 8/120/150/38/320/1 row counts; seven SQL examples executed; repeat dry-run preserved all six exact targets with no writes |
| Setup experience | Current public agent datasource enum omits SQLDatabase; the existing database's OneLake replica was discoverable and usable |
| Documentation quality | SQL mirroring overview explains automatic replication; connecting this to the agent's supported Lakehouse source requires stitching together documentation |
| Errors / friction | Repeated shortcut setup initially received HTTP 409 because inventory returns `/Tables/dbo` while creation accepts `Tables/dbo` |
| Workaround required | Normalize inventory paths, preserve matching targets, refuse conflicts, refresh SQL metadata without recreating tables |
| Time lost | Not isolated; no precise duration claimed |
| What worked well | No duplicate operational data load or new workspace; source counts matched authoritative SQL |
| Enterprise/customer impact | Supported-source discoverability and catalog readiness affect time to first useful agent answer |
| Severity / outcome | S2 setup friction; SQL source verified |
| Suggested product improvement | Offer direct supported SQL database source selection or clearly surface its OneLake/Lakehouse bridge and readiness status |
| Suggested documentation improvement | Add an end-to-end SQLDatabase -> OneLake shortcut -> Lakehouse SQL -> Data Agent recipe; document path normalization |
| Screenshot/evidence needed | Shortcut target inventory, scrubbed 409 request 00000000-0000-4000-8000-f5ba4a7a5376, verified table counts; no auth tables or credentials |

## FB-017 - Live MCP protocol differs from starter reference

| Field | Observation |
|---|---|
| Feature / availability | Published Fabric Data Agent MCP; verified in this tenant |
| Scenario attempted | Initialize, acknowledge, discover tool, ask source-backed fleet questions |
| Expected behavior | Negotiated MCP version and usable tool contract |
| Actual behavior | Initial strict 2025-03-26 check rejected HTTP 200 initialization because the server advertised 2025-06-18; after negotiation support, all four steps succeeded |
| Setup experience | Published definition applied via documented parts; actual MCP behavior verified rather than inferred from the update receipt |
| Documentation quality | Starter transport is a useful outline but must allow supported server negotiation and SSE/JSON differences |
| Errors / friction | Protocol mismatch was correctly exposed, not converted into a fabricated fleet answer |
| Workaround required | Support both reviewed versions and forward the negotiated MCP-Protocol-Version; optional session handling retained |
| Time lost | Not isolated |
| What worked well | Real first answer identified 19 affected vehicles; regional-delay smoke check included nine; observed exchanges around 17-22 seconds |
| Enterprise/customer impact | A successful HTTP response is not a successful protocol exchange; reference integrations should fail clearly and support negotiation |
| Severity / outcome | S2 integration friction recovered; author-identity and actual deployed app-owner MCP calls now both verified |
| Suggested product improvement | Ship version-negotiating, byte/time-bounded transport with explicit tool-discovery failure diagnostics |
| Suggested documentation improvement | Publish supported protocol versions and distinguish optional MCP tasks from awaited calls; include notification Accepted bodies |
| Screenshot/evidence needed | Safe initialize capabilities/version, transport tests, actual hosted answers compared with SQL; never capture bearer headers |

## FB-018 - Functions timeout guidance conflicts with installed SDK

| Field | Observation |
|---|---|
| Feature / availability | Functions application authentication, typed invocation, installed Rayfin 1.36.2 |
| Scenario attempted | Await a Fabric agent without increasing timeouts on unrelated app operations |
| Expected behavior | Accurate end-to-end limits and an isolated per-request timeout |
| Actual behavior | Project agent skill says client-wide timeout only and up to ten minutes; installed guide and FunctionClient.d.ts support invoke(input, { timeoutMs }) and document a 250-second host ceiling |
| Setup experience | Functions pack applied; official Core Tools 4.15.2 installed; root dev watcher regenerated the exact function contract |
| Documentation quality | Installed invocation guide is precise; project skill is inconsistent with it |
| Errors / friction | Following older prose would create an unnecessary second client and imply a host runtime the installed API cannot provide |
| Workaround required | 230-second outbound deadline, 245-second per-invocation timeout, visible roughly four-minute UI limit; no detached background work |
| Time lost | Not isolated |
| What worked well | Validator confirmed one authored/generated Function and zero unsafe casts; bounded transport's 18 initial tests passed |
| Enterprise/customer impact | Incorrect limits create doomed long-running requests and misleading progress UX |
| Severity / outcome | S2 documentation inconsistency; real hosted calls completed within the budgets (regional-status recovery 14.4s; refined attention answer 18.6s); full 230/245-second expiry is unit-tested, not deliberately waited out in the hosted browser |
| Suggested product improvement | Keep pack skills and published SDK signatures version-aligned, and expose host ceilings as supported constants |
| Suggested documentation improvement | Replace ten-minute/client-wide advice with version-specific per-call examples and explicit host/outbound/browser budgets |
| Screenshot/evidence needed | Scrubbed installed guide/type excerpts, generated-contract validation and hosted invocation outcome |

## FB-019 - Broad attention synthesis failed despite correct SQL example

| Field | Observation |
|---|---|
| Feature / availability | Published Fabric Data Agent, real hosted Function; verified tenant integration, generated accuracy not guaranteed |
| Scenario attempted | Ask "Which vehicles need attention, and why?" across the whole synthetic fleet |
| Expected behavior | Execute the supplied aggregate-before-join query; return at most 25 actual qualifying vehicles in critical-alert / active-alert / delay / vehicle-code order, with accurate reasons |
| Actual behavior | Initial answer listed 19 alert-affected vehicles but summarized 22; omitted delayed SYN-035, mixed nonqualifying examples into the explanation, and did not preserve priority order. Source SQL independently returned the correct 25 rows. After instruction refinement, the exact question and a priority paraphrase returned the correct 25-row order; all 225 browser-extracted cells in the paraphrase's nine-column table matched a fresh SQL query exactly |
| Setup experience | Six source tables and all seven SQL examples had already been verified; the failure was visible only when the complete generated answer was reviewed |
| Documentation quality | Query examples and correct initialization do not prove faithful synthesis of returned evidence |
| Errors / friction | No protocol/HTTP error; a plausible success answer contained incorrect analysis. A numeric-presence smoke test alone would miss this |
| Workaround required | Append answer rules at stage and source: use the single supplied query, preserve its bounded rows/order, output actual issue fields only, and never infer global counts from a capped result or prose |
| Time lost | Initial answer elapsed 25.4s; exact-question retest 18.6s; priority-paraphrase retest 20.2s; investigation duration not separately measured |
| What worked well | Ground-truth SQL, visible generated-analysis warning and read-only design made the discrepancy detectable without taking an incorrect automated action |
| Enterprise/customer impact | Incorrect affected-vehicle totals and omitted delayed vehicles undermine operational triage even when transport and source access work |
| Severity / outcome | S1 correctness failure before mitigation; exact-question and one paraphrase corrected, not an assurance of arbitrary-question accuracy |
| Suggested product improvement | Expose query/result provenance and a synthesis-consistency check for counts, included entities and priority ordering; make capped-list versus fleet-total semantics explicit |
| Suggested documentation improvement | Add adversarial golden-answer checks for exact entity set/order, stale thresholds, aggregate joins and unsupported total claims; distinguish SQL correctness from generated synthesis correctness |
| Screenshot/evidence needed | Retained `fleet-agent-attention-before-refinement.png`; later clipped/tiled after-captures were discarded, so recapture the corrected answer in normal Edge. Initial request 00000000-0000-4000-8000-f18aa0fca07f, corrected exact-question request 00000000-0000-4000-8000-fe11e0e078a9, exact-SQL-checked paraphrase request 00000000-0000-4000-8000-f346606ac823; export scrubbed SQL comparison before external filing |

## FB-020 - Deployed application-authenticated Q&A and failure recovery

| Field | Observation |
|---|---|
| Feature / availability | Rayfin Functions application auth, typed per-call invocation, protected hosting, Fabric Data Agent MCP; actually exercised in East US 2 |
| Scenario attempted | Invoke the published agent from the existing protected app, then inject a browser-only HTTP 503 and retry against the real backend |
| Expected behavior | Fabric app-owner token available server-side; source-backed answers, bounded pending state, explicit failure without substitute data, and recovery without policy changes |
| Actual behavior | Real hosted answers matched affected-vehicle, regional-delay, stale-report, regional-status, last-hour and SYN-027 source checks. Controlled 503 removed the prior answer, displayed an explicit safe error/Retry and left map metrics intact. Interception was removed in finally; keyboard Retry returned all 37 region/status groups and eight totals correctly. A final clean reload and fresh SYN-027 invocation had zero page/console errors or failed app-origin requests |
| Setup experience | Explicit Functions deployment targeted the existing AppBackend; associated UserDataFunction item created in the same approved workspace; no stored API secret or browser Fabric-token bridge |
| Documentation quality | Generated input/result contract and installed per-call timeout API worked; author CLI access was correctly treated as insufficient runtime proof |
| Errors / friction | Controlled outage emitted the expected browser HTTP error and fixed sanitized app log. Two integrated-browser pointer retry attempts reported paragraph interception although DOM boxes did not overlap; keyboard retry succeeded. Pointer retry/root cause is not a verified app or platform defect |
| Workaround required | No auth workaround; used native keyboard activation for the browser recovery check; no force-click or fake answer |
| Time lost | Recovered regional-status invocation 14.4s; no total setup-duration claim |
| What worked well | Completion moved focus to result; all 120 vehicles and independent 16 delayed / 25 active alert / 10 stale metrics remained available; keyboard map selection still displayed SYN-027's current assignment; theme switching applied; measured narrow/wide layouts had no horizontal overflow; 83 frontend + 18 transport + 115 data tests passed |
| Enterprise/customer impact | Demonstrates a private operating picture plus governed natural-language investigation, without exposing service credentials or presenting outage fallbacks as live analysis |
| Severity / outcome | Positive for deployed owner-runtime, explicit errors and keyboard recovery; embedding, stale/different-user identity replacement and per-user agent RLS remain unverified |
| Suggested product improvement | Preserve automatic typed contracts and owner-runtime Fabric token delivery; provide safe invocation references and explicit hosting/runtime readiness diagnostics |
| Suggested documentation improvement | Include runtime-owner verification and browser-only failure injection with cleanup, and require semantic answer review separately from transport smoke tests |
| Screenshot/evidence needed | Recapture final desktop/mobile Q&A in normal Edge: integrated-browser viewport changes produced clipped/tiled images, not submission-ready evidence and not a confirmed app defect. Preserve scrubbed deployment/persistence/test summaries; no tokens, auth storage or real operational inputs |

## FB-021 - Typed lookup and mutation results omit entity fields at runtime

| Field | Observation |
|---|---|
| Feature / availability | Rayfin typed data client 1.36.2, authenticated GraphQL, actually exercised in the protected East US 2 app |
| Scenario attempted | Validate the selected synthetic vehicle and same-region fictional recipient before creating an alert; later retain full alert state on status updates |
| Expected behavior | Full-entity return types should either provide their advertised fields or encode a selected/partial shape |
| Actual behavior | The live `vehicle_by_pk` and `teamMember_by_pk` responses each contained only `id`. The SDK `findById` implementation explicitly selects only the primary key, while its declared return type is the full entity. Update mutation source similarly selects the input fields plus ID, rather than a full row |
| Setup experience | Static typecheck/build/lint and unit mocks returning full entities did not reveal the lookup mismatch. The form correctly refused the incomplete references before any create request, preserving its message and request ID |
| Documentation quality | Installed convenience-method prose describes a matching record but does not warn that only its ID is fetched. Mutation return typing similarly obscures field projection |
| Errors / friction | Initial hosted create could not proceed. Captured responses showed HTTP 200 and only `id`; no SQL row was created in those attempts |
| Workaround required | Use typed explicit `select(...).where(...).findFirst()` for record validation/retry checks. Preserve selected preflight data and merge authoritative update response fields. Updated mocks to return partial mutation projections |
| Time lost | Not separately timed; failed-request, diagnosis and successful-retest outputs are retained in the execution conversation |
| What worked well | Fail-closed validation prevented an invalid-reference write; input retention, stable-ID retry and sanitized logs worked as designed |
| Enterprise/customer impact | Valid TypeScript can accidentally treat missing runtime data as full records, block legitimate workflows, or erase local context following an update |
| Severity / outcome | S1 integration blocker; corrected selected lookups and projected updates passed the hosted create/acknowledge/resolve lifecycle and recovery tests |
| Suggested product improvement | Add typed result selection to convenience lookups and mutations, or return an accurately typed ID/field projection rather than the full entity type |
| Suggested documentation improvement | Show exact runtime return shapes and a create/update/readback example; do not mock fuller records than the SDK actually selects |
| Screenshot/evidence needed | Export scrubbed response field inventories and source/type declarations; no tokens or request headers. Hosted acceptance is recorded in [ALERTS.md](docs/ALERTS.md); recapture final normal-Edge screenshots before packaging |

## FB-022 - Caller-authenticated shared workflow, partial commit and durable repair

| Field | Observation |
|---|---|
| Feature / availability | Typed Rayfin GraphQL mutations, action-specific create policy and update-field inclusion; deployed protected app in the existing East US 2 AppBackend |
| Scenario attempted | Create an alert for SYN-027 and a fictional HOU recipient, reload/acknowledge/reload/resolve/reload; separately interrupt only its FleetEvent write, reload and repair; intentionally test creator and immutable-field policies |
| Expected behavior | Persist an authoritative alert, never invent a notification or roll back a confirmed write, expose partial completion and recover without duplicates; deny a different creator or a protected-field edit |
| Actual behavior | One complete lifecycle persisted three event kinds with matching original timestamps/subjects. An injected HTTP 503 left one saved alert and zero events; the UI retained the draft and reported partial completion. After reload, keyboard synchronization created exactly the missing event from persisted metadata. No second alert was created. A spoofed creator returned GraphQL BadRequest and SQL confirmed zero inserted rows; editing message during acknowledgement returned GraphQL Forbidden. Removing interception and retrying the original requests succeeded |
| Setup experience | Reused the existing Alert/TeamMember/FleetEvent entities and normal caller session. Added only three nullable audit fields and narrowed Alert updates to lifecycle fields; no Function/secret/external endpoint was added |
| Documentation quality | Individual mutation operations are straightforward, but the absence of a documented multi-record transaction/CAS/outbox means application authors must design partial-write recovery rather than assume atomicity |
| Errors / friction | Event-write outage and policy violations were deliberate browser-only tests, not service outages. Creator mismatch surfaced only as `Could not insert row with given values.`; immutable-field rejection had a clearer Forbidden code |
| Workaround required | Stable request ID, explicit selected reads, returned-field merging, deterministic event IDs and saved action metadata. The generic optimistic CRUD hook was not used because a failed event cannot roll back an already committed alert |
| Time lost | No separate duration measured; first lifecycle timestamps were 14:10:36Z create, 14:11:06Z acknowledgement and 14:12:00Z resolution on October 28. These are action timestamps, not a claim about platform latency |
| What worked well | Protected gate, caller-subject policy, update-field restrictions, complete pagination, keyboard actions and cross-reload recovery. Inbox refresh retained filters/selection and an existing agent answer. Narrow/wide layouts fit; final clean check had zero page/alert-console/app-request failures |
| Enterprise/customer impact | Delivers a coherent investigate -> assign -> track prototype without mistaking fictional assignments for real delivery, or presenting a successful first write as a total failure |
| Severity / outcome | Positive for the tested shared-inbox/permission/recovery paths; production multi-operator concurrency, server-stamped audit identity, real recipients and assignee authorization remain explicit gaps |
| Suggested product improvement | Offer a caller-authorized conditional mutation/transaction or durable workflow/outbox pattern. Preserve exact field-level denial diagnostics; provide a safe policy-check denial code for create failures |
| Suggested documentation improvement | Add a two-entity partial-commit recovery example with stable IDs, reload recovery and projected mutation responses; explicitly distinguish shared assignment from notification and recipient-only RLS |
| Screenshot/evidence needed | [Hosted acceptance](docs/ALERTS.md), scrubbed SQL counts/timestamps and GraphQL denial codes. Native saved screenshots were clipped after viewport changes and discarded; recapture inbox and a full operator timeline in normal Edge. All three temporary alerts and six events were deleted by exact-ID, guarded transaction; original rows/history were reverified |

## FB-023 - Native app Metrics time windows and error-rate semantics

| Field | Observation |
|---|---|
| Feature / availability | Native Fabric app Metrics, verified available in the approved East US 2 owner session; not an assertion of GA or consumer access |
| Scenario attempted | Inspect all six native metrics and compare Last 30 days, Last 7 days and Last 24 hours to successful platform responses for this existing app |
| Expected behavior | Recent activity is discoverable, time-window boundaries are explicit, and the error-rate description reconciles with the displayed counts or documents a different aggregation |
| Actual behavior | Last 24 hours (Oct 27 15:00Z to Oct 28 15:00Z) displayed 6 sign-ins, 14 loads, 220 queries, 2 errors, 1.42% error rate and 229.96ms average duration. The backend FULL Average was 1.4214046822742474%, correctly formatted by the UI. But 2 / 220 * 100 is approximately 0.91%, unlike the card description. Last 7 days ended Oct 28 00:00Z; 7/30-day views excluded today's partial day. A longer-window error card showed zero while its chart reported no metric data |
| Setup experience | Existing AppBackend -> Manage app -> Metrics; no extra capacity, permission, collector or telemetry service provisioned. Native platform requests returned HTTP 200, status ok, this app's artifact ID and no artifact errors |
| Documentation quality | Installed guide/CLI 1.36.2 searches found capacity/CU metrics and local CLI diagnostics, not substantive native app Metrics semantics or a supported query SDK |
| Errors / friction | Denominator/aggregation/coverage semantics unresolved. Missing/null observations can look like zero. Initial listener issue was our automation using an unavailable outer URL constructor, not a platform defect; corrected to string matching |
| Workaround required | Use Last 24 hours for recent activity, state actual UTC bounds and report source Average as such; do not recompute or relabel the platform percentage as a proven frontend bug |
| Time lost | Not separately timed; metric source windows and successful response values were captured. Snapshot numbers are not persistent acceptance targets |
| What worked well | No additional setup; six useful native metrics; source/status/time-window data lets us distinguish collection evidence from assumptions |
| Enterprise/customer impact | Operators could mistake a partial-day exclusion or missing samples for no activity/errors, or draw incorrect reliability conclusions from unreconciled denominators |
| Severity / outcome | S2 interpretability/documentation issue; native Metrics adoption verified, not a demo blocker. Two errors align with the controlled-test hour but causality is not proven |
| Suggested product improvement | Show exact UTC bounds/partial-period inclusion, missing-data state and rate numerator/denominator/weighting in the UI; explain why FULL Average differs from displayed aggregate counts |
| Suggested documentation improvement | Add native app Metrics navigation, aggregation/units, null-versus-zero behavior, timezone/time-window rules and a worked count/rate reconciliation example; distinguish query timing from Function/agent latency and CU billing |
| Screenshot/evidence needed | Selected native cards plus a scrubbed metric/value/window summary; [observability notes](docs/OBSERVABILITY.md). Capture in normal Edge if integrated-browser images are clipped; never include bearer headers or raw auth traffic |

## FB-024 - Native Function history is useful but hard to discover

| Field | Observation |
|---|---|
| Feature / availability | Native persisted Function invocation history and log details, verified for the existing published app-associated User Data Functions item in the owner session |
| Scenario attempted | Locate actual deployed Function logs and confirm that the authored safe completion event is retrievable, not merely emitted in local code |
| Expected behavior | A discoverable path from app management to invocation date/status/duration and safe request-level diagnostics, without reading secrets |
| Actual behavior | AppBackend Functions -> associated User Data Functions item -> Functions explorer -> select askFabricDataAgent -> More -> View historical log. Twelve successful invocations appeared. Selecting Oct 28 14:15:38.811 UTC showed native duration 41,229ms and the actual fleet-agent-completed JSON event (requestId, elapsedMs 40,209) in the detail table. Native invocation ID differs from application requestId |
| Setup experience | Existing Function, platform-provided Fabric-audience token and content-free authored logs; no new infrastructure, secret or log sink. Run is disabled in this child-item editor, but historical-log viewing works |
| Documentation quality | Installed observability search did not explain this app-child Function navigation. The initial app management sidebar exposed Metrics but no Logs entry; absence there was not proof Logs was unavailable |
| Errors / friction | Discovery crosses app management, child-item editor, function selection and an overflow menu. The native UI warns ingestion can take a few minutes. Retention/export, consumer RBAC and precise ingestion SLO remain unverified |
| Workaround required | Document the exact navigation and correlate application requestId inside the native invocation, not to the unrelated native invocation ID. New browser spans can supply that safe reference without logging content |
| Time lost | Discovery duration not separately measured. Recorded invocation/server timings are observations of different execution boundaries, not discovery effort or latency guarantees |
| What worked well | Persisted authored JSON was actually visible. Inspected platform context logs showed token presence/count/audience, not token values. No permission expansion or auth workaround was needed |
| Enterprise/customer impact | Native diagnostics support troubleshooting a governed agent without exporting prompts/answers or credentials; hidden navigation and ambiguous Succeeded semantics make handover harder |
| Severity / outcome | Positive native Logs adoption with S2 discoverability/documentation feedback. Runtime Succeeded does not certify generated-answer accuracy or a successful typed agent outcome; centralized frontend/database logging is not claimed |
| Suggested product improvement | Link invocation history from app Functions management; expose safe application correlation reference and outcome alongside runtime status, with documented privacy/retention/access controls |
| Suggested documentation improvement | Add an app-associated TypeScript Function example showing native history navigation, log delay, runtime versus returned failure, correlation across IDs, and safe structured logging without prompts/answers/tokens |
| Screenshot/evidence needed | Selected invocation list/detail with only safe fields, not complete raw exports. [Observability notes](docs/OBSERVABILITY.md) preserve the path and boundaries. New-release hosted correlation remains unverified: the bounded follow-up could not reload the native workload frame in the integrated browser, so no matching new invocation was inspected |

## FB-025 - Successful agent invocation can return an incorrect alert count

| Field | Observation |
|---|---|
| Feature / availability | Published Fabric Data Agent via the deployed Fabric-authenticated Function and existing Lakehouse SQL-replica shortcuts; same approved owner-session path |
| Scenario attempted | Ask the unchanged golden question "Why does SYN-027 need attention?" after exact cleanup/restoration of the synthetic baseline; compare the complete answer with the configured example SQL on both data surfaces, then repeat the same question |
| Expected behavior | Report the 38-minute delay, two active alerts including one critical, healthy status and non-stale telemetry; active means open or acknowledged |
| Actual behavior | The 16:37:26Z request returned three active alerts, one critical, with the correct delay/health/telemetry state. Operational SQL at 16:42:29Z and actual agent-source Lakehouse SQL at 16:43:09Z each returned exactly two open rows: one critical, one warning. A separate grouped alert-status query on each source also returned only two open alerts. The unchanged-question retest at 16:43:54Z returned the correct two active alerts at 16:44:26Z |
| Setup experience | Reused the published agent, Function, normal app session and guarded read-only SQL helpers; no republish, permission expansion, source mutation or prompt edit |
| Documentation quality | Existing instructions explicitly define active status, scenario time and the individual-vehicle query. A successful invocation/log event cannot certify that generated prose follows those rules |
| Errors / friction | No transport failure on the incorrect answer. Its application request was `00000000-0000-4000-8000-f7fc17c5d9ce`; the correct retest was `00000000-0000-4000-8000-f1cb50878417`. Later SQL reads cannot prove the replica state at the earlier query instant, so replica lag, caching and model behavior remain hypotheses |
| Workaround required | Keep the analysis advisory; cross-check source records before creating an alert. Use the repeatedly source-reviewed HOU/nine question as the primary demo question, not a canned response. Do not treat the successful retest as a permanent fix |
| Time lost | No separate investigation-duration measurement. Incorrect answer: browser 43,906ms / server 41.0s. Correct retest: browser 32,105ms / server 26.5s. These are execution boundaries, not measured engineering effort |
| What worked well | Source comparison isolated the discrepancy from a transport success. Existing UI warning, safe request correlation and independent map preserved a usable workflow; unchanged retest returned the correct result |
| Enterprise/customer impact | An incorrect active-alert count can misdirect prioritization even when runtime status is Succeeded. Natural-language output needs source traceability and semantic acceptance, not only availability metrics |
| Severity / outcome | S2 recoverable correctness concern for this advisory prototype; first answer failed semantic review, retest passed, cause unresolved and no fix claimed |
| Suggested product improvement | Provide inspectable generated SQL, execution time/source freshness and result provenance alongside the answer; make it easy to compare narrated counts with returned rows and correlate safe request IDs across app/agent diagnostics |
| Suggested documentation improvement | Add a semantic-validation recipe covering open/acknowledged/resolved, repeated identical questions after data changes, replica-versus-operational reads and the distinction between transport/runtime success and answer correctness |
| Screenshot/evidence needed | [Accuracy/recovery follow-up](docs/DATA_AGENT.md#hardening-release-accuracy-and-recovery-follow-up) records UTC times, safe request references and both source comparisons. Capture a scrubbed answer/source comparison before external packaging; do not export prompts/answers through the diagnostics helper or publish credentials/raw logs |

## FB-026 - Ontology create is documented but unavailable in this workspace

**Historical October 28 blocker.** The authorized October 29 retry succeeded
after user-reported tenant preview enablement; see FB-029. Preserve this
original observation without treating it as the current availability state.

| Field | Observation |
|---|---|
| Feature / availability | Documented generation-2 Fabric Ontology preview. Actual approved-tenant availability failed; gating/rollout cause is unknown, not proven to be a capacity-region issue |
| Scenario attempted | Add a Fleet_Operations ontology over the existing tx-fleet-command SQL analytics source, without modifying the frozen app or creating a new data source |
| Expected behavior | Create the documented new item, persist seven business entities/relationships with direct bindings, then read the definition back and verify actual data access |
| Actual behavior | Create at 2026-10-28T21:09:11.954Z-21:09:17.565Z returned HTTP 403 FeatureNotAvailable, non-retriable; request 00000000-0000-4000-8000-f29dfd3a3344. Portal New item search did not expose Ontology. Both post-attempt inventories were empty at 21:10:12.797Z. No item or binding/query round-trip exists |
| Setup steps / discoverability | Five reproducible stages: official generation-2 sample discovery, source inspection, local definition/build checks, one create attempt, portal/API availability reconciliation. This is a workflow-stage count, not a measured UI click count. Portal absence plus a REST error requires cross-surface investigation |
| Documentation quality | Public REST definition guidance is detailed enough to prepare source, but does not establish enablement for this tenant. Differing older and newer ontology/semantic-model/agent guidance needs a versioned compatibility matrix |
| Error messages / blocker | FeatureNotAvailable identifies availability but not which tenant setting, rollout, entitlement or regional prerequisite is missing. Underlying cause remains unconfirmed |
| Workaround / time spent | Preserve 27 local definition parts, source verification and the failed-attempt receipt; no Graph, tenant-setting change, region move or repeated create. The HTTP attempt lasted about 5.6 seconds; total research/troubleshooting effort was not separately timed |
| What worked well / confusing | Local guarded source checks passed: valid entity keys/relationships and 120 vehicles/54 attention. The availability check could not establish server syntax acceptance; local validity is not deployed success |
| Enterprise/customer impact | The SQL -> semantic model -> ontology -> agent journey can stop despite working source/model artifacts. Customers need early capability discovery, not a partially completed intelligence workflow |
| Severity / outcome | S1 blocker for the ontology feature in this environment, not for the existing app or new independently working semantic model. No claim that all tenants are blocked |
| Suggested product fix | Expose an item-type capability/preflight endpoint and a portal eligibility explanation with actionable prerequisite, rollout state and safe support reference |
| Suggested documentation fix | Publish generation/version, tenant/region availability and source/agent compatibility together; show an additive semantic-model-only fallback and distinguish local definition checks from server acceptance |
| Screenshot/evidence | [Ontology handoff](docs/PHASE2_ONTOLOGY.md), saved create error/request, empty inventories, source acceptance, and the scrubbed portal search capture. No persisted ontology screenshot can be supplied |

## FB-027 - Direct Lake model can reuse app SQL without app changes

| Field | Observation |
|---|---|
| Feature / availability | Fabric semantic-model create/read/update REST plus Direct Lake on existing SQL Database OneLake replica: VERIFIED AVAILABLE here |
| Scenario attempted | Build a new business-friendly analytical model over seven existing operational tables; retain the frozen application independently |
| Expected behavior | Preserve source lineage, curate metadata, add explicit metrics/one-way relationships, remove identity columns and validate source-derived results through actual DAX |
| Actual behavior | New Texas Fleet Operations item 00000000-0000-4000-8000-feffe397ad55 persisted with seven Direct Lake tables, 61 columns, 17 measures and five active/four inactive one-way relationships. Six complete DAX answer sets matched contemporaneous SQL at acceptance completed 21:25:39.742Z |
| Setup steps / discoverability | Four repeatable stages: create from exact OneLake table URLs, read the generated definition, curate/apply the new model only, then read back and compare DAX with SQL. Official APIs were sufficient; no app pack/deployment or new database required |
| Documentation quality | Create/get/update definition and executeQueries references cover the primitives, but the app-owned SQL -> curated Direct Lake model -> AI-readiness path is spread across pages and audiences |
| Errors / friction | Initial raw model had no business relationships or measures and included identity-subject columns. A caller-authored column/measure name collision correctly failed import and was fixed. Successful update LRO had no result body; unconditionally fetching /result returned OperationHasNoResult even though the update succeeded. This was corrected in the client helper, not treated as platform data loss |
| Workaround / time spent | Curated a separate new model; removed subject/actor fields, hid technical keys, prevented implicit sums, kept Scenario Clock disconnected, verified operation state and actual definition. No separately measured troubleshooting duration; do not infer labor from operation timestamps |
| What worked well / confusing | Actual Direct Lake reads and regional relationship propagation worked. Explicit measures corrected the grain/count ambiguity: 54 attention vehicles is not a capped 25-row list. Runtime zero-count measures can retain an empty unknown-region grouping row; source orphan checks plus an explicit blank-member filter made the output contract precise |
| Enterprise/customer impact | Same operational data can support application and analytical consumers without rebuilding either. Auto-generated tables still require privacy, semantic grain and clock curation before being suitable for AI |
| Severity / outcome | Positive adoption; S2 documentation/discoverability feedback. All six DAX/source checks passed; no new Data Agent or governance-policy configuration is claimed |
| Suggested product fix | Offer an optional curated-model wizard with detected FK suggestions, explicit privacy-field review, summarization defaults and a scenario/as-of concept; keep ambiguous relationship paths visibly inactive |
| Suggested documentation fix | Add a SQL Database OneLake -> semantic-model example with source lineage, field exclusions, one-direction role relationships, update LRO with no result, explicit measures and live SQL/DAX acceptance |
| Screenshot/evidence | [Model notes](docs/PHASE2_SEMANTIC_MODEL.md), saved server definition and six answer-set comparisons. Existing 25/19 alert seed baseline had changed to contemporaneous 26/20 in both SQL and DAX; Phase 2 did not change those source rows |

## FB-028 - Native modeling workload did not render in the integrated browser

| Field | Observation |
|---|---|
| Feature / availability | New semantic-model native modeling experience; workspace item listing verified, model canvas not verified in this integrated browser session |
| Scenario attempted | Open the actual new semantic model from the approved Fabric workspace for human inspection and a demo screenshot |
| Expected behavior | Native table/relationship canvas for the same model whose definition and DAX are independently verified |
| Actual behavior | Fabric redirected the actual model details URL to /modeling/.../modelView. The extension request to app.powerbi.com was blocked: Access-Control-Allow-Origin was https://teams.powerbi.com rather than requesting https://app.fabric.microsoft.com. Workload remained blank. Alternate app.powerbi.com navigation reached email/SSO but did not complete; the Fabric workspace list later displayed the new model's actual link |
| Setup steps / discoverability | Three navigation stages: Fabric details/modelView, alternate Power BI host/SSO, return to verified Fabric workspace listing. No tenant or browser-security configuration was changed |
| Documentation quality | No verified troubleshooting guidance found tying this host-origin mismatch to the integrated browser. A general Fabric or model outage cannot be inferred |
| Error / workaround | CORS mismatch observed at 21:08:10Z, plus extension-loading/SSO friction. Stop browser troubleshooting; retain source/DAX evidence and use another normal supported browser for a future canvas check |
| Time spent / what worked | Navigation wall time is not measured engineering effort. Independent API definition readback, executeQueries and the workspace list worked despite this UI issue |
| Enterprise/customer impact | Working analytical artifacts can be difficult to present or inspect when the workload host fails. Customers need a diagnosable workload error rather than a blank canvas |
| Severity / outcome | S2 recoverable presentation/validation blocker in this session. Environment-specific cause is unresolved; not a claim that the semantic-model service is down |
| Suggested product fix | Surface workload bootstrap/host-origin diagnostics with a safe correlation ID and supported-browser recovery, rather than silently blank content |
| Suggested documentation fix | Explain supported embedding/browser hosts, expected CORS origins, and how to separate workload UI loading failure from model availability/data correctness |
| Screenshot/evidence | Retain scrubbed CORS message and actual model/workspace URL; no native-model canvas screenshot is claimed. [Model notes](docs/PHASE2_SEMANTIC_MODEL.md) describe the verified fallback |

## FB-029 - Preview enablement allowed the unchanged fleet ontology to deploy

| Field | Observation |
|---|---|
| Feature / availability | Fabric Ontology generation 2: PREVIEW; create and getDefinition verified available in Trucks Rayfin on October 29 |
| Scenario | Retry the exact prepared fleet business context after the user enabled the tenant preview, without modifying the working operational app or its existing agent |
| Expected experience | A single additive item with the original source mappings, business relationships and rules; successful read-back, no duplicate or empty shell |
| Actual experience | POST accepted at 19:59:46.612Z as operation 00000000-0000-4000-8000-f9efb2f11a5c; Succeeded with item 00000000-0000-4000-8000-f4fa252bba1a recorded at 20:00:23.078Z. getDefinition verified all 27 parts at 20:01:00.834Z: seven entities, seven relationships, 55 property mappings and six rules |
| Setup steps / discoverability | Eight operational stages: target/inventory reconciliation, fresh source read, archive of rejected attempt, definition build, local validation, one create, read-back, focused tests. This is not a measured portal-click count. User found/enabled preview outside this implementation |
| Documentation quality | Generation-2 REST/TMDL guidance accurately supported this same definition and its read-back. The API's prior generic FeatureNotAvailable did not identify the tenant setting or provide an actionable prerequisite |
| Errors / blockers | No definition correction or rejected create on this retry. Native browser inspection reached Microsoft password sign-in and stopped; canvas and ontology data queries are not verified. Source-query success must not be substituted for ontology-consumer execution |
| Workarounds | No region change, permission expansion, Graph materialization, source casts/views, new database, app redeploy or agent edit. Prior definitive failure was archived and fresh empty inventory checked rather than deleting an uncertain operation marker |
| Time / troubleshooting | Acceptance-to-recorded-create interval about 36.5 seconds; getDefinition verification recorded at 20:01:00.834Z. These are operation observations, not measured engineering effort. Enablement propagation time and total troubleshooting effort were not measured |
| Worked well / confusing | Same definition hash ccb2b4e6fd20ae34de9b52d5d9ceae2cec922094d6694752ae88919e7baa03cf deployed without reauthoring after enablement. Source-native binding definitions and natural-language rules persisted. Creation, source reads, live bindings, native viewing and agent reasoning remain separate acceptance boundaries |
| Enterprise/customer impact | Business context can be added over existing app-owned SQL without destabilizing the app. Clear availability prerequisites and verification boundaries are essential for a discoverable SQL -> model/ontology -> AI journey |
| Severity / outcome | Positive preview adoption; prior deployment blocker resolved in this environment. S2 discoverability/documentation feedback remains. No ontology-backed AI readiness claim |
| Suggested product fix | Return an actionable preview-setting/eligibility hint with FeatureNotAvailable, expose capability preflight and show source-binding execution readiness separately from saved-definition success |
| Suggested documentation fix | Publish tenant enablement plus generation/source/consumer compatibility in one path; show safe retry after definitive rejection and distinct create, read-back, source, live-query and agent acceptance gates |
| Evidence to capture | [Ontology handoff](docs/PHASE2_ONTOLOGY.md), creation/operation receipt, getDefinition and four passing focused tests. Native canvas screenshot and actual ontology-backed answers still require authorized browser/consumer validation; no fabricated evidence |

## FB-030 - Ontology create also exposed associated graph infrastructure

| Field | Observation |
|---|---|
| Feature / scenario | New generation-2 ontology with existing SQL replica bindings; no separate graph, Eventhouse, ingestion, refresh or schedule request from the implementation |
| Expected / actual | Kept graph execution outside the explicit request. Final October 29 inventory showed associated GraphModel, Eventhouse and KQLDatabase items named with the exact ontology ID; all in Trucks Rayfin |
| Evidence / steps | Two follow-up stages: final inventory reconciliation, then read-only typed metadata GETs. GraphModel description identifies the ontology graph; Eventhouse lists the child KQLDatabase, which references that parent. Metadata inspected at 20:04:45.568Z |
| Documentation / discoverability | Public overview calls graph execution optional. That does not establish whether associated infrastructure is provisioned regardless of data materialization. A context-only author needs this lifecycle distinction before choosing the feature |
| Errors / workarounds / time | No failing create or query here. No resource deletion, reconfiguration, graph refresh or capacity move attempted. Follow-up effort not separately timed. Data load, default schedules and consumption remain unverified; minimumConsumptionUnits=0 is not a measured zero-cost result |
| Customer impact / severity | S2 transparency and capacity-planning feedback, not a proven billing defect. Explain whether saved ontology context automatically owns additional compute/storage artifacts and when they activate |
| Suggested product / docs improvement | Preview associated resources and lifecycle before creation; distinguish provisioning from materialization/refresh; document idle/autosuspend/minimum-consumption semantics, ownership, cleanup and supported no-graph modes |
| What worked / evidence to capture | All associated items stayed in the approved workspace; public metadata made parent/child links inspectable. [Ontology evidence](docs/PHASE2_ONTOLOGY.md) preserves inventory/metadata. Capture native ownership/lifecycle status when authorized; no graph data/zero-cost screenshot is claimed |

## FB-031 - Data Agent definition round-trip normalizes datasource folder names

| Field | Observation |
|---|---|
| Feature / availability | Fabric Data Agent definition API (getDefinition / updateDefinition), published agent: VERIFIED AVAILABLE |
| Scenario attempted | Remove a real-company name from the already-published agent's instructions and published description without disturbing its answers hours before judging |
| Expected behavior | Re-applying the authoring source (the script that originally configured the agent) updates the text in place |
| Actual behavior | getDefinition returned the datasource stage folder as `lakehouse-tables-tx_fleet_history`, while the authoring script writes `lakehouse-tx_fleet_history`. The instruction text itself was byte-identical to the authoring source in both draft and published stages. Re-applying the authoring source was therefore not proven idempotent and was deliberately not tried |
| Setup steps / discoverability | Four stages: capture a rollback copy, dry-run a surgical edit of the server-returned definition, apply it, re-read and re-ask golden questions. Operations 00000000-0000-4000-8000-f8bafa0b4521 (read), 00000000-0000-4000-8000-f87905ef0cb7 (update) |
| Documentation quality | The definition schema is documented; the server-side normalization of folder names is not, so authors cannot know whether their source round-trips |
| Errors / friction | None from the service. The risk was avoided, not observed: duplicate or replaced datasources if the unnormalized folder name were resubmitted. Not tested |
| Workaround required | Edit the exact server-returned definition (five of nine parts changed: two stage configs, two datasource files, publish info) and resubmit all nine parts |
| Time lost | Not separately timed; both LRO operations completed within seconds |
| What worked well | getDefinition plus updateDefinition made a safe, reviewable, in-place edit possible. After the update the remote definition contained no old name, and the Houston and SYN-027 golden questions returned the same correct answers (nine delayed; 38 minutes, two active alerts including one critical) |
| Enterprise/customer impact | Customers who keep agent configuration as code need update semantics they can trust, especially for a published agent that users already depend on |
| Severity / outcome | S3 documentation and ergonomics gap; positive adoption of the definition API |
| Suggested product improvement | Offer a supported partial update for instructions and descriptions, or return a normalized definition that re-applies unchanged so authoring sources are idempotent |
| Suggested documentation improvement | Document datasource folder naming and normalization rules, and show a round-trip safe text-only update example |
| Screenshot/evidence needed | [Surgical update tool](tools/phase2/rebrand-agent.mjs) dry-run output (parts changed and instruction identity check), [receipt](fabric/phase2/agent-rebrand-receipt.json), saved rollback copy kept outside the repository |

## FB-032 - Catalog lists every item but not how they relate

| Field | Observation |
|---|---|
| Feature / availability | OneLake catalog search: VERIFIED AVAILABLE; Govern or lineage-style integration for apps: not observed |
| Scenario attempted | Judge-style discovery: can someone find the Fabric App, its database, Function, Data Agent, semantic model and ontology from the catalog? |
| Expected behavior | Discoverable items that show how the app relates to the database, Function and agent it depends on |
| Actual behavior | All 12 workspace items were returned with id, type, display name, description and workspace. No relationship or lineage data was returned. Four items created by one Rayfin deployment (AppBackend, SQLDatabase, SQLEndpoint, UserDataFunction) share the display name `tx-fleet-command`. Their descriptions were empty until set manually. Search is fuzzy: one query also returned an unrelated item from another workspace |
| Setup steps / discoverability | One read-only call per query; no setup |
| Documentation quality | Installed Rayfin guide does not describe catalog or governance integration for apps |
| Errors / friction | None; the gap is missing metadata, not failure |
| Workaround required | Set descriptions on the app-created items through the generic items update API (status 200 each, names unchanged) |
| Time lost | About 10 minutes including the update |
| What worked well | Fast, complete, correctly typed results across the workspace; the new items' descriptions surfaced immediately, so rebranding metadata is visible in the catalog |
| Enterprise/customer impact | Governance teams cannot tell which database or agent belongs to which app without insider knowledge; identical names across four item types add ambiguity |
| Severity / outcome | S3 discoverability gap; positive for catalog coverage |
| Suggested product improvement | Populate descriptions from `rayfin.yml` at deploy time, name child items distinctly or link them to their parent app, and expose app-to-dependency lineage in catalog results |
| Suggested documentation improvement | Document whether and how Rayfin apps participate in catalog and governance experiences |
| Screenshot/evidence needed | [Experiment record E-CATALOG](docs/evidence/experiments-2026-10-30.json); [description update receipt](fabric/phase2/item-description-update.json) |

## FB-033 - Semantic-model connector: search and add were excellent, invoke returned a 401 that points the wrong way

| Field | Observation |
|---|---|
| Feature / availability | Rayfin data connectors, Category B `fabric-semanticmodel` (CLI 1.36.2): search and add VERIFIED; invoke BLOCKED in this environment |
| Scenario attempted | Attach the existing Texas Fleet Operations semantic model and query its verified measures through Rayfin in an isolated scratch project, so the live app config stayed untouched |
| Expected behavior | Search finds the model, add scaffolds a typed connector, invoke returns the fleet measures (the same values already verified through REST DAX) |
| Actual behavior | Search found three connectable sources in 4.6 seconds (semantic model, Lakehouse as `fabric-sqlanalytics`, SQL database) with ready-to-run add commands. Add completed in 4.5 seconds. Invoke failed three times with HTTP 401 (request IDs 00000000-0000-4000-8000-faa431cacf7d, 00000000-0000-4000-8000-f9194d467f5e, 00000000-0000-4000-8000-f13c0532976b) |
| Setup steps / discoverability | Three commands, no deployment needed, which the docs state accurately. Add reported no `src/lib/connectors.ts` and wired nothing (expected for a scratch project) and wrote agent skill files as a side effect |
| Documentation quality | The invoke page clearly explains the direct-identity transport, the Power BI consent requirement and the `RAYFIN_TOKEN` pass-through, which made diagnosis fast |
| Errors / friction | The token's audience was correct but its only scope was `user_impersonation`; the same token succeeds against the REST executeQueries API. The CLI recovery hint said to sign in again and confirm Viewer access, but the caller is a workspace Admin. The documented fix is interactive Power BI consent through `rayfin login`, which is blocked here by the unreadable-cache and keychain failure in FB-010; plaintext token storage was deliberately not enabled. Missing consented scope is the likely cause but unproven |
| Workaround required | None found within the time box. Query the same model through the REST API instead (already verified) |
| Time lost | About 15 minutes including three failed invocations and one diagnostic |
| What worked well | Source discovery across types with `addCommand` output, the connector error envelope with request IDs, and the audience pre-check were all clear and fast |
| Enterprise/customer impact | A builder with full workspace rights and a valid token is told to check permissions, so the real prerequisite (a consented scope) is hidden. CI and keychain-restricted machines have no obvious non-interactive route |
| Severity / outcome | S1 for connector invoke in this environment (feature blocked), not an app blocker; discovery and scaffolding are a positive result |
| Suggested product improvement | When a 401 follows a successful audience check, report the missing or granted scopes and the exact consent path; offer a documented non-interactive way to obtain the required Power BI scope |
| Suggested documentation improvement | Add the scope required by the semantic-model connector and a troubleshooting row for 401 with `RAYFIN_TOKEN` and for hosts where `rayfin login` cannot store tokens |
| Screenshot/evidence needed | [Experiment record E-CONNECTOR](docs/evidence/experiments-2026-10-30.json) with timings, request IDs and the scope diagnostic; no token values are recorded |

## FB-034 - Data Agent over the semantic model: right when told which measures to use, inconsistent when not

| Field | Observation |
|---|---|
| Feature / availability | Data Agent with a `semantic_model` data source, created and read back through the Fabric items definition API: create, read-back and question answering VERIFIED. Answer accuracy was mixed, see below |
| Scenario attempted | Experiment E-AGENT-SEMANTIC (pre-registered). Hypothesis: a second, additive agent grounded on the governed measures of the Texas Fleet Operations semantic model, with short generic instructions and no hand-tuned examples, answers the same eight business questions at least as well as the existing Lakehouse agent and returns "needs attention" as one uncapped total. The existing agent was never written to |
| Expected behavior | 54 of 120 vehicles need attention (45%); Houston 17 of 28 (60.7%); five critical vehicles; the five overlapping attention reasons plus the distinct total of 54; 60 events in the last scenario hour. Ground truth was measured with fresh DAX immediately before asking |
| Actual behavior | **Run A (minimal instructions), manual grading: 5 of 8.** Q3, Q4, Q5, Q6 and Q8 were correct. Q1 answered "41 trucks, 40.2% of the active fleet" although the model has the measure Vehicles Needing Attention (truth 54 and 45%). Q2 named the right region but gave 14 issues and 43.75% (truth 17 of 28 and 60.7%). Q7 answered with fleet-event types instead of attention reasons. The same agent reported 54 needing attention while answering Q8, so it contradicted itself. **Run A2 (identical instructions, Q1, Q2 and Q7 repeated):** Q1 gave the same wrong 41 and 40.2%; Q2 was wrong again with different numbers (11 and 40.7%); Q7 this time listed the correct reason counts (24, 21, 18, 16, 10) but no distinct total. **Run B (instructions extended after Run A):** Q1 54 and 45.0%; Q2 all eight regions exact; Q3 the exact five vehicles; Q4 matched the expected dimensions; Q5 the exact ten; Q6 matched 38 minutes and two active alerts (one critical); Q7 five reasons plus distinct 54. Q8 gave per-type detail consistent with 60 events but omitted the total: **7 full and 1 partial of 8**. The saved ground truth and answers retain all counts. The existing agent scored **7 of 8**; Q1 incorrectly said "0 trucks" despite 120 `service_truck` vehicles, while Q5 correctly listed ten stale-reporting "trucks". This suggests terminology sensitivity, but the unseen query/filter cannot establish the exact cause. The app's rehearsed questions use "vehicles"; that does not make arbitrary paraphrases reliable |
| Setup steps / discoverability | Built a definition with 7 tables, 42 visible columns and 17 measures and created the agent in one request; the first attempt succeeded and read-back confirmed both the draft and the published stage. The installed documentation shows only a warehouse data-source example, so the `semantic_model` element shape was inferred; it worked. The service normalized the data-source folder from `semantic_model-TexasFleetOperations` to `semantic-model-Texas Fleet Operations`, the same silent renaming recorded in FB-031 |
| Documentation quality | No semantic-model example in the Data Agent definition documentation. Nothing explains whether the model's measure descriptions or synonyms influence the agent, or when to restate them in agent instructions |
| Errors / friction | No transport errors. Three of eight Run A answers failed the governed-answer checks despite defined measures. The exact measure/query was not exposed, so selection failure is an interpretation, not a directly observed trace. Latency was 17 to 82 seconds per question (Run B 17 to 57 seconds; existing agent 15 to 53 seconds) |
| Workaround required | Restating the business definitions in the agent instructions (Run B). That fixed Q1, Q2 and Q7 but duplicates what the model already defines |
| Time lost | About one hour, including build, ground truth, the two comparison runs, repeat and manual grading; within the 60-minute time box |
| What worked well | Create plus read-back on the first attempt; an additive agent over the model with the live app untouched; correct entity lists (Q3, Q5, Q6) in every run; granular extras that checked out against SQL (1,320 telemetry readings in the last hour, 0 to 65 mph, about 28 mph average); the synthetic framing was kept; Run B correctly separated overlapping reasons from the distinct total |
| Enterprise/customer impact | A semantic model is meant to be the single place a business defines "needs attention". If the agent needs that definition restated in its instructions, it lives in four places that can drift (model descriptions, ontology rules, agent instructions and app code). Two different answers from the same configuration, and 41 versus 54 within one agent, make a confidently stated wrong number hard to detect without ground truth |
| Severity / outcome | S2 recoverable friction. The hypothesis was **refuted for the minimal-instruction configuration**: answers did not reliably match defined measures, and the semantic-model agent did not beat the existing agent. Exact query/measure selection remains unobserved |
| Suggested product improvement | (1) Show with each answer the measure or query used. (2) Let measure descriptions and synonyms from the model, including the model-level AI preparation settings, be the single source for the agent, with a visible indicator of what the agent actually read. (3) Offer a "prefer defined measures over re-derived counts" mode. (4) Provide a portal evaluation harness that runs a golden-question set, compares with DAX and reports repeat-run variance. (5) Support a partial update for instructions (also FB-031) |
| Suggested documentation improvement | Add a semantic-model data-source example to the Data Agent definition documentation, state how the folder name is normalized, and say what a model's metadata does and does not influence compared with agent instructions |
| Limits of this result | One tenant and one day. One sample per question per run except three repeated questions. Run B was tuned after seeing failures and uses test-question wording: its 7 full/1 partial result is not a held-out evaluation or proof of superiority/generalization. Neither the generated query nor exact measure selection was observed. The programmatic keyword rubric scored lower than manual grading (new agent 4/8, existing 3/8, Run A2 0/3, Run B 6/8); manual grading is the stated basis and both are saved. Model-level AI preparation settings (AI instructions, synonyms, verified answers) were **not** tested |
| Screenshot/evidence needed | [Experiment tool](tools/phase2/semantic-agent.mjs) and [configuration](config/phase2-semantic-agent.json); [DAX ground truth](fabric/phase2/semantic-agent/ground-truth.json); answers [new Run A](fabric/phase2/semantic-agent/answers-new-run-a.json), [existing Run A](fabric/phase2/semantic-agent/answers-existing-run-a.json), [repeat A2](fabric/phase2/semantic-agent/answers-new-run-a2.json) and [Run B](fabric/phase2/semantic-agent/answers-new-run-b.json); [create receipt](fabric/phase2/semantic-agent/receipt.json); read-back [at creation](fabric/phase2/semantic-agent/verification.json) and [after the Run B update](fabric/phase2/semantic-agent/verification-run-b.json); [experiment record](docs/evidence/experiments-2026-10-30.json) |

## FB-035 - Ontology context is discoverable, but adding it fails with an unactionable access hint

| Field | Observation |
|---|---|
| Feature / availability | Fabric Data Agent ontology-as-context preview: menu and picker VERIFIED AVAILABLE; attachment BLOCKED in this environment. This is a Fabric capability experiment, not a new Rayfin connector implementation |
| Scenario attempted | E-AGENT-ONTOLOGY, time-boxed to 30 minutes. Add the existing Fleet_Operations ontology to the experimental semantic agent, leaving the working app and its agent untouched. Test whether Vehicle-Alert-Region and assignment/reviewer relationships can be used without copying ontology rules into agent instructions |
| Expected behavior | Add sources -> Ontology -> Fleet_Operations -> Add mounts read-only context and exposes the associated underlying sources. Two prepared relationship questions then agree with fresh SQL: five active-critical vehicle/reviewer rows, and SYN-027's current assignment plus its two active alerts |
| Actual behavior | The ontology canvas rendered entities and relationships, the source menu contained Ontology, and the picker listed Fleet_Operations. **Attachment failed twice:** first on Standard, then on the documentation-recommended Preview runtime. Both produced **"Couldn't add ontology" / "Check that you can access this ontology, then try again."** Both notifications are captured together. Definition read-back contained only the original semantic-model source; no ontology context was verified. **Zero ontology-backed questions were asked; the hypothesis is not evaluated, not refuted, and there is no accuracy score** |
| Setup steps / discoverability | Open the experimental agent -> Add sources -> Ontology -> select the existing ontology -> Add. Repeat once after switching its draft to Preview. The working agent was never edited; no new artifact, graph refresh, materialization, source, permission or capacity change was requested |
| Documentation quality | The current [ontology-context guide](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-ontology-sources) matches the portal and clearly distinguishes semantic context from execution against underlying SQL/KQL/DAX sources. It recommends Preview and documents context download, manual refresh and run steps. Those diagnostic steps cannot be reached when initial attachment fails. The public Data Agent definition schema lists `graph`, not an ontology context type; no documented REST context-add example was found in the references inspected |
| Errors / friction | The access hint names no failed prerequisite, source binding, permission, error code or correlation ID. The caller could open the ontology and query the operational source, but that does not prove context-export permissions and source eligibility. Browser console resource failures included 404 and 502; no correlated failing endpoint, response body or request ID was captured, so **the root cause is unknown** |
| Troubleshooting / workaround | Retried once with Preview, checked both persistent notifications, and read the agent definition back. Did not invent a REST payload or substitute the associated GraphModel: graph queries would exercise a different feature. Stopped the remote experiment rather than changing the ontology bindings or enabling graph ingestion before judging. No working workaround established |
| Time lost | Approximately 20 minutes of investigation and attempts, followed by recording and validation within the 30-minute experiment budget |
| What worked well | The native ontology canvas now opens; the dedicated Ontology menu and picker are easy to find; persistent notifications retained both failures after the transient toast disappeared; the runtime selector distinguishes Standard from Preview and confirms the switch back |
| What was confusing / missing | An accessible, selectable ontology still fails with an access-only hint. There is no attachment preflight or diagnostic detail showing whether context export, the binding/source type, authorization or a service dependency failed |
| Enterprise/customer impact | A builder cannot tell whether to contact a tenant administrator, repair a source binding or wait for a transient service issue. This blocks reuse of a governed business vocabulary and encourages duplicating definitions in agent instructions |
| Severity / outcome | **S1 for this preview integration in this environment; not a working-demo blocker.** Attachment tested and blocked; ontology-backed answer quality and improvement over the semantic baseline remain unverified |
| Suggested product improvement | Validate ontology access, context export and underlying binding/source eligibility before Add; report the exact failing stage and safe error/correlation ID. Distinguish an authorization failure from service or unsupported-source failures. Provide an expandable diagnostic report and a supported context-attachment API |
| Suggested documentation improvement | Add a "Couldn't add ontology" troubleshooting table with prerequisite checks and a supported diagnostic/API example. State source-binding eligibility explicitly, including SQLDatabase replica bindings, and separate context attachment requirements from optional graph materialization |
| Isolation / cleanup | Standard restored on the experimental draft; its published parts are unchanged. The draft retains an empty `experimental: {}` object where the property was previously absent; the Preview flag is not enabled. The working agent's definition and **65 frozen app/config files** are unchanged. Nothing was deployed |
| Screenshot/evidence | [Both failure notifications](fabric/phase2/ontology-agent/portal-add-errors.png), [observations](fabric/phase2/ontology-agent/observations.json), [pre-registered questions and baseline](fabric/phase2/ontology-agent/baseline.json), [fresh relationship ground truth](fabric/phase2/ontology-agent/ground-truth.json), [agent read-back](fabric/phase2/ontology-agent/experimental-inspection.json), [isolation verification](fabric/phase2/ontology-agent/isolation-verification.json), [bounded helper](tools/phase2/ontology-agent.mjs) |

## FB-036 - Local templates rename the project, but copy operational state and do not parameterize the business

| Field | Observation |
|---|---|
| Feature / availability | Rayfin 1.36.2 local-directory templates: **VERIFIED for scaffolding only**. Custom organization/geography parameter prompts were not available in the tested CLI path. A deployable, share-ready fleet template was **not** produced |
| Scenario attempted | E-TEMPLATE, 20-minute local-only experiment. Scaffold the current project under a new name, then scaffold a controlled synthetic fixture to distinguish project-name substitution from business parameterization and test copy exclusions |
| Hypothesis / expected behavior | Local `init --template` creates a renamed copy; the documented three root README placeholders and `__projectName__` filename token work. Other source contents and custom business tokens remain unchanged. Inspect the resulting copy before treating it as reusable |
| Actual behavior | Both scenarios succeeded, including child synchronization. The root package became `reusable-field-operations`; Rayfin id/name changed. All dependency declarations, protected assets and Fabric-enabled/password-disabled authentication were preserved. The real README, App and Function source stayed byte-identical: renaming does not change Zava/Texas branding or the Function's existing agent target. The original hosted redirect remained. The fixture replaced all three supported README tokens and the project-name filename; custom organization/map tokens, a custom filename token, a nested README token and ordinary TypeScript contents remained unchanged |
| Copy-filter result | The real copy retained deployment metadata, `rayfin/.env`, Function local settings, approved-target configuration, generated data, build output, internal planning and evidence. A harmless synthetic fixture confirmed that `.gitignore` is **not** a copy filter: its ignored text file, synthetic environment file and build output were copied. `.git`, `node_modules` and the template manifest were skipped. **Nothing was published or sent to another party** |
| Setup / discoverability | Used the installed CLI's absolute entry point, explicit local source/output paths, `--project-name`, `--yes` and `--skip-install`, with telemetry opted out. Each output was outside the source tree. No workspace/item flags, overwrite, installs or remote operation. The no-install option is accepted by the installed implementation but hidden from `init --help` |
| Documentation experience | The installed templates guide accurately describes minimal substitutions and the fixed exclusion list. It does not explicitly warn that Git-ignored environment/deployment files are copied or provide a safe export recipe for an already-deployed application |
| Error messages / troubleshooting | No CLI errors; parent exit codes were zero **and** both runs reported successful child synchronization. Compared actual files, authentication settings and dependency declarations rather than inferring success from exit status. Repeated the pair after strengthening dependency and environment-file isolation checks; the evidence records the final pair |
| Workaround / limitation | A future distributable needs an explicitly reviewed staging allowlist, placeholder target configuration and deliberate agent/redirect rebinding; do not use the working directory directly. No such packaging or application refactor was attempted today |
| Time lost | No failed-run time. Final scaffold calls took **4.179 s** and **2.836 s**; preflight, checks and documentation stayed within the 20-minute box |
| What worked especially well | Fast local scaffolding, preserved dependency pins and authentication defaults, useful agent-file installation, and predictable project-name substitutions |
| Positive surprise / confusing behavior | The CLI synchronized agent files without downloading dependencies. Conversely, an apparently fresh project still contained the original operational targets and local files; a new name is not a new environment |
| Missing capability / enterprise impact | No business-parameter schema or safe export preview was found in the inspected guide/CLI path. Sharing a raw deployed tree could disclose configuration or direct another builder at existing resources. This was an isolated local finding, not an observed external disclosure |
| Severity / outcome | **S2 reuse friction with disclosure/rebinding risk if shared; not a working-demo blocker.** Project-identity hypothesis confirmed in this path. Arbitrary business parameterization, supported-runtime portability and a second working deployment are not claimed |
| Suggested product improvement | Add a dry-run copy manifest and explicit include/exclude controls; warn when templates contain environment files, deployment state, hosted redirects or target identifiers. Offer typed template parameters with required values, validation and a preview of substitutions |
| Suggested documentation improvement | State plainly that `.gitignore` is not honored; show a safe deployed-app-to-template staging recipe and a documented no-install automation flow. Separate project naming from organization, geography and resource-target parameterization |
| Runtime caveat | PATH used Node **26.13.0**, outside the CLI's declared Node 20/22/24 ranges. Both scaffolds succeeded; this does not certify supported-runtime portability. No failure is attributed to the product on that basis |
| Isolation / cleanup | **88 frozen application/configuration/manifest files unchanged**, including environment files; both temporary outputs and their synthetic fixture were removed. No live application, deployment, permissions, capacity or remote artifact changed |
| Evidence | [Sanitized measured results](docs/evidence/template-experiment.json), [repeatable bounded helper](tools/template-experiment.mjs), [experiment ledger](docs/evidence/experiments-2026-10-30.json), [safe future packaging recipe](REUSABLE-PATTERNS.md#safe-future-template-packaging-not-executed) |

## FB-037 - SQL connector preflight works without deployment; token recovery succeeds, but add is not clean JSON

| Field | Observation |
|---|---|
| Feature / availability | Rayfin 1.36.2 `fabric-sqldatabase` connector CLI: **source discovery, read-only declaration, schema discovery and source inspection VERIFIED**. Deployed app-identity access, generated entity policies and browser integration were not tested |
| Scenario attempted | E-CONNECTOR-SQL: attach the existing operational Fabric SQL database from an isolated scratch project, restrict operations to `read`, discover schema and inspect one synthetic Region row without touching the working app. This is not the separate history SQL analytics endpoint experiment |
| Hypothesis / expected behavior | Search finds the approved database; add writes read-only application-auth configuration plus metadata; one CLI inspection returns one real Region row without deployment |
| Actual behavior | Search found one exact approved match in **3.135 s**. Initial add took **3.280 s**, wrote the read-only declaration and placeholder, but reported nested schema-discovery failure despite exit `0` and top-level `status: success`. With a Power BI-audience token, **inspection succeeded in 3.937 s**: one `dbo.Regions` row, eight metadata-derived column types, `truncated: true`, `isSynthetic: true`, code ELP and Synthetic Hub ELP. A fresh scratch add using the printed recovery hint completed discovery in **5.397 s**: **12 tables across dbo and storage**. No second connector sample was run |
| Setup / discoverability | Read the installed guide and live catalog, verified approved identity/active capacity and source IDs, used an explicit alias and `--operations read`, and kept all generated files outside the working tree. CLI inspection needed neither the frontend pack nor a connector SDK install. Generated configuration defaulted to application auth, but these CLI operations ran under the developer's supplied token, not the deployed app |
| Documentation experience | The installed connector index and inspect guide correctly describe pre-deployment read-only inspection. The project connector skill instead says non-semantic preflight requires deployment; that mixes the cloud-only application runtime with the direct CLI source probe. Package-owned entity-generation docs were not installed, so entity generation was deliberately outside scope |
| Errors / friction | A Fabric-audience `RAYFIN_TOKEN` worked for source lookup but failed discovery's Power BI audience check. The error accurately named both audiences and explained that ambient tokens pass through unchanged. Separately, both add commands with `--json` emitted a project-root message and two ambient-token debug lines before the JSON object. Search and inspect emitted clean JSON |
| Troubleshooting / workaround | Followed the printed hint: supplied a Power BI-audience token to inspect, then to a new scratch add. Both worked. No CLI patch, token-cache reconfiguration, plaintext credential store, scope override or permission grant was used. The helper explicitly recorded the non-JSON prefix before parsing the following object; it did not treat the stream as clean JSON |
| Time lost | One initial helper correction: the CLI normalized requested alias `fleetSql` to `fleetsql`; the helper now consumes the returned name. That stopped before any sample query and was a harness assumption, not a platform failure. The action stayed within a 20-minute budget; measured command times are above |
| What worked especially well | Precise audience diagnostics with a working recovery; read-only scope preserved; fast source inspection without deployment; typed decimal/boolean metadata and an explicit truncation flag; version-pinned install guidance; useful nested discovery status |
| Positive surprise | The Power BI-audience ambient token completed this SQL inspection and schema-discovery path in this environment. No new resource, deployment or application build was needed |
| Confusing / missing | Top-level successful add does not mean schema readiness, and `--json` output cannot be passed directly to a JSON parser. The skill/guide mismatch could push a builder toward an unnecessary deployment. Metadata includes platform-managed Users/storage tables as well as business tables; do not generate or expose every discovered table blindly |
| Enterprise/customer impact | Builders can validate an existing operational source quickly and with narrow scope. Automation, however, must handle both partial readiness and a mixed stdout stream, and token prerequisites are easy to miss until after files are written |
| Severity / outcome | **S2 recoverable tooling/automation friction; successful developer-identity preflight, not a demo blocker.** The source-inspection hypothesis is confirmed in this environment. No deployed application-identity or frontend connector claim |
| Suggested product improvement | Keep `--json` stdout to exactly one JSON value; send project-root/debug diagnostics to stderr. Offer a strict discovery/readiness flag or explicit partial-readiness field, while retaining the useful nested failure reason. Preflight the required token audience before writing schema-dependent artifacts |
| Suggested documentation improvement | Add a headless SQL example stating the token audience used by this CLI path, the application-auth default versus developer-identity inspection distinction, and how to branch on `schemaDiscovery.status`. Align project skill guidance with the versioned inspect guide: source probes can precede deployment; deployed app validation is still required afterward |
| Runtime caveat | PATH used Node **26.13.0**, outside the CLI's declared Node 20/22/24 ranges. Successful results do not certify supported-runtime portability; observations should be reproduced there before filing runtime-specific defects |
| Isolation / cleanup | **88 frozen app/configuration/manifest files unchanged**. Initial, source-probe and recovery scratch directories were removed. No deployment, source-data mutation, package install, permission grant or capacity change. Tokens were passed only in child-process environments and never persisted |
| Evidence | [Sanitized command results and sample](docs/evidence/connector-sql-experiment.json), [bounded helper](tools/connector-sql-experiment.mjs), [structured experiment ledger](docs/evidence/experiments-2026-10-30.json) |

## Next intentional experiments

1. **Complete standalone:** Protected-site gate -> normal Fabric sign-in ->
   paginated read of all 120 vehicles -> reload -> data-error/retry recovery.
   A prior bundle subsequently rendered through the actual Fabric host in the
   owner session; hardened-release embedding and stale/different-user replacement
   remain explicit follow-ups, not inferred successes.
2. **Complete for the approved shared-inbox scope:** Authenticated create ->
   reload -> acknowledge -> reload -> resolve -> reload; linked-event failure
   and durable repair; creator/immutable-field denial checks. Real second-user
   recipients, assignee authorization and actual delivery remain separate follow-ups.
3. **Complete for the sampled paths:** Published Data Agent through existing
   SQL-replica shortcuts and deployed Function; golden-answer SQL review and
   initial attention-error mitigation recorded in FB-016 through FB-020.
   Hardening follow-up found another semantic failure despite transport success
   (FB-025); a correct unchanged retest is not an accuracy guarantee.
   Further paraphrase, identity and changed-data tests remain separate work.
4. **P1:** Connect the history SQL endpoint through the deployed app, not only
   direct SQL; compare rows and auth behavior.
5. **Complete for owner-session native observability:** Actual app Metrics and
   persisted Function log retrieval verified; semantics/discovery feedback in
   FB-023 and FB-024. Consumer permissions remain unverified; do not infer
   multi-user/RBAC outcomes from owner access.
6. **P1:** Functions plus secret integration only after the core vertical slice
   is stable; record useful success evidence as well as errors.

Use the full feedback template in the internal project plan for future entries.
Do not invent blocked-feature counts to match the original planning target.
