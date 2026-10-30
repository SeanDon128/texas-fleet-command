# Observability and troubleshooting

This prototype uses the existing Fabric app and its associated Function. No new
monitoring service, telemetry database, third-party collector, secret or connector
was provisioned. Everything is synthetic. Verification below is an owner-session
observation on October 28, 2026, not a general-availability or production-SLA claim.

## What is actually available

| Surface | Verified scope | Not established |
|---|---|---|
| Native app Metrics | Six populated metrics in Manage app, successful platform responses for this app | Consumer access, retention, alert rules, billing/CU attribution, documented query SDK |
| Native Function historical logs | Persisted invocation list and individual log messages for the existing published Function | General app/database/frontend Logs, export API, retention, consumer access, ingestion SLA |
| Browser operation diagnostics | Deployed start/completion spans; actual fleet/inbox reads, agent success/failure, alert partial save/repair and lifecycle observed | Console records are not durable native Logs or an audit trail |
| Local CLI diagnostics | Documented in installed guide 1.36.2 | These are not deployed runtime logs |

Use the native UI rather than depending on its undocumented backend endpoints.
Installed guide/CLI documentation did not explain the native Metrics and
Function historical-log journey; absence from that documentation did **not**
mean the capabilities were unavailable in this tenant.

## Native app Metrics

Open the existing app in Fabric -> **Manage app -> Metrics**. Select **Last 24
hours** to include the recent demo/recovery window. Six metrics are available:
sign-ins, app loads, query count, query error count, query error rate and average
query duration. The native UI and its successful platform responses were both
checked; the responses identified this app and reported status `ok`.

Observed snapshot, **2026-10-27 15:00Z through 2026-10-28 15:00Z**:

| Metric | Native display |
|---|---:|
| Sign-ins | 6 |
| App loads | 14 |
| Queries | 220 |
| Query errors | 2 |
| Query error rate | 1.42% |
| Average query duration | 229.96 ms |

These are historical observations, not values to hardcode or future acceptance
thresholds. They are not Data Agent end-to-end latency or capacity billing.

### Interpretation caveats worth demonstrating

- The observed Last 7 days and Last 30 days windows ended at **UTC midnight**,
  excluding the current partial UTC day. The Last 24 hours window ended at the
  completed hour. This explains why recent activity was absent from longer views;
  it does not prove a collection outage.
- The displayed error-rate description says `Error count / count * 100`, but
  `2 / 220 * 100` is approximately **0.91%**, not **1.42%**. The UI faithfully
  formats the backend's FULL-range **Average** of about 1.4214%. Its denominator,
  aggregation/coverage relationship to displayed counts remains unresolved.
  Do not call this a proven frontend arithmetic bug.
- A long-window error card displayed zero while its chart said **No metric data
  is available for this time range**. Null points/missing observations must not
  be presented as proven zero failures.
- The two errors fall in the hour of earlier deliberate tests, but no
  request-level correlation proves those tests caused the metric points.
- Changes may not appear immediately. Do not promise refresh/ingestion timing.

Feedback: [FB-023](../FEEDBACK-LOG.md#fb-023---native-app-metrics-time-windows-and-error-rate-semantics).

## Native Function historical logs

Navigation in the approved workspace:

1. Existing app -> **Manage app -> Functions**.
2. Open the associated **User Data Functions** item already listed there.
3. Select **askFabricDataAgent** in **Functions explorer**.
4. Open **More -> View historical log**.
5. In **All historical logs**, select an invocation's date to view details.

The native UI showed 12 persisted successful invocations, with **Date (UTC)**,
**Status**, **Duration(ms)** and **Invocation ID**. An inspected October 28
14:15:38.811 UTC invocation had native duration **41,229 ms**. Its detail table
contained the actual authored `fleet-agent-completed` JSON message with
`requestId` and **40,209 ms** elapsed time. The native invocation ID is a
different identifier from the application request ID.

The platform's context messages exposed token-presence/count/audience
diagnostics, not token values, in the inspected invocation. This is a sampled
observation, not a guarantee every future platform message is shareable.

The Function already emits only:

```text
fleet-agent-completed: requestId, elapsedMs
fleet-agent-failed: requestId, fixed code, elapsedMs
```

The history UI warns that logs can take a few minutes to appear. **Succeeded**
means the runtime invocation succeeded; a typed returned agent failure can still
be a successful invocation. It does not certify answer accuracy or permission
success. Inspect the returned outcome, safe application event and source records.

Feedback: [FB-024](../FEEDBACK-LOG.md#fb-024---native-function-history-is-useful-but-hard-to-discover).

## Reusable, content-free browser spans

[observability.ts](../packages/frontend/src/lib/observability.ts) instruments
logical service operations, not individual GraphQL requests:

- `fleet.load`, `alerts.load`, `alerts.context`
- `agent.ask`
- `alert.create`, `alert.acknowledge`, `alert.resolve`, `alert.repair`

Each attempt emits one `operation.started` and, when settled, one
`operation.completed` under the `[fleet-observability]` console prefix.
The fixed schema includes version, browser source, operation, random local
operation UUID and actual UTC timestamp. Completion adds monotonic elapsed
milliseconds, outcome (`success`, `failure` or `partial`), an allowlisted code
when applicable and an optional UUID-validated server request reference.

No prompts, generated answers, alert messages, record/recipient IDs, actor
identities, tokens, headers, raw errors or provider bodies are forwarded. The
classifier's extra properties are never spread into a record. Root load failures
also use fixed text rather than forwarding arbitrary provider error text.

Important semantics:

- Returned `kind: failure` agent results log failure despite transport success.
- A committed alert with a missing event logs `partial / timeline_incomplete`.
  Recovery logs a separate repair attempt; it never erases the original outcome.
- Thrown errors retain their identity and reach the existing explicit error UI.
- A pending start without completion indicates an unsettled attempt, not success.
- React development effect replays and operator retries are separate attempts.
- Browser durations include session/client acquisition and browser scheduling.
  Server elapsed time, native invocation duration and platform query duration
  measure different boundaries.

These console records are **not durable native Logs**, do not leave the browser
through this helper and are not an audit trail. No external logging SDK,
collector, persistence or content-bearing custom telemetry was added.

### Troubleshoot an agent request without exporting content

1. Preserve the visible error and verify the map remains usable.
2. Filter browser diagnostics by `[fleet-observability]`.
3. Find the `agent.ask` completion and its safe `serverRequestId`, if present.
   A network failure before a Function result may have only a local operation ID.
4. Open native invocation history near that **actual UTC time**. Search the
   authored event inside invocation details for the matching application
   `requestId`; do not equate it with the native invocation ID.
5. Record outcome/code and timings only. Do not paste prompt/answer text,
   authentication storage, network headers or full log exports into feedback.

## Demo and release checks

See the [demo runbook](DEMO_RUNBOOK.md) and
[submission checklist](SUBMISSION_CHECKLIST.md). Run existing static gates
serially. Unit tests protect projection/privacy, correlation, pending attempts,
service-level failures, partial commits and unchanged return/error semantics.

### Hardened hosted release - October 28

The approved deployment reused the protected app and excluded the unchanged
Function. The actual hosted bundle was `/assets/index-ZXLReunk.js`. Typecheck,
build, lint and Functions validation passed, with **112 frontend tests across
14 files**, **116 data/schema tests** and **18 MCP transport tests**.

| Runtime check | Observed outcome |
|---|---|
| Gate and source reads | Private sign-in gate preceded app content; normal sign-in loaded 120 interactive vehicle markers and 120 roster rows. Eight additional city markers are not vehicles. Real fleet/inbox refreshes emitted safe success spans |
| Real agent success | At 15:47Z the regional-delay answer returned HOU/nine, browser elapsed 18,395ms, server elapsed 13.7s, application request `00000000-0000-4000-8000-f173d6785cb3` |
| Controlled agent failure | Browser-only HTTP 503 at the Function invocation produced `failure / request_failed`, removed the prior answer, exposed Retry and left the map usable. Interception was removed in `finally` |
| Real retry | Keyboard Retry returned HOU/nine at 16:40:11.976Z, browser elapsed 11,569ms, server elapsed 11.1s, request `00000000-0000-4000-8000-f8ae4eb02df8` |
| Real partial write and repair | An observed Chromium `ERR_NETWORK_IO_SUSPENDED` interruption was followed by a same-request retry that stored one alert but no event. Diagnostics reported `partial / timeline_incomplete`; reload exposed the missing event, and repair/acknowledge/resolve emitted success spans |
| Persistence and cleanup | Reloads and independent SQL verified the three event kinds and original actor/timestamp metadata. A guarded exact-ID transaction removed only this additional temporary alert and its three events; original operational/history data was reverified without a reseed |

The browser interruption is not a proven Fabric service outage. An automation
wait also used the wrong timeline label; that timeout is not an application
defect. Ambiguous action completion was reconciled with SQL before any retry.
See [alert acceptance](ALERTS.md).

**Transport success is not answer correctness.** A fresh SYN-027 answer claimed
three active alerts, although subsequent operational and agent-source SQL both
returned two. An unchanged-question retest returned two; the initial semantic
failure remains recorded, with no established cause or claimed fix. See
[agent evidence](DATA_AGENT.md#hardening-release-accuracy-and-recovery-follow-up)
and [FB-025](../FEEDBACK-LOG.md#fb-025---successful-agent-invocation-can-return-an-incorrect-alert-count).

Native Metrics and persisted Function history were verified before this
deployment. A newly emitted browser request reference still requires matching
inside native history; the earlier native invocation is not proof of that
new-release correlation. Bounded owner-session reload attempts at 16:45-16:48Z
did not load the native AppBackend/Function workload frames in the integrated
browser. No new history query or hosted-app iframe could be inspected in those
attempts. This leaves correlation and hardened-release embedding open; it does
not overturn the earlier native evidence or establish a service outage.

A separate clean standalone reload at 16:49Z loaded the same bundle, all 120
vehicle markers/roster rows and source-derived 120/16/25/10 cards. Fleet and inbox
reads completed with safe success spans. In that reload window there were zero
page errors, console errors, failed app-origin requests or app HTTP errors.
Recipient/timeline context subsequently settled, the inbox showed 25 of 38
alerts, and keyboard selection opened SYN-027's actual current assignment.
The removed test message was absent; Q&A reset to an honest empty state.
The measured 960px layout had no horizontal page overflow. These are bounded
observations, not a claim that deliberate test errors never occurred.

Keep the established protected standalone URL as the demo entry. A prior bundle
did render through the actual Fabric host in the owner session. The hardened
bundle's embedded handoff, stale/different-user replacement and consumer
permissions still require separate checks. Do not weaken the gate to obtain
a screenshot.

Local CLI workflow logs live under the invoking user's `.rayfin\logs` per the
installed guide: 14-day retention, target 20 invocation files / 100 MiB total,
10 MiB per file. This is documented CLI behavior, not a native runtime retention
guarantee. Review/redact any selected evidence; do not collect unrelated
home-directory logs or publish the internal project plan.
