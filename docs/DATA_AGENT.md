# Synthetic fleet Data Agent

## Source and trust boundary

The operational Fabric SQL database remains authoritative. Its existing OneLake
replica is exposed through six shortcuts in the **existing** `tx_fleet_history`
Lakehouse: Regions, Vehicles, Assignments, Alerts, FleetEvents and SimClocks.
There is no second seed, ETL pipeline or manually synchronized operational copy.
The Lakehouse SQL analytics endpoint is read-only; replication/catalog lag is
possible. The map reads operational SQL directly, so the two surfaces need not
be instantaneously consistent.

All resources are in Trucks Rayfin on demodinoeast2 / East US 2. Exact approved
IDs are in [target configuration](../config/fabric-target.json). The agent is
`tx-fleet-operations-agent`; no second AppBackend or workspace is required.

The current public Data Agent source schema does not list SQLDatabase directly.
Lakehouse tables are supported. Six shortcut tables were verified by SQL with
8, 120, 150, 38, 320 and 1 rows respectively, and all seven configured example
queries executed successfully. The seven questions and reviewed SQL examples
are in [fleet-agent.json](../config/fleet-agent.json).

The source selection excludes the platform Users table, crew/team identity
tables and operator notes. Instructions and column selection are **not an
authorization or column-security boundary**. External resource access uses the
Fabric app owner's identity, not each invoking user's SQL permissions. This
prototype does not claim per-user agent RLS. Reassess permissions before
multi-user or production reuse.

## Configuration and publication

```powershell
# Preview: no writes
npm run agent:configure
# Reuse exact matching shortcuts, refresh metadata without table recreation,
# verify SQL examples, then update the existing agent definition
npm run agent:configure -- --apply --publish
```

The script checks the approved identity, workspace, capacity and existing agent.
It aborts if an existing shortcut points somewhere else. Shortcut inventory paths
may include a leading slash even when creation did not; comparison normalizes it.
Partial success is preserved on failure. Do not delete/reseed tables to address
catalog synchronization.

The definition uses documented draft and published stage/source/fewshot parts,
plus publish information. An accepted update is not sufficient proof of agent
readiness: the published MCP endpoint must actually initialize, discover its tool
and return source-backed answers. These calls succeeded for the affected-vehicle
and regional-delay questions using the approved author identity. The deployed
app's actual Function subsequently succeeded too; runtime app-owner access is
verified, not inferred from author access or a deployment receipt.

The configuration command owns this agent's complete source definition. Review
and merge portal edits before running it again; do not treat it as a partial patch.
It deliberately requires explicit `--apply --publish`.

## App integration

The server-side `askFabricDataAgent` Function declares `AudienceType.Fabric`
and obtains `ctx.Tokens.Fabric`. No API key, app registration secret or browser
Fabric bearer-token bridge is used. Functions application authentication is
explicit in the Rayfin configuration.

The transport initializes MCP, acknowledges initialization, discovers the
advertised tool and argument, then awaits one tool call. It supports JSON and
SSE, plain-text acknowledgements, optional sessions, and protocol versions
2025-03-26 and 2025-06-18. The live server advertised 2025-06-18. Its tasks
capability was observed but is not used; no unsupported background-job/polling
behavior is implied.

Limits:

- Question: 2,000 characters, validated server-side.
- Outbound exchange: 230 seconds total.
- Browser Function invocation: 245 seconds, **per call**, below the installed
  SDK's documented 250-second Fabric host ceiling.
- Response: 256,000 bytes; answer: 20,000 characters with explicit clipping.
- One active request per panel; no automatic retry loops.
- No local/browser chat-history storage. Normal Fabric service processing and
  retention still apply.

The app renders returned content as escaped text, not HTML or rich Markdown.
Markdown pipes, headings and emphasis remain literal text. The input is a native,
labeled textarea because the installed Radix Primitive has no textarea export;
buttons continue to use the existing Radix-based control.

Only safe outcome code, elapsed time and random request reference are written by
application logging. Prompts, answers, tokens, authorization headers and raw
provider failures are not logged. An agent error never produces a canned answer.

Source instructions enforce scenario time from SimClocks.asOf, not wall-clock
time; active alerts are open **or acknowledged**; stale is strictly over 15
minutes; delayed excludes at-risk; current assignments require isCurrent = 1.
These are analytical instructions, not a guarantee of generated-answer accuracy.

## Validation and deployment

```powershell
npm run agent:test
# Real author-identity MCP smoke checks. Numeric evidence is not semantic proof.
npm run agent:verify -- 0
npm run agent:verify -- 1
# Normal static gates, serially
npm run typecheck
npm run build
npm run lint
npm run --workspace=@rayfin-app/frontend test -- --pool=threads --maxWorkers=1
npm run validate:functions
# Explicit Functions inclusion; existing app, auth and target guards retained
npm run app:deploy -- -IncludeFunctions
npm run app:deploy -- -IncludeFunctions -Apply
```

Author CLI access does not prove runtime app-owner access. Validate real hosted
Function invocation separately, inspect complete answers against fresh SQL, and
check map/auth regressions. No operational CRUD was added by this milestone.
Do not create/delete fleet records merely to validate a read-only feature.
The published endpoint IDs are server-side constants; when adapting the
reference to another approved environment, update both target configuration and
the Function endpoint deliberately.

Golden ground truth for the original scenario: 19 affected vehicles / 25 active
alerts, Houston nine of 16 delayed vehicles, ten stale reports, 60 last-hour
events. A correct answer to a vehicle-count question need not also state the
separate alert count. No expected values are hardcoded into agent answers.

### Hosted evidence

The existing protected app and its associated UserDataFunction were deployed
successfully in Trucks Rayfin / East US 2. No second AppBackend or alternate
workspace was created. Static checks passed before deployment: 83 frontend tests
across 11 files, 18 transport tests, typecheck, build, lint and Functions
validation. All 115 data/schema tests passed, and post-deployment SQL rereads
confirmed all 3,583 operational rows, 13 trusted/enabled foreign keys and
3,840 history rows remained intact. No create/update/delete test is appropriate
for this read-only milestone.

The subsequent [alert milestone](ALERTS.md) independently verified mutations in
the shared inbox; the assistant itself remains read-only. After the alert release,
a fresh hosted regional-summary invocation still worked through the unchanged
Function, and its eight vehicle totals and eight delayed counts matched SQL.
Refreshing the inbox preserved that answer and the selected map vehicle.

| Hosted question | Reviewed source comparison |
|---|---|
| Active operational alerts | 19 distinct affected vehicles; active means open or acknowledged |
| Most delayed region | HOU 9, DFW 3, SAT 2, AUS 1, CRP 1; total 16 |
| More than 15 minutes without reporting | Correct ten vehicle codes and last-report timestamps against the scenario clock |
| Regional status | All 37 nonzero region/status groups and eight totals match SQL; AMA 10, AUS 14, CRP 10, DFW 26, ELP 8, HOU 28, LBB 10, SAT 14 |
| Last scenario hour | HOU 40 + DFW 20 events, correctly broken into four event types per region; components sum to 60 even when the answer does not state that total |
| SYN-027 | 38-minute delay, two active alerts including one critical, current fictional assignment/schedule, healthy and not stale |
| Needs attention | Initial synthesis failed; after refinement, exact-question and priority-paraphrase retests returned the correct 25-row order; all 225 cells in the paraphrase's nine-column table exactly matched a fresh SQL read |

A browser-only interception returned HTTP 503 for the Function invocation.
The old answer disappeared, an explicit failure and Retry appeared, and no
substitute answer was shown. Interception was removed in `finally`. Keyboard
Retry reached the real backend and returned the correct regional-status answer
in 14.4 seconds; completion focus moved to the result. The map retained its
source-backed 120/16/25/10 metrics during this independent agent failure.

A final clean hosted reload restored the authenticated fleet, reset Q&A to an
honest empty state, and completed a fresh SYN-027 invocation. The answer again
identified its 38-minute delay, two active alerts including one critical, healthy
status and non-stale telemetry. There were **zero page errors, app console
errors, total console errors or failed app-origin requests** during that clean
reload/invocation window; intentional outage-test errors were excluded.
Post-Q&A keyboard selection still opened SYN-027's actual current assignment.
Light/dark switching applied, and measured narrow/wide layouts had no horizontal
page overflow.

The original before-refinement accuracy screenshot is retained in session
evidence. Later integrated-browser captures were clipped/tiled after viewport
changes and are not submission-ready evidence; recapture final desktop/mobile
Q&A in normal Edge before packaging. Do not present those capture artifacts as
a confirmed application defect.

### Accuracy guardrails and remaining limits

The first broad attention answer contradicted itself: it listed 19 alert-affected
vehicles but summarized 22, omitted delayed SYN-035, and did not preserve the
example's critical-first order. Request reference:
`00000000-0000-4000-8000-f18aa0fca07f`; elapsed 25.4 seconds. The source query was
correct. This was an observed generated-answer failure, not a transport outage.

The configuration now appends explicit `answerRules` to both stage and source
instructions: use the grouped-alert example query, preserve its ordered/capped
rows, show only their actual issue fields, and do not infer fleet-wide counts
from a capped list or prose bullets. The exact question then returned the
correct 25 rows in 18.6 seconds (request
`00000000-0000-4000-8000-fe11e0e078a9`). No expected fleet counts, vehicle lists or
canned answers were inserted into instructions. A second question, "Show the
highest-priority vehicles needing attention.", completed in 20.2 seconds
(request `00000000-0000-4000-8000-f346606ac823`). Its rendered table was extracted
from the browser and compared programmatically with fresh SQL: all 25 rows,
225 cells and row order matched exactly. At a 390-pixel viewport, the page
reported no horizontal overflow and completion focused the result.

Instructions and a few successful samples do not establish reliability for all
paraphrases, future data, prompt injection, or concurrent users. Keep generated
analysis advisory and cross-check important findings on the map/source.
Per-user agent RLS and stale/different-user identity replacement are not
live-verified claims. A prior app bundle rendered through the actual Fabric
host in the owner session; hardened-release embedding remains unverified.
The agent's alert access remains read-only,
positions are not realtime, and the history connector is not wired into the app.

### Hardening-release accuracy and recovery follow-up

The unchanged published agent and Function were exercised through the hardened
hosted application on October 28. The regional-delay question returned HOU/nine
at 15:47Z. A controlled browser-only HTTP 503 then removed the previous answer
and exposed an explicit error/Retry without disabling the map. After removing
interception, keyboard Retry reached the real service and returned HOU/nine
again at 16:40:11.976Z (request
`00000000-0000-4000-8000-f8ae4eb02df8`; browser 11,569ms, server 11.1s).

**A new semantic failure was also observed.** The unchanged golden question
"Why does SYN-027 need attention?" completed at approximately 16:38Z and
reported **three active alerts, one critical**, alongside the correct
38-minute delay. Request: `00000000-0000-4000-8000-f7fc17c5d9ce`;
browser elapsed 43,906ms, server 41.0s. The baseline had been restored before
this request; its successful transport was not accepted as a semantic pass.

The exact configured individual-vehicle SQL example was subsequently executed
against **both** authoritative operational SQL (16:42:29Z) and the Lakehouse
SQL endpoint actually used by the agent (16:43:09Z). Each returned two rows:
one open critical alert and one open warning alert, with 38-minute delay,
healthy status and non-stale telemetry. A separate status-grouped query on each
source likewise returned exactly **two open alerts**, with no resolved row.
These later reads do not establish what the replica returned at the earlier
agent query's execution instant.

An unchanged-question retest at 16:43:54Z returned the correct **two active
alerts, one critical**, 38-minute delay, healthy/non-stale state at 16:44:26Z
(request `00000000-0000-4000-8000-f1cb50878417`; browser 32,105ms,
server 26.5s). No agent definition, prompt, source data or application code was
changed between the failed answer and retest.

Root cause is **unproven**: do not label this a confirmed replica-lag, cache or
model defect, or claim the retest fixed it. Preserve the mismatch as FB-025,
prefer the source-reviewed regional-delay question for the protected demo,
and verify any answer before creating an alert. Numeric-presence smoke checks
cannot establish complete answer correctness. No canned answer was substituted
and no last-minute republish was performed.

## References and discrepancies

- [Data Agent definition](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/data-agent-definition)
- [MCP integration](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-mcp-server)
- [SQL database OneLake replication](https://learn.microsoft.com/en-us/fabric/database/sql/mirroring-overview)
- [Tenant prerequisites](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-tenant-settings)

The project Fabric-agent skill's ten-minute/client-wide timeout guidance conflicts
with installed Rayfin 1.36.2 documentation and FunctionClient declarations.
The implementation follows the installed per-invocation API and 250-second
ceiling; it does not extend unrelated app operations' timeout.
Tenant-wide AI/cross-geo settings were not changed. The actual portal editor
remained loading/blank in the integrated browser; API publication and MCP
execution were validated independently. See the actionable entries in
[the feedback log](../FEEDBACK-LOG.md).
