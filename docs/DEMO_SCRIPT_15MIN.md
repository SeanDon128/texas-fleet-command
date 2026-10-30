# Zava Security Texas Fleet Command: 15-minute demo script

**Presenter script / October 28, 2026.** Built on the [six-minute runbook](DEMO_RUNBOOK.md),
which remains the authority for recovery steps, source-check rules and wording
limits. All data is invented. Zava Security is a fictional company; nothing here
is real company data, people, vehicles, facilities, procedures or endorsement.

**Hard stop: 15:00. Scripted length: 13:55. Built-in buffer: 1:05** for agent
latency. Never fill the buffer; end early rather than run over. Spoken lines are
sized for about 140 words per minute. Read them aloud once against the timing
card and trim in the cut order below before presenting.

Assumed audience: hackathon judges and Fabric Apps/Rayfin product engineers. The
two outcomes this script is built to earn are **new-feature adoption** and
**specific, actionable product feedback**.

## Timing card

| Clock | Segment | Priority | Cut-first rank |
| --- | --- | --- | --- |
| 0:00-1:00 | 1. Open, disclaimer, private gate | P0 (gate beat is P1) | Gate beat: cut 1st |
| 1:00-3:30 | 2. Texas map and exception | P0 | Never cut |
| 3:30-5:15 | 3a. Data Agent: Houston question | P0 | Never cut |
| 5:15-7:15 | 3b. Trust-but-verify: SYN-027 | P1 | Cut 2nd (saves 2:00) |
| 7:15-10:00 | 4. Alert lifecycle with reload | P0 | Never cut |
| 10:00-11:30 | 5. Native Metrics, Function logs | P0 Metrics / P1 logs | Logs + spans: cut 3rd |
| 11:30-13:00 | 6. Product feedback | P0 | Shorten to three items, never skip |
| 13:00-13:55 | 7. Reuse, limits, close | P0 | Shorten, never skip |
| 13:55-15:00 | Buffer / questions | n/a | n/a |

**Clock checks:**

- At the end of 3a (planned **5:15**): if the clock reads **5:30 or later**, skip 3b
  and go straight to the alert.
- When the alert lifecycle ends (planned **10:00**): if the clock reads **10:45 or
  later**, skip the Function-log and console beats and compress feedback to the
  first three items.
- At the start of feedback (planned **11:30**): if the clock reads **12:15 or
  later**, deliver only items one and two, then go to the close.

## Before you start (not timed; finish 20 minutes early)

1. **Release and data.** In normal Edge, open the protected app at
   `<your-protected-fabric-app-url>` (deployment URL placeholder),
   complete approved sign-in off-camera, **hard-reload**, and click **Reset**. Reading the
   screen, confirm 120 vehicles, eight regions, the scenario clock Oct 27, 2026 /
   10:00 AM CDT, and the actual active/delayed/stale counts. Original reference:
   16 delayed, 25 active alerts across 19 vehicles, four critical, ten stale, Houston
   nine of 16. If legitimate actions changed them, describe the actual state.
2. **No leftover fault injection.** Use a clean browser profile/window with no
   route interception or DevTools throttling from earlier testing.
3. **Window layout** (zoom to 125% for readability):
   - **Window A:** signed-in app, Reset, statewide.
   - **Window B (optional):** a signed-out private window already showing the
     app's "This app is private" gate. Do not sign in on camera.
   - **Tab C:** Fabric > Trucks Rayfin > **tx-fleet-command** > **Manage app >
     Metrics**, **Last 24 hours** selected and cards loaded.
   - **Tab D (optional):** the associated User Data Functions item, already on
     askFabricDataAgent's historical log. If it will not load in 30 seconds,
     leave it closed and use the fallback line.
4. **Write down the unique alert message** with the current time:
   `DEMO HH:MM - Synthetic delay review for SYN-027; shared inbox demonstration only.`
5. **Hide private details.** Close account menus, notification toasts, address
   bars with item identifiers, and any raw logs. No tokens, no admin username.
6. **Rehearse everything except the alert's Create click.** A rehearsal alert is a
   permanent record. If you must rehearse it, run one complete lifecycle once and
   leave it; never delete records to restore counts.
7. **Do not** change capacity, deploy, reseed, edit permissions or inject failures
   during or just before the demo.

---

## 1. Open (0:00-1:00)

**Screen:** Window A, statewide view.

> "Thanks everyone. This is **Zava Security Texas Fleet Command**, a Microsoft Fabric App built
> on Rayfin. It takes an operations manager from 'something's wrong somewhere in
> Texas' to 'someone owns it, and it's tracked.'
>
> First, **everything here is invented**: Zava Security is a fictional company, and the
> vehicles, crews, routes and alerts are made up. It represents no real company's
> vehicles, people or procedures, and the clock is frozen at a scenario time, so it's
> not live GPS.
>
> As we go, I'll flag what's new in Fabric Apps, what we tested, and what we'd
> tell the product team."

**Optional gate beat, 20 seconds (cut first):** switch to Window B.

> "New capability one: private hosting. A browser with no session sees only this
> gate, no fleet content. I'm already signed in on the other window."

Switch back to Window A.

## 2. The Texas map and an exception (1:00-3:30)

**Screen:** Window A.

1. Point at the four KPI cards, then the map. (0:30)
2. Click **Investigate HOU**. Show the filtered roster. (0:40)
3. Click **Reset**. In **Find a vehicle**, type `SYN-027`; select it from the
   **roster** (more reliable than clicking overlapping markers). Show delay,
   current assignment and active alerts. (1:00)
4. Click **Reset** again. (0:20)

> "Four cards: **120 vehicles**, **16 delayed**, **25 active alerts** across 19
> vehicles, **10 reporting stale**, meaning no telemetry for more than 15 minutes
> at scenario time. Those numbers aren't bundled fixtures. They're computed from
> the app's Fabric SQL database through authenticated, paginated GraphQL reads.
>
> The map shows eight Texas regions and a marker per vehicle, with status encoded
> by shape and color. The banner computes the exception for us: **Houston has nine
> of the sixteen delayed vehicles.** [Click Investigate HOU.] Here's that slice.
>
> [Reset, find SYN-027.] Let's pick **SYN-027**. It's thirty-eight minutes late,
> has a current fictional assignment and destination, healthy status, and active
> alerts. Everything on this panel is read from the persisted records. Remember
> this vehicle; it's our case study."

*Say only what the screen shows. If current alert state differs from the original
seed, describe the actual state.*

## 3a. Data Agent: the Houston question (3:30-5:15)

**Screen:** scroll to **Ask the fleet**.

Select or type **"Which Texas region has the most delayed vehicles?"**, then click
**Ask Fabric Data Agent**. Start a stopwatch. The next lines fill the wait.

> "Now the part that makes this more than a dashboard: I'll ask a Fabric Data
> Agent in plain language. **Which Texas region has the most delayed vehicles?**
>
> While it works: the browser calls a **server-side Rayfin Function**. The
> Function uses a **platform-provided Fabric token**, so there's no API key or
> secret in the browser, and it talks MCP to a **published Data Agent**. The agent
> reads six read-only OneLake shortcuts over the same operational data, so no
> second copy and no ETL pipeline. It's read-only; it can't create alerts or
> change records."

When the answer arrives (expect roughly 11 to 30 seconds from earlier samples,
no service guarantee):

> "**Houston, nine delayed vehicles.** That matches what the map showed us. Note
> the label: *generated analysis can be wrong*. We keep that visible on purpose,
> and the next question shows why."

**Fallback if still pending at 35 seconds on the stopwatch:**

> "The live agent is still working. The map is SQL-backed and still available."

Continue to section 4. Don't click repeatedly, start a parallel question, or
present a canned answer. Revisit only if it finishes.

## 3b. Trust but verify: SYN-027 (5:15-7:15, P1, cut second)

**Run this only if the clock reads under 5:30 and 3a finished normally.**
Click **"Why does SYN-027 need attention?"** and ask. Do **not** pre-announce the result.

> "Let me ask about our case study: **why does SYN-027 need attention?** While it
> works: this question taught us something. Earlier today it was asked as part of
> hardening, and it overcounted."

Compare the answer with the vehicle panel (**38 minutes late, two active alerts,
one critical, healthy, not stale**). Then use the branch that matches:

- **Answer says two active alerts, one critical:**
  > "It matches the source. But at 16:37 UTC today this same unchanged question
  > said **three**. Operational SQL and the agent's own source both showed
  > two; a retest minutes later was correct. We still don't know why, so we
  > haven't claimed a fix. We logged it as product feedback."
- **Answer says anything other than two:**
  > "And here's the failure mode. The panel says two active alerts and the agent
  > said [state it]. The request succeeded; the **content** was wrong. We've
  > recorded this class of problem as feedback."
- **Still pending at 35 seconds:** use the fallback line from 3a and move on.

> "The takeaway: runtime success is not semantic correctness. The agent is
> advisory, the answer carries a warning, and a person checks it against the
> source before acting."

Never describe this as fixed, never edit or hide a returned answer, and never say
lag or caching caused it. Cause is unproven.

## 4. From insight to tracked action (7:15-10:00)

**Screen:** SYN-027 selected. Ask the agent questions before this step so the new
alert does not muddy the comparison.

1. Click **Create an alert for this vehicle**. Choose **Alert type: Delay**,
   **Severity: Warning**, and the **Synthetic HOU Coordinator (fictional)**
   recipient. Paste the prepared message. Click **Create in-app alert** **once**. (0:50)
2. Select the new entry in the queue. Click **Acknowledge alert**, wait for
   confirmation, then **Resolve alert**. (0:50)
3. Press reload. Set **Inbox status: Resolved**, select the same message, and
   show its timeline. (0:50)

> "Now I act. SYN-027 is late, so I'll create an alert and assign it to a
> **fictional** Houston coordinator. [Fill the form, click Create once.] It's saved
> to the database, and the map's active count moves from 25 to 26; SYN-027 was
> already one of the nineteen affected vehicles, so that count stays.
>
> Acknowledge. [Click.] Resolve. [Click.] Back to 25. Resolving closes the
> **alert**; it doesn't fix the truck.
>
> Now the proof. [Reload.] My session restores; I filter the inbox to Resolved and
> open the same alert: **created, acknowledged, resolved**, with real action times
> in Central. Telemetry stays frozen."

> "Two honest notes. This is a **shared in-app inbox** with a fictional recipient:
> **no Teams message or email is sent**. And the alert and its timeline events are
> **separate writes**, not a transaction, so we built a stable request ID,
> read-before-write retry, an explicit partial-save state, and a repair after
> reload. We exercised it, including a real browser network interruption that left
> an alert saved with no events; the repair worked. We'd like the platform to
> offer a conditional mutation."

*Do not click Create twice. If the response is uncertain, use the offered **Retry
same request**. Do not submit a new alert to try again.*

## 5. Observability: what Fabric gives you natively (10:00-11:30)

### 5a. Native Metrics (60 seconds, P0)

**Screen:** Tab C, **Last 24 hours**.

> "New capability two: **native app Metrics**, in preview. Under Manage app there
> are six: sign-ins, loads, query count, errors, error rate and average query
> duration. [Read the cards as displayed.] Nothing was installed for this: no
> collector, no extra database.
>
> Two cautions we found: the 7- and 30-day windows end at UTC midnight and exclude
> today, so we use Last 24 hours. And the error rate doesn't reconcile with errors
> divided by queries, so we call it the platform's aggregate and ask for the
> denominator to be documented. Query duration is **not** agent latency."

### 5b. Native Function logs (20 seconds, P1, cut third)

If Tab D is ready:

> "New capability three: **persisted Function logs**. Each invocation shows status
> and duration, and the detail has the safe event we log: a request reference and
> elapsed time, never the question or answer. Succeeded means the runtime
> finished, **not** that the answer was right."

If it isn't ready, say only: "We verified native persisted Function history for
this app's agent Function, and the discovery path is in our feedback. I'll skip
the click-through for time." Do **not** claim the newest request was correlated
there; that follow-up is not verified.

### 5c. Browser diagnostics (10 seconds, P1, cut third with 5b)

> "In the browser we also emit content-free spans: operation, outcome, duration
> and a safe request reference. They're console diagnostics, not durable logs or
> an audit trail."

## 6. Product feedback (11:30-13:00)

**Screen:** stay on the app, or show the feedback log. Deliver as **Observed ->
impact -> ask**, about 18 seconds each. Keep the order below, so cuts remove items
from the bottom.

> "We kept a feedback log from before the first line of code. Four items I'd most
> want an engineer to see, each with evidence:
>
> **One, typed lookups.** `findById` is typed as a full entity but, at runtime,
> selects only the ID. Our create failed closed, but static checks and mocks all
> passed. **Ask:** type convenience results as the projection they return, with a
> read-back example.
>
> **Two, answer correctness.** A succeeded invocation returned a wrong alert count.
> **Ask:** show query provenance, source freshness and the generated SQL with the
> answer.
>
> **Three, Metrics semantics.** Windows exclude today; the error rate doesn't
> reconcile. **Ask:** show UTC bounds, numerator and denominator.
>
> **Four, discoverability.** Function logs are useful but sit behind several portal
> steps. **Ask:** link invocation history from the app's Functions view.
>
> Lightning round: a table load completes before SQL can query it; the live MCP
> server negotiated a newer protocol than our starter assumed; timeout guidance
> conflicted with the installed SDK; and the portal's embedded view stayed blank in
> our browser."

*Cut order if short on time: lightning round, then item four, then item three.*

## 7. Reuse, honest limits and close (13:00-13:55)

> "What's reusable: the map and roster, a deterministic synthetic-data generator
> with a scenario clock, the bounded Function-to-Data-Agent bridge, the alert
> lifecycle with partial-save repair, and the protected-hosting setup. Region,
> branding, thresholds and endpoints are the template parameters. This is a
> **reference implementation, not a one-click template**.
>
> The limits: **no Teams or email**, no recipient-only access, no transaction or
> audit guarantees, and the agent uses the owner's identity, so no per-user agent
> security. We tested five new capabilities end to end: private hosting,
> platform-token Functions, a published Data Agent over OneLake, native Metrics
> and native Function logs. We chose depth over adding connectors for the count.
>
> The takeaway: **see the exception, ask the agent, verify the source, assign the
> action, keep the evidence.** Thank you. Questions?"

---

## If something goes wrong (short version; full table is in the [runbook](DEMO_RUNBOOK.md))

| Symptom | Say / do | Never |
| --- | --- | --- |
| Sign-in gate | Complete approved sign-in off-camera, then resume. | Paste tokens or weaken auth. |
| Agent slow past 35 s | "Still working; the map is SQL-backed." Move on. | Click repeatedly, parallel questions, canned answers. |
| Agent error | Say no substitute answer is generated. Use **Retry question** at most once. | Hide it or edit an answer. |
| Wrong agent answer | Use the SYN-027 "wrong answer" branch. Show the source. | Claim a cause or fix. |
| Basemap tiles fail | Use the roster and details; keep attribution visible. | Call positions realtime. |
| Alert response uncertain | **Retry same request**; check the saved queue. | Create a second alert. |
| Alert saved, timeline incomplete | **Repair timeline**, or after reload **Synchronize recorded events**. | Claim success before read-back. |
| Resolved alert "vanished" | Set **Inbox status: Resolved** or **All alerts**. | Create another. |
| Metrics tab won't load | Show a labeled **Recorded** screenshot, or say live Metrics is unavailable. | Present the snapshot as live. |
| Function history won't load | Use the skip line in 5b. | Claim new-request correlation. |

## Claims to avoid

- Any real-company data, practice, customer outcome or endorsement.
- Live GPS or realtime positions.
- That the agent is accurate, fixed or certified; or that it can send or change alerts.
- That the SYN-027 discrepancy was caused by lag or caching, or that it's resolved.
- That alerts reach a real person; Teams, email or assignee-only access.
- A transaction, exactly-once, concurrency or tamper-proof audit guarantee.
- That the latest bundle is verified **embedded in the Fabric portal** (a prior
  bundle rendered there; the latest is blocked/unverified), or that a second user or
  a stale-session replacement was tested.
- That native Function history was correlated to the newest request (unverified).
- A latency SLO. Observed agent samples ranged from about 11 to 41 seconds.
- Production readiness, ROI or time savings. None was measured.

## Likely questions, short answers

| Question | Answer |
| --- | --- |
| Is any of this real company data? | No. Zava Security is fictional, and everything is invented, including vehicles, crews, routes and alerts. |
| Does the alert notify anyone? | No. It's a shared in-app inbox with fictional recipients. Teams/email is future work. |
| Why a Lakehouse shortcut rather than the SQL database directly? | The Data Agent's public source list didn't include the SQL database item, but it supports Lakehouse tables. Shortcuts reuse the existing replica, with no second copy; replication can lag direct SQL. |
| Can another user see the alerts? | Any signed-in operator sees the shared inbox. A second user and recipient-only access were not tested. |
| Is it embedded in the Fabric portal? | A prior bundle rendered there in the owner session; the latest bundle's embedded run is unverified. The protected standalone URL is the validated path. |
| Did you use Secret Store, connectors or Teams? | No. We chose depth over feature count. The agent path uses the platform Fabric token, so no stored secret was needed. |
| How fast is the agent? | Observed samples ran about 11 to 41 seconds; that's not an SLO, and the UI bounds waits at roughly four minutes. |
| Can you trust the agent's answers? | Treat them as advisory. We caught one overcount, documented it, and kept the verify-against-source step. |
| Is this a template? | A reference implementation with identifiable parameters, not a one-click, cross-tenant template. |

## After the demo

- Do not delete the demo alert to restore counts; it's recorded history. Active
  alerts return to the prior total once it is resolved.
- Capture only reviewed evidence. Keep admin identity, tenant/workspace/item IDs,
  tokens, raw logs and the internal project plan out of public material.
- Anything unverified here stays on the [submission checklist](SUBMISSION_CHECKLIST.md).
