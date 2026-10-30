# Demo - Zava Security Texas Fleet Command

**About 7.5 minutes.** Zava Security is a **fictional company**; everything shown is invented
and the clock is frozen at a scenario time, so this is not live GPS. For recovery rules and
wording limits use the [runbook](docs/DEMO_RUNBOOK.md); for a longer 15-minute version use the
[script](docs/DEMO_SCRIPT_15MIN.md).

The judges should leave understanding: **this is more than a fleet demo. It is a reusable
pattern for building intelligent operational applications on Fabric.**

> **PayGo capacity notice.** The F64 capacity `demodinoeast2` (East US 2) is a
> **PayGo** capacity and **must be turned on to view any content** (the app, Data
> Agent, semantic model and ontology). **The Hackathon owner needs to be nudged by
> the judges in order to turn it on.** Turn it off again afterward to stop billing.

## Preflight (do this first, 20 minutes before)

1. **Confirm the PayGo Fabric capacity is turned on.** `demodinoeast2` (F64, East US 2) was confirmed **Active** during the recorded October 30 SQL-connector preflight; it may be paused afterward. Recheck before judging and turn it on if needed. It bills while running, so turn it off after judging. If judges are reviewing without you, they must nudge the Hackathon owner to turn it on first.
2. Open the protected app in your normal browser, sign in, and **wait for the map** (the map loads after the roster; markers can lag a few seconds). Expect 120 roster rows and 120 markers.
3. Read the live KPI cards aloud to yourself. Original baseline: 120 vehicles, 16 delayed (nine in Houston), 10 stale. Active alert counts change as people use the inbox (27 across 21 vehicles with 5 critical at the last check); say what you see, never a memorized number.
4. Ask the Houston question once yourself and compare with the map. Expect Houston with **nine** delayed vehicles. Do not rehearse by creating extra alerts.
5. Pre-open a second tab on **Trucks Rayfin** in Fabric with the semantic model and ontology items visible. Pre-open Manage app -> Metrics (Last 24 hours) if it loads for you; otherwise use a labeled **Recorded** screenshot.
6. Do not show account menus, tenant or workspace IDs, tokens or raw logs.

## The story

| # | Beat | Time | Show | Say |
|---|---|---|---|---|
| 1 | **Problem** | 0:30 | Header and synthetic disclaimer | "Zava Security, a fictional company, needs one operating picture across a distributed Texas fleet. Everything here is invented." |
| 2 | **Application** | 0:45 | App overview; optionally a signed-out window showing the private gate | "A Fabric App on Rayfin. Signed-out visitors see only a sign-in gate; the data and agent are behind Fabric SSO." (cut the gate first if short) |
| 3 | **Operational intelligence** | 1:00 | KPI cards, Houston briefing -> **Investigate HOU**, select SYN-027 | "The map shows where the exceptions are. Houston has nine of the delayed vehicles. SYN-027 is 38 minutes late with two active alerts." |
| 4 | **Action** | 1:15 | Create an alert on SYN-027 to a fictional recipient, acknowledge, resolve, reload | "The alert is tracked and persisted with linked events and survives a reload. It does not notify a real person; that is future work." |
| 5 | **Semantic intelligence** | 1:00 | Fabric: `Texas Fleet Operations` model and `Fleet_Operations` ontology | "The same operational data becomes governed measures and a business vocabulary. 'Needs attention' is one uncapped definition: 54 of 120. We verified six DAX answer sets against SQL." |
| 6 | **AI** | 1:00 | **Ask the fleet** -> "Which Texas region has the most delayed vehicles?" | "Plain language over the same data. It is advisory; we check it against the map and source." |
| 7 | **Rayfin** | 0:45 | Native Metrics or recorded snapshot; mention Function history | "What made this possible: private sites, Fabric SSO, code-first data in East US 2, a Function with a platform token, native Metrics and Function logs, and the new semantic model and ontology items." |
| 8 | **Reusability** | 0:30 | [REUSABLE-PATTERNS.md](REUSABLE-PATTERNS.md) parameterization map | "Ten patterns for logistics, utilities or field service. We tested local template scaffolding: project naming works, but safe export and business configuration still need packaging. We document exactly what must change; this is not a one-click template." |
| 9 | **Product learning** | 0:45 | [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md) table | Three insights, below |

### Three product insights to land (beat 9)

1. **Answers need provenance.** The minimal-instruction semantic agent scored 5/8 against the existing agent's 7/8, including 41 where the model truth was 54. Repeats varied. Tuned instructions improved the results but were written after seeing failures. Ask: show the query/measure and freshness with each answer, and support held-out evaluation (FB-019, FB-025, FB-034). We did not observe the exact query or measure selected.
2. **Typed results hid fields.** Typed lookups and mutations omitted entity fields at runtime, which blocked the alert lifecycle until projections were used. Ask: typed result selection (FB-021).
3. **Errors should identify the failing prerequisite.** A connector 401 pointed a workspace Admin toward Viewer access (FB-033). Adding an accessible ontology as agent context failed on both Standard and Preview with only "Check that you can access this ontology" (FB-035). Ask: distinguish consent, context export, source eligibility and service failures; show a safe diagnostic ID. *(Alternative: creating an ontology also provisioned graph, Eventhouse and KQL items nobody requested, FB-030.)*

If asked about the newest CLI experiments, use recorded evidence rather than a live
retry: **FB-036** proves project naming but exposes unsafe raw-tree packaging;
**FB-037** proves one-row SQL source inspection and working audience recovery, while
identifying mixed JSON stdout. Neither is a deployed app integration.

## If something fails

| Problem | Do this | Do not |
|---|---|---|
| Map or data will not load | Check the capacity first; then reload once | Show substitute data |
| Agent is slow (latency varies) | Say "this runs a real query"; use the roster while waiting | Treat an earlier observed latency range as a guaranteed upper bound, or show a canned answer |
| Agent answer disagrees with the map | Say so, explain it is advisory, show the source check | Edit or defend the answer |
| Agent says there are 0 trucks | Show the source fleet and rephrase with "vehicles"; disclose the recorded wording-sensitive failure (FB-034) | Pretend the fleet is empty or claim to know the unseen query/filter that caused it |
| Fabric model canvas will not render | Show the item list and [validation.json](fabric/phase2/semantic-model/validation.json) | Imply a screenshot is a live canvas |
| Metrics tab will not load | Use a labeled **Recorded** screenshot | Present it as live |

## Claims to avoid

Real notification delivery; realtime positions; that the agent is accurate or certified;
that a semantic-model agent beats the Lakehouse agent (untuned 5/8 versus 7/8;
tuned 7 full/1 partial was not a held-out test, FB-034);
that ontology queries or ontology-backed agent answers work (definition and canvas
are verified, context attachment was blocked); Secret Store, connector or template use in the app; embedded-in-portal
acceptance of the latest build; second-user permissions; measured time savings or ROI;
anything implying a real company.

## Evidence to have ready

- [Overview screenshot](docs/evidence/zava-fleet-command-overview.png) and [Ask the fleet and inbox](docs/evidence/zava-ask-the-fleet-and-inbox.png) (retake in your normal Edge window for the final package; the integrated browser leaves blank space below)
- [Semantic model validation](fabric/phase2/semantic-model/validation.json) and [ontology receipt](fabric/phase2/ontology/receipt.json)
- [Experiment records](docs/evidence/experiments-2026-10-30.json) and the [feedback ledger](FEEDBACK-LOG.md)
- [Local template experiment](docs/evidence/template-experiment.json): measured copying/substitution and isolation checks, not a second working deployment (FB-036)
- [SQL connector experiment](docs/evidence/connector-sql-experiment.json): one real synthetic Region row, 12 discovered tables and a working token-audience recovery; CLI evidence only, not a new app integration (FB-037)
- [Features and evidence map](RAYFIN-FEATURES.md)
