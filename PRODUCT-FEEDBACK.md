# Product feedback for the Rayfin / Fabric Apps team

Specific, evidence-backed feedback from building **Zava Security Texas Fleet Command**
(a fictional company; entirely synthetic data) on Microsoft Fabric Apps (Rayfin) 1.36.2
in an East US 2 capacity. Each item below links to a full entry in the
[evidence ledger](FEEDBACK-LOG.md) (FB-001 onward), which records the scenario,
expected versus actual behavior, setup steps, errors, workaround, severity and
evidence. Nothing here is invented: where something was not tested, it says so.

Severity scale (from the ledger): **S0** core demo blocked, **S1** feature blocked,
**S2** recoverable friction, **S3** documentation or polish, **Positive** behavior worth preserving.

**Reconciled 2026-10-30:** 37 ledger entries and six intentional experiments.
Entries record incidents and successes, **not 37 unresolved bugs**. Severity describes
the observed incident; a workaround or later success does not erase the original
learning. The working app remains separate from the experimental agents and scratch
projects. This update adds no experiment, deployment or new feedback ID.

## The ten asks that would help most

| # | Area | What happened (evidence) | Specific ask | Sev | Ledger |
|---|---|---|---|---|---|
| 1 | Data Agent answers | Minimal semantic-agent instructions scored 5/8 against the existing agent's 7/8; Q1 said 41 where DAX truth was 54. Repeats varied. Tuned Run B scored 7 full and 1 partial, but followed the failures. Exact generated query/measure was not visible | Show query/measure provenance and source freshness, clarify how model metadata steers answers, and offer golden-question evaluation with repeat variance and held-out cases | S1, S2 | FB-019, FB-025, FB-034 |
| 2 | Typed data client | Typed lookup and mutation results omitted entity fields at runtime; projections recovered the working alert lifecycle | Add typed result selection to convenience lookups and mutations, or return an accurately typed field projection | S1, recovered | FB-021 |
| 3 | Ontology agent context | Creation and canvas now work, but context Add failed on Standard and Preview with an access-only hint. No ontology-backed questions were asked; root cause remains unknown | Preflight context export, permissions and source-binding eligibility; identify the failing stage and a safe correlation ID | S1 for attachment | FB-026, FB-029, FB-035 |
| 4 | Reusable template export | Two local scaffolds worked, but custom business tokens stayed unresolved and Git-ignored environment/deployment files copied too. No output was shared | Add an export/copy preview, explicit include/exclude controls, target-state warnings and typed business parameters | S2 | FB-036 |
| 5 | SQL connector automation | Read-only inspection worked and audience recovery produced metadata for 12 tables. Both adds emitted debug/root messages before JSON; initial add exited zero while nested discovery failed | Keep JSON stdout pure; expose strict or explicit schema readiness and preflight audience requirements before schema-dependent writes | S2 | FB-037 |
| 6 | Token and scope diagnostics | Semantic connector invoke returned 401 with a Viewer-access hint for an Admin. Missing consented scope is suspected, not proven; the same token worked through separate REST validation | Report granted/required scopes and a safe request ID; explain the consent path and the headless alternative. Preserve SQL's accurate, successful audience-recovery hint | S1, plus SQL positive | FB-008, FB-033, FB-037 |
| 7 | Native observability | Metrics populated, but rate aggregation/window bounds remain unclear; persisted Function history was useful but hard to find and used a different invocation ID | Expose exact bounds and rate inputs/weighting; link invocation history from app management and document safe request correlation | S2 | FB-023, FB-024 |
| 8 | Embedded host | The Fabric portal's embedded view stayed at workload bootstrap or blank with no timeout message, so the latest build's embedded handoff stayed unverified; the native model canvas failed on a CORS origin mismatch in the integrated browser | Time out workload bootstrap with an actionable message and a direct hosted-app link | S2 | FB-014, FB-028 |
| 9 | Data Agent sources | The SQL database item could not be an agent source, so a Lakehouse with OneLake shortcuts bridged it, and a later definition round trip renamed the datasource folder | Allow the SQL database directly or surface the bridge and its readiness; document definition normalization or offer a partial update | S2, S3 | FB-016, FB-031 |
| 10 | Catalog discovery | Search found all 12 workspace items but returned no lineage; four shared a display name and initially had empty descriptions | Populate descriptions from `rayfin.yml`, name/link child items distinctly and expose solution relationships in discovery | S3 | FB-032 |

Further evidence-backed asks remain in the ledger:

- **Resource lifecycle:** preview the GraphModel, Eventhouse and KQL database
  associated with ontology creation and explain consumption/cleanup; no graph refresh
  was requested (FB-030).
- **Setup and docs:** protocol/timeout guidance (FB-017, FB-018), unreadable cache
  and keychain failure (FB-010), scaffold option placement and Windows initialization
  (FB-001, FB-002, FB-003).
- **Operational data:** distinguish Delta load from SQL readiness (FB-006), clarify
  coordinate scale (FB-005), and support transaction/outbox recovery for partial
  alert/event commits (FB-022).
- **Testing:** diagnose intermittent test-worker startup failures (FB-015).

## What worked especially well

- **Code-first provisioning in East US 2:** decorated TypeScript entities produced a Fabric SQL database with 13 trusted foreign keys, then verified reads and writes (FB-004).
- **Private hosting and Fabric SSO:** the signed-out gate shows no app content, and brokered sign-in restored sessions after reload (FB-012, FB-013).
- **Functions with platform-delivered Fabric token:** the Data Agent call needed no stored secret (FB-020).
- **Definition APIs are real infrastructure-as-code:** the semantic model, ontology and Data Agent each round-tripped through get and update definition, which made a safe, reviewable text-only change possible hours before judging (FB-027, FB-029, FB-031). A second Data Agent over the semantic model was created and read back on the first attempt (FB-034).
- **Connector discovery:** one command found three connectable sources in under five seconds and printed a ready-to-run add command (FB-033).
- **Local template scaffolding:** two isolated scenarios renamed project identity, preserved dependency pins and protected authentication, and synchronized agent files without an install; business parameterization and safe packaging remain separate work (FB-036).
- **SQL connector preflight:** read-only source inspection returned a real synthetic row without deployment; schema discovery recovered by following the precise token-audience hint and found 12 tables (FB-037). This proves developer-identity source access, not deployed app access.
- **Native Metrics and Function history are genuinely useful** once found (FB-023, FB-024).

## The journey: SQL database -> semantic model -> ontology -> Data Agent

Could a Fabric customer discover and complete it without insider knowledge? **Not
yet, from what we observed.** It crossed four separate experiences, each with its own
vocabulary and prerequisites:

1. **Rayfin and Fabric SQL** created the operational data and its OneLake replica.
2. **Semantic model** creation from OneLake table URLs worked through the REST API in one call; the native modeling canvas did not render in the integrated browser (FB-027, FB-028).
3. **Ontology** needed a tenant preview setting and created extra graph infrastructure. Its native canvas now renders, but context attachment to the experimental agent failed on both Standard and Preview; no ontology-backed answers were tested (FB-026, FB-029, FB-030, FB-035).
4. **Data Agent** could not use the SQL database directly and needed a Lakehouse bridge (FB-016). A second model-grounded agent created cleanly, but three Run A answers failed the governed checks; answers improved after definitions were restated in tuned instructions (FB-034). Exact query/measure selection was not visible. "Needs attention" now has definitions in four places: model, ontology, agent instructions and app code.

Terminology that needed translation: Direct Lake on OneLake, SQL analytics endpoint,
semantic model versus ontology, "generation 2", GraphModel, Eventhouse. A single guided
path with a readiness view per stage would remove most of the context switches.

## Experiments run to generate feedback on purpose

| ID | Real result and boundary | Ledger | Evidence |
|---|---|---|---|
| E-CATALOG | **Partial:** 12 workspace items discovered; search returned no lineage. Duplicate names and initial empty descriptions hinder reuse | FB-032 | [Search observations](docs/evidence/experiments-2026-10-30.json) |
| E-CONNECTOR | **Partial:** semantic-model search/add worked; invoke blocked by HTTP 401. Scope cause unproven | FB-033 | [Timings and request IDs](docs/evidence/experiments-2026-10-30.json) |
| E-AGENT-SEMANTIC | **Minimal-instruction hypothesis refuted:** manual 5/8 versus existing 7/8; repeated answers varied. Tuned 7 full/1 partial is not an independent benchmark; exact query/measure unknown | FB-034 | [Ground truth](fabric/phase2/semantic-agent/ground-truth.json), [answers](fabric/phase2/semantic-agent) |
| E-AGENT-ONTOLOGY | **Blocked at attachment:** Standard and Preview failed. Canvas/discovery worked; zero ontology-backed questions, hypothesis **not evaluated** | FB-035 | [Observed attempts and limits](fabric/phase2/ontology-agent/observations.json), [notifications](fabric/phase2/ontology-agent/portal-add-errors.png) |
| E-TEMPLATE | **Local scaffolding confirmed:** naming works; business tokens/state copy unchanged. Not a second working app or safe distributable template | FB-036 | [Two scaffold scenarios](docs/evidence/template-experiment.json) |
| E-CONNECTOR-SQL | **Developer-identity preflight confirmed after recovery:** one synthetic row/eight typed columns and metadata for 12 SQL tables. No deployed app integration | FB-037 | [Commands, sample and recovery](docs/evidence/connector-sql-experiment.json) |

Structured records of the six completed experiments (including blocked outcomes) are in
[docs/evidence/experiments-2026-10-30.json](docs/evidence/experiments-2026-10-30.json).
Hypotheses and results are in [RAYFIN-FEATURES.md](RAYFIN-FEATURES.md#completed-experiment-results).
The app's published agent was not replaced. Local template and SQL preflight ran
on Node 26 outside declared Node 20/22/24 support; portability remains untested.
No new runtime checks were run for this documentation reconciliation.

## Template reuse: tested boundaries, not one-click readiness

E-TEMPLATE confirmed the installed guide's three **root README** project-name
placeholders and the `__projectName__` filename substitution. Custom organization/map
tokens, nested README tokens and ordinary source contents were unchanged. Renaming
the current app did not rebrand it or retarget its Function.

The more important packaging finding: `.gitignore` is not a template copy filter.
The copy retained deployment state, local environment/settings files, approved-target
configuration, build output and internal evidence. The synthetic fixture independently
confirmed this without using real credentials. **No output was shared or deployed.**
Ask: offer an export preview, explicit copy controls and target/environment-file
warnings, plus a typed business-parameter schema. See **FB-036** and the
[measured results](docs/evidence/template-experiment.json).

Both scaffolds preserved authentication and dependency declarations. Node 26 was
outside the CLI's declared Node 20/22/24 ranges; no supported-runtime portability,
dependency installation, generated-app build or second deployment was tested.

## Capture template for new feedback

Copy a ledger entry from [FEEDBACK-LOG.md](FEEDBACK-LOG.md): feature and availability,
scenario, expected, actual, setup steps and discoverability, documentation quality,
errors, workaround, time lost, what worked, enterprise impact, severity, suggested
product fix, suggested documentation fix, and the specific evidence (request ID,
operation ID, timestamp, file). Do not record tokens, credentials or raw logs.
