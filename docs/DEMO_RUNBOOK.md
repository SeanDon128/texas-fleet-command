# Zava Security Texas Fleet Command: six-minute demo runbook

**Operator document / October 28, 2026.** This is a demonstration of completely
invented data about **Zava Security, a fictional company**; it reflects no real
company's operational data or practices. Use the protected standalone app at
`<your-protected-fabric-app-url>` (deployment URL placeholder).
Do not show credentials, account menus, request headers, or raw logs.

> **PayGo capacity:** the F64 capacity `demodinoeast2` (East US 2) must be turned on
> before anything in this runbook works. The Hackathon owner needs to be nudged by
> the judges in order to turn it on. Turn it off again afterward to stop billing.

**Feature freeze: Wednesday, October 28, 2026, 3:00 PM Eastern.** After that,
accept only demo-blocker fixes and documentation/evidence corrections. This is
the user's feature-freeze deadline, not a verified submission closing time.

## What this demo proves

Follow one loop: **see a fleet exception -> investigate with a read-only agent ->
create a shared synthetic alert -> acknowledge -> resolve -> reload -> inspect
native Metrics**. The protected standalone owner-session path is the established
demo route. New-release embedded acceptance and browser-to-native log correlation
are **blocked/unverified** in the latest native follow-up. Another user's
permissions and stale/different-user session replacement remain separate gates,
not inferred successes.

Telemetry uses the frozen scenario clock **2026-10-27 15:00 UTC**
(10:00 AM Central). Alert actions use actual action time, displayed in Central.
Resolving an alert does not fix a vehicle's delay, health, or telemetry.

### Baseline reference, not a reset target

The original scenario contains 120 vehicles in eight regions, 16 delayed
vehicles, 25 active alerts across 19 vehicles, four critical alerts, and ten
stale reports. Houston has nine of the 16 delayed vehicles. Originally SYN-027
was 38 minutes late with two active alerts, including one critical.

Real demo actions legitimately change alert/event totals. Active includes
**open and acknowledged**. Confirm today's displayed/source state; do not
reseed, delete records, or undo someone else's actions to reproduce these counts.

### Final standalone closure: bounded evidence

The clean reload at **2026-10-28 16:49 UTC** served the same
`/assets/index-ZXLReunk.js`, with 120 interactive vehicle markers, 120 roster
entries, cards **120 vehicles / 16 delayed / 25 active alerts / 10 stale**, and
`fleet.load` / `alerts.load` success spans. There were **zero page/console errors,
failed app-origin requests, or app HTTP errors in that bounded reload window**,
not across all earlier tests or future sessions.

After context settled, the inbox showed 25 active of 38 total alerts and the
removed temporary message was absent. Keyboard SYN-027 selection opened actual
assignment **SYN-ROUTE-027**; the 960px layout had no horizontal overflow. Q&A
returned to an honest empty state after reload, not a restored/canned answer.
One saved screenshot was inspected and is usable for header/KPIs only, **not a
full-map capture or a submission-ready screenshot/video package**.

## Preflight: 20-30 minutes before presenting

1. **Check the release, not just the URL.** Confirm which hosted build is running
   and that it matches validated source. Final static gates passed: typecheck,
   build, lint; **112 frontend tests / 14 files**, **116 data/schema tests**,
   **18 MCP tests**; Functions validator **1 authored/generated Function /
   0 unsafe casts**. The protected app now serves `/assets/index-ZXLReunk.js`;
   fresh gate/sign-in, 120 interactive markers plus 120 roster entries, and
   fleet/inbox success spans passed. The 16:49 UTC closure above is bounded
   standalone evidence; new-release embedded acceptance and browser-to-native
   invocation-log correlation remain blocked/unverified.
2. In normal Edge, open the protected standalone app. Complete approved
   Microsoft/Fabric sign-in without recording credentials. Verify the map,
   accessible roster, details, and a reload-restored session.
3. Choose **Reset** under the fleet filters. Check 120 vehicles, the eight-region
   scope, the scenario clock, current active counts, and **Investigate HOU**.
   Search for SYN-027 and inspect its current assignment, delay, and alerts.
   If its alert state differs from the original seed, use the actual state.
4. Prefer the Houston regional-delay question below for the protected live demo.
   Source-check before acting. Rehearse the SYN-027 question only as an explicitly
   fallible, source-gated investigation: it recently overcounted active alerts,
   then answered correctly on an unchanged-question repeat. The cause is
   unproven, not established as lag/caching or fixed. A successful response or
   expected number appearing in prose is not enough; never edit a returned answer.
5. Check **Shared alert inbox** loads fictional same-region recipients and
   timelines. Identify one recipient and a unique demo-message suffix. Do not
   create several rehearsal alerts merely to raise metrics. Any intentional
   rehearsal alert should complete its normal lifecycle and remain recorded.
6. Pre-open a second tab: Fabric -> **Trucks Rayfin** ->
   **tx-fleet-command** AppBackend -> **Manage app** -> **Metrics**.
   Select **Last 24 hours** (`LAST24HOURS`). Confirm live cards load. Do not
   expose the account menu or resource URLs containing identifiers in captures.
   For an optional runtime-log follow-up, pre-open the verified invocation-history
   path below; do not spend the timed Metrics segment navigating multiple surfaces.
   Latest native follow-up was blocked in the integrated browser; if views remain
   blank, use only a reviewed, labeled earlier snapshot or omit the live segment.
7. Prepare normal-Edge screenshots and a backup recording, if actually captured
   and privacy-reviewed. Label them with capture time and **Recorded**, not live.
   Existing integrated-browser captures can be clipped/tiled; do not reuse them
   as final proof. The new inspected header/KPI-only image does not complete the
   full-map, normal-Edge screenshot, or video gates. Missing evidence stays missing.
8. Rehearse the six-minute sequence, keyboard focus, readable zoom, and tab
   switch. Keep a stopwatch outside the shared region. Remove any browser-only
   fault injection before the demo. Do not change capacity, create resources,
   deploy, or modify permissions during the presentation.

## Timed live sequence

| Time | Exact actions | Say / check |
| --- | --- | --- |
| **0:00-0:25** | Start in the signed-in standalone app with **Reset** selected. | "This entire Texas fleet is invented. We will spot an exception, investigate it, and track an in-app action. Telemetry is frozen at the scenario time, not live GPS." |
| **0:25-1:05** | Click **Investigate HOU**. Inspect the Houston delayed roster. Click **Reset**, type `SYN-027` in **Find a vehicle** (`Vehicle ID or call sign`), then select that vehicle's roster row. | Explain Houston's original nine of 16 delays; use the current screen as evidence. Show SYN-027's delay, current assignment, and actual active alerts. Roster selection is the reliable alternative to overlapping markers. |
| **1:05-2:25** | Scroll to **Ask the fleet**. Enter the preferred HOU question in **Your fleet question**, then click **Ask Fabric Data Agent**. Compare its result with the source-backed regional view. Use any remaining time for source review; ask the SYN-027 question only if intentionally showing the accuracy limitation and ready to review its complete answer. | The agent queries the whole fleet, independent of map filters. A recent SYN-027 answer was wrong despite successful transport; do not present its repeat as a fix. Apply the 35-second presentation budget per attempted question and never invent a fallback answer. |
| **2:25-4:35** | Return to SYN-027 details; click **Create an alert for this vehicle**. In the form choose **Alert type: Delay**, **Severity: Warning**, and one **Fictional recipient (same region)**. Enter the unique invented message below. Click **Create in-app alert** once. Select the new queue entry if needed; click **Acknowledge alert**, then **Resolve alert**, waiting for confirmed saves between actions. Reload the page. Return to **Shared alert inbox**, set **Inbox status: Resolved**, select the same message, and inspect its linked timeline. | Show the saved record and the three event kinds: created, acknowledged, resolved. The inbox is shared by signed-in operators, not private to the fictional recipient. No external notification was sent. Reload must show the saved status/timeline; a toast alone is not persistence proof. |
| **4:35-5:15** | Switch to the prepared AppBackend **Manage app -> Metrics** tab. Select/confirm **Last 24 hours** and show the six cards. | Native Metrics is preview and owner-session verified. Values are a dated snapshot, not acceptance thresholds or agent end-to-end latency. Do not diagnose an error from a count alone. |
| **5:15-6:00** | Return to the app and leave the resolved demo alert or statewide view visible. | Close with the architecture/privacy paragraph below and the explicit prototype limits. If embedding or other-user acceptance is still pending, say so. |

Use an actual, unique time suffix in this invented message and note it before
reloading:

> DEMO HH:MM - Synthetic delay review for SYN-027; shared inbox demonstration only.

Do not modify or resolve a seeded alert as the demo action. Do not delete the
new alert afterward to force baseline counts. Resolving this added alert removes
it from active counts while preserving its lifecycle.

### Two golden questions: HOU preferred; SYN-027 source-gated

1. **"Which Texas region has the most delayed vehicles?"**
   Preferred protected-demo question. Source result: HOU/Houston 9; statewide
   delayed total 16. A real retry returned HOU/nine at **16:40:11.976 UTC on
   October 28**: 11,569 ms observed browser wait, 11.1 s app-reported server
   elapsed time. These are one sample's separate timings, not an SLO. A complete
   answer must not confuse delayed with at-risk or claim the map filter limits
   the agent.
2. **"Why does SYN-027 need attention?"**
   Source-gated diagnostic, not a dependable live-answer promise. At **16:37 UTC
   on October 28**, the answer said three active alerts, one critical.
   Operational SQL at **16:42 UTC** and the actual Lakehouse agent SQL at
   **16:43 UTC** both showed exactly **two open alerts**, one critical, a
   38-minute delay, healthy status, and non-stale telemetry. The unchanged
   question repeated during **16:43:54-16:44:26 UTC** returned two correctly.
   Cause remains unproven; do not label it replication lag, caching, or fixed.
   Check current assignment and alerts before acting. One successful repeat
   does not certify this or all seven historically tested question paths.

Ask before adding the demo alert so that its extra warning does not obscure
the original comparison. If legitimate prior actions changed alert state,
describe that change; do not force the original expected answer.

### Bounded latency fallback: no fabricated answer

- Allow **35 seconds of stage time per question**. This is a presentation choice,
  **not** a service SLO, measured maximum, or application timeout.
- If still pending, say "The live agent is still working; the SQL-backed map
  remains available." Continue with the map/inbox and revisit only if it finishes.
  One request is active per panel; do not start a parallel question, repeatedly
  click, or imply moving away canceled the server request.
- If question 1 consumes the budget, skip question 2 live. Prefer HOU even when
  time remains; the vehicle question is optional, source-gated, and known to have
  produced an incorrect answer. Neither is guaranteed by earlier sample success.
- On a displayed failure, explain that no substitute answer was generated.
  Use **Retry question** at most once only if there is time and no request is
  active. Otherwise continue the source-backed workflow.
- A previously captured answer may be shown only as **Recorded response -
  captured at [actual time], not this live request**. Without such evidence,
  show the vehicle details, not a handwritten "agent answer." An incorrect live
  answer is a discrepancy to disclose, not a reason to silently replace it.

The implemented budgets are 230 seconds for the outbound exchange and 245 seconds
for the browser Function invocation. They are technical bounds, not expected
response times. Do not wait out those bounds in a six-minute talk.

### Latest hosted recovery proof, not an instruction to inject failures

The new bundle passed a controlled browser-only agent HTTP 503 check: the prior
answer disappeared, safe error/Retry appeared, and the map stayed usable.
Interception was removed; a real keyboard retry produced the HOU result above.
Transport recovery does not erase the separate SYN-027 semantic failure.

One additional temporary alert encountered Chromium `ERR_NETWORK_IO_SUSPENDED`;
this is an observed browser/network error, **not a proven Fabric outage**.
After the failed attempt, same-request retry saved one Alert and zero events,
with `partial` / `timeline_incomplete` diagnostics. Reload repair reconstructed
the original creator/time; acknowledge -> reload -> resolve -> reload then
passed. SQL confirmed all three event actors/times.

Authorized exact-ID guarded cleanup removed only that **one** temporary alert
and its **three** events. All 3,583 original SQL rows, 13 foreign keys, and 3,840
history rows were reverified without reseeding. The earlier release's three
temporary alerts/six events were a **separate historical cleanup**. These
controlled verification cleanups do not authorize deleting normal demo actions
or forcing active counts back to a fixture.

## Native Metrics: 30-45-second talking points

Owner-session UI loading and backend `/metadata/platformMetrics/queryBatch`
HTTP 200 have been verified. Native Function invocation-log retrieval is separately
verified below; Metrics alone does not establish log coverage. The following
**historical snapshot** covers
**2026-10-27 15:00 UTC through 2026-10-28 15:00 UTC**:

| Metric | Observed snapshot |
| --- | ---: |
| `SignInsCount` | 6 |
| `AppLoadsCount` | 14 |
| `QueryCount` | 220 |
| `QueryErrorCount` | 2 JSON-level errors |
| `QueryErrorRate` | 1.42% backend-aggregated |
| `QueryDuration` | 229.96 ms backend-average |

Live values can change. Do not recompute 1.42% as `2 / 220`, claim the denominator
is understood, attribute the errors to a root cause, or treat every error as an
application defect. Rate/aggregation semantics remain a feedback follow-up.
Query duration is not end-to-end Data Agent latency.

The observed **Last 7 days** and **Last 30 days** windows ended at UTC midnight
on October 28 and excluded that day's partial activity. Use **Last 24 hours** for
recent demo traffic; show the actual window with any screenshot.

### Native Function historical logs: verified, bounded scope

The owner-session portal path is **AppBackend Manage app -> Functions -> open
the existing associated User Data Functions item -> select askFabricDataAgent in
Functions explorer -> More -> View historical log -> select invocation date**.
This is native durable per-invocation runtime-log retrieval, not browser logging.
Use it as an optional follow-up or preflight check without extending the
six-minute script; show only a reviewed field summary, not raw platform context.

**All historical logs** showed 12 **Succeeded** invocations with UTC date,
**Duration(ms)**, and **Invocation ID**. The most recent inspected invocation was
**2026-10-28 14:15:38.811 UTC / 41,229 ms**. Its **Invocation details** contained
the actual content-free `fleet-agent-completed` JSON event with `requestId` and
`elapsedMs: 40209`. Do not expose the actual invocation/request identifiers in
public captures. These are one observed invocation's timings, not an SLO; runtime
duration, Function-reported exchange time, and native query duration differ.

**Succeeded describes runtime/transport completion, not generated-answer semantic
success.** The Function can return a typed failure result without a runtime
failure; continue to inspect the result and compare answers with source data.
The inspected platform context showed token-presence/count/audience indicators,
not token values. This observation is not a blanket guarantee about all logs.
General AppBackend/database/frontend log coverage, retention, export, RBAC, and
ingestion SLO remain unverified. Discovery crossed several portal surfaces;
the installed guide 1.36.2 native-observability documentation gap remains.

The local browser helper is implemented with start/completion spans containing
fixed allowed operation/outcome/code values, a correlation UUID, elapsed time,
and optional UUID-only `serverRequestId`. It excludes content, identity, record
IDs, and tokens and has no external sink. Focused helper tests and final static
gates passed; fleet/inbox success spans and partial/timeline-incomplete diagnostics
were observed on the new hosted bundle. **Browser-to-native invocation-log
correlation and new-release embedded acceptance remain blocked/unverified.**
Browser spans are not the durable native logs.

Bounded AppBackend/User Data Functions reload attempts at **16:45-16:48 UTC on
October 28** left workload frames at bootstrap/blank in the integrated browser.
The new hosted iframe and new native history entry could not be inspected.
Earlier native Metrics, durable invocation-log retrieval, and prior-bundle
embedded rendering remain valid observations; they do not prove the new bundle's
embed or cross-reference correlation. Do not label this follow-up complete or
infer a service-wide failure/root cause. Normal-Edge native follow-up remains
an uncompleted packaging/acceptance gate.
See [observability scope and evidence](OBSERVABILITY.md).

## Recovery and honest substitutions

| Symptom | Safe next step | Acceptable substitution / stop rule |
| --- | --- | --- |
| Private gate or expired sign-in | Complete approved normal browser sign-in off-record. Never paste tokens or weaken auth. | If access cannot be restored, show a labeled prior recording if available; do not claim a live run. |
| Basemap tiles unavailable | Use the source-backed vehicle roster and details; retain map attribution. | Explain tile unavailability separately from fleet-data availability. Do not call invented positions realtime. |
| Fleet data error | Use the displayed retry once after checking the connection. | Stop the live-data claim if reads remain unavailable. A cached/stale view must be identified as such. |
| Agent slow, failed, or wrong | Follow the bounded fallback above; cross-check source records. | Use map evidence or a labeled prior recording. Never insert a canned answer or hide a synthesis error. |
| Alert response uncertain | Retain the operation and use **Retry same request** when offered; inspect the saved queue entry. | Stable alert/request and deterministic event IDs support recovery, not an atomic exactly-once guarantee. Do not submit a new alert to "try again." |
| Chromium `ERR_NETWORK_IO_SUSPENDED` | Preserve the same request and inspect whether the Alert committed; repair an incomplete timeline after reload rather than creating another alert. | The observed retry/repair succeeded, but the error does not establish a Fabric outage or its root cause. |
| Alert saved, timeline incomplete | Use **Repair timeline** when offered. After reload, select the persisted alert and choose **Synchronize recorded events**. | Show partial completion honestly. Do not claim success until readback confirms the missing event; do not roll back a confirmed alert. |
| Resolved alert "disappears" | Set **Inbox status: Resolved** or **All alerts**, then select the same message. | A status filter is not deletion. Verify the same alert rather than creating another. |
| Inbox refresh fails | Keep the prior view with its stale-data warning; retry deliberately. | Do not describe the old view as fresh. Preserve the existing request/recovery context. |
| Metrics preview unavailable | Confirm the owner tab/window once; do not change resources or permissions onstage. | Show an actually captured, dated Metrics screenshot labeled Recorded, or state live Metrics is unavailable. The table above is a reference, not a screenshot. |
| Function history not reachable during a follow-up | Use the associated-item path above in an authorized normal-Edge follow-up; inspect the correct UTC invocation date only if the workload loads. | Latest integrated-browser attempts were bootstrap/blank and blocked new-entry inspection. Earlier durable retrieval is still valid, but new-release correlation is unverified. Do not imply native history is absent. |
| Embedded portal route stalls | Use the validated protected standalone URL. | Prior-bundle embedded rendering was observed, but latest native reloads could not expose the new iframe. New-release embedded acceptance is blocked/unverified, not passed. |

Do not inject failures during the timed demo. Controlled outage/repair evidence
belongs in rehearsal or a labeled recording, with interception removed afterward.

## Privacy and architecture close

> "All vehicles, recipients, incidents, and messages here are fictional. The map
> reads the app-owned Fabric SQL database through authenticated typed GraphQL.
> A server-side Rayfin Function uses a platform-provided Fabric token to call the
> published Data Agent; six read-only OneLake shortcuts expose the existing SQL
> replica. Alerts and linked events are separate persisted writes in a shared
> inbox. No Teams/email or real-person delivery is implemented. Agent answers
> require source review; recipient-only access, transactional/concurrency
> guarantees, and production-grade audit guarantees are not claimed."

For review gates and packaging, see the [submission checklist](SUBMISSION_CHECKLIST.md)
and [human-review submission draft](SUBMISSION_DRAFT.md). Workflow details are in
[Alerts](ALERTS.md), [Data Agent](DATA_AGENT.md), and
[Observability](OBSERVABILITY.md); review linked material for
external-sharing safety before distributing it.
