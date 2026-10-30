# Reusable patterns

Zava Security is a **fictional company**; all data is synthetic. This project is meant to
be read as **a reusable Fabric Apps pattern for intelligent operational applications**, not
as a one-off Texas truck app. Below are the ten patterns it contains. Each states honestly
what exists, where, what to change, and what to watch for. A pattern is claimed only if it
is implemented or can be documented directly from the implementation.

Suitable for: fleet management, logistics, delivery operations, field service, utilities,
transportation, equipment and asset monitoring, public-safety operations, mobile
workforce management.

| # | Pattern | Status |
|---|---|---|
| 1 | Operational asset map | Implemented |
| 2 | Synthetic operational data | Implemented |
| 3 | Fabric SQL application backend | Implemented |
| 4 | Semantic model | Implemented |
| 5 | Fabric ontology | Implemented (preview; queries unverified) |
| 6 | Conversational operations | Implemented |
| 7 | Human alert workflow | Implemented as a tracked in-app workflow; **no real notification delivery** |
| 8 | Functions + secrets | Functions implemented; **Secret Store not exercised** |
| 9 | Observability | Implemented (owner session) |
| 10 | Parameterized deployment | **Not a template yet**; see the [parameterization map](#parameterization-map) |

## 1. Operational asset map
- **Problem:** Distributed assets need one geographic picture with status and exceptions.
- **Solution:** Statewide map with status-colored markers, an accessible roster, filters (region, status, attention, search), a computed exception briefing and a details panel.
- **Capabilities:** Rayfin authenticated reads; Fabric SSO; private hosting.
- **Implementation:** [fleet-map.tsx](packages/frontend/src/components/fleet-map.tsx), [fleet-controls.tsx](packages/frontend/src/components/fleet-controls.tsx), [lib/fleet.ts](packages/frontend/src/lib/fleet.ts).
- **Customize:** Status vocabulary (`STATUS`), the default bounds (`TEXAS`), the 15-minute stale rule, labels, basemap. Region centers and zoom come from data.
- **Reuse:** Vehicles, field workers, equipment, sensors, delivery drivers.
- **Limitations:** Markers near the same city overlap at statewide zoom; positions are not road routing; the basemap is public OpenStreetMap tiles.
- **Feedback:** Complete pagination matters even for small data (FB-011).

## 2. Synthetic operational data
- **Problem:** Prototypes need realistic data that is safe to share.
- **Solution:** A deterministic generator with a seed and an explicit scenario clock, validators, and a no-overwrite transactional loader.
- **Capabilities:** Rayfin schema; Fabric SQL; Lakehouse history tables.
- **Implementation:** [tools/synthetic.mjs](tools/synthetic.mjs), [tools/generate-data.mjs](tools/generate-data.mjs), [tools/seed-sql.mjs](tools/seed-sql.mjs).
- **Customize:** Regions, vocabularies, counts, scenario name and as-of time, seed.
- **Reuse:** Any operations scenario; keep the invented-people and no-real-facility rules.
- **Limitations:** Scenario-specific, not a general engine; reset workflows must preserve operator-created alerts and need separate design.
- **Feedback:** A supported authenticated seed and reset workflow would help (FB-009).

## 3. Fabric SQL application backend
- **Problem:** Operational apps need a governed relational store without hand-built APIs.
- **Solution:** Decorated TypeScript entities become tables, trusted foreign keys and an authenticated GraphQL API, with per-entity policies.
- **Capabilities:** Rayfin data model, Fabric SQL, GraphQL, claims-based policies.
- **Implementation:** [packages/data/src](packages/data/src), [rayfin.yml](rayfin/rayfin.yml), [rayfin-client.ts](packages/frontend/src/lib/rayfin-client.ts).
- **Customize:** Entities, fields, policies, dialect.
- **Reuse:** Any CRUD plus workflow application.
- **Limitations:** No `count()` on the fluent client; many-to-many needs a join entity; collection reads return one page unless paged (see the installed known-limitations guide).
- **Feedback:** Typed results omitted fields (FB-021); coordinate scale (FB-005); East US 2 provisioning worked (FB-004).

### Existing-SQL reuse: preflight before building an interface

- **Problem:** Another operational app needs to reuse an existing Fabric SQL source.
- **Tested solution:** In E-CONNECTOR-SQL, a disposable project discovered the approved
  database, declared a read-only connector, sampled one real synthetic Region row and
  discovered 12 tables after following the token-audience recovery hint.
- **Capabilities / implementation:** Category A SQL connector CLI; [helper](tools/connector-sql-experiment.mjs),
  [measured evidence](docs/evidence/connector-sql-experiment.json).
- **Customize:** Source identifiers, entity subset, auth mode and explicit operations.
  Keep the original application-owned schema separate; a connector is for reusing an
  existing source, not reprovisioning it.
- **Reuse:** Existing dispatch, inventory, utilities or field-service databases.
- **Limitations:** CLI probes use the developer's identity; an emitted application-auth
  setting is not proof the deployed app can access rows. Entity generation, policies,
  deployment and browser validation remain separate. Discovery included Users and
  storage metadata; select business entities deliberately rather than exposing all tables.
- **Feedback:** FB-037: clean JSON stdout, strict/explicit discovery readiness and clear
  headless token prerequisites. No frontend or live application was changed.

## 4. Semantic model
- **Problem:** Raw tables do not say what "needs attention" or "active alert" means.
- **Solution:** A Direct Lake model with friendly names, descriptions, hidden keys, one-way relationships, 17 explicit measures and a disconnected scenario clock; validated by comparing DAX with SQL.
- **Capabilities:** Semantic model REST definition APIs, OneLake, Direct Lake.
- **Implementation:** [fleet-semantics.mjs](tools/phase2/fleet-semantics.mjs), [semantic-model.mjs](tools/phase2/semantic-model.mjs), [validate-semantic-model.mjs](tools/phase2/validate-semantic-model.mjs).
- **Customize:** The `specs` and `measures` definitions.
- **Reuse:** Any operational schema that needs governed metrics for people and AI.
- **Limitations:** Reads the OneLake replica, which can lag direct SQL; the native canvas was not verified in the integrated browser.
- **Feedback:** FB-027, FB-028.

## 5. Fabric ontology
- **Problem:** AI and analysts need business relationships, not only tables.
- **Solution:** Entities (Vehicle, Region, Alert, Assignment, FleetEvent, ScenarioClock, TeamMember), seven relationships mapped to real foreign keys and six natural-language rules, bound directly to the SQL replica.
- **Capabilities:** Ontology generation-2 REST and TMDL definition (preview).
- **Implementation:** [ontology.mjs](tools/phase2/ontology.mjs).
- **Customize:** The `entities`, `relationships` and `rules` arrays.
- **Reuse:** Any domain with named entities and relationships.
- **Limitations:** Definition read-back verified; queries and agent consumption are not. Creation also provisioned graph, Eventhouse and KQL items.
- **Feedback:** FB-026, FB-029, FB-030.

## 6. Conversational operations
- **Problem:** Operators want answers without knowing the schema.
- **Solution:** A read-only published Data Agent with instructions that define active, stale, delayed and "needs attention", plus verified few-shot SQL; the app offers golden questions and shows an advisory warning.
- **Capabilities:** Data Agent, Lakehouse shortcuts, Functions.
- **Implementation:** [config/fleet-agent.json](config/fleet-agent.json), [fleet-agent.tsx](packages/frontend/src/components/fleet-agent.tsx), [tools/verify-agent.mjs](tools/verify-agent.mjs).
- **Customize:** Instructions, few-shot queries, golden questions.
- **Reuse:** Any operational dataset with unambiguous business definitions.
- **Limitations:** Generated answers can be wrong and must be checked against source; the agent cannot send or change anything.
- **Feedback:** FB-016, FB-019, FB-025, FB-031.

## 7. Human alert workflow
- **Problem:** An exception needs an owner and a record of what happened.
- **Solution:** Create, acknowledge and resolve with persisted, linked events; explicit partial-save detection and repair; fictional same-region recipients.
- **Capabilities:** Rayfin policies, claims, GraphQL mutations.
- **Implementation:** [alert-workspace.tsx](packages/frontend/src/components/alert-workspace.tsx), [alerts.service.ts](packages/frontend/src/services/alerts.service.ts), [docs/ALERTS.md](docs/ALERTS.md).
- **Customize:** Types, severities, statuses, recipients, policies.
- **Reuse:** Incident, ticket and dispatch workflows.
- **Limitations:** **It does not notify anyone.** No Teams, email or webhook; shared inbox; no assignee-only access; no transaction or tamper-proof audit guarantee.
- **Feedback:** A supported conditional mutation or outbox pattern would remove the repair code (FB-022).

## 8. Functions + secrets
- **Problem:** Trusted server-side calls must not expose credentials to the browser.
- **Solution (implemented):** A Function receives a platform-delivered Fabric token and calls the agent; the browser never sees it.
- **Solution (documented, not implemented):** For a third-party integration such as a chat webhook, store the URL with `rayfin secret set` and read it as `ctx.Secrets.NAME`, typed by the generated registry. This project's registry is empty because no secret was needed.
- **Implementation:** [function_app.ts](packages/functions/src/function_app.ts), [mcp.ts](packages/functions/src/mcp.ts), [secrets.generated.ts](packages/functions/src/secrets.generated.ts).
- **Customize:** The agent endpoint is a constant in `function_app.ts`; move it to configuration before reusing.
- **Reuse:** Any trusted proxy or integration.
- **Limitations:** Secrets were not exercised; the hardcoded endpoint is a reuse gap.
- **Feedback:** FB-017, FB-018, FB-020.

## 9. Observability
- **Problem:** Operators and builders need to know what failed and where.
- **Solution:** Native app Metrics, native Function invocation history, and content-free browser spans with safe request references.
- **Implementation:** [observability.ts](packages/frontend/src/lib/observability.ts), [function_app.ts](packages/functions/src/function_app.ts), [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).
- **Customize:** The operation names and outcome codes.
- **Reuse:** Any Rayfin app with a Function.
- **Limitations:** Console spans are not durable logs; consumer access, retention and latest-build correlation are unverified.
- **Feedback:** FB-023, FB-024.

## 10. Parameterized deployment
- **Problem:** Reusing a reference app for another customer should not mean editing code everywhere.
- **Status:** Local scaffolding tested in E-TEMPLATE; **not packaged as a share-ready or deployable fleet template**. Many values are data/configuration; others remain duplicated in code.
- **Capabilities / implementation:** Rayfin 1.36.2 local templates; [manifest](rayfin-template.yml), [experiment helper](tools/template-experiment.mjs), [measured evidence](docs/evidence/template-experiment.json).
- **Tested result:** Root package and Rayfin id/name changed; all three root README project-name tokens and the filename token worked in a fixture. Dependency pins, protected hosting and Fabric-enabled/password-disabled authentication survived. Business tokens, nested README and normal source contents stayed unchanged. The real app's branding and Function target therefore stayed unchanged.
- **Reuse:** A starting point for fleet, field-service, utilities or asset-monitoring templates after deliberate configuration and packaging.
- **Limitations:** `.gitignore` is not a template copy filter. Local deployment/environment files, target configuration, internal evidence and build output copied too. Outputs were never executed or deployed and were removed. Node 26 was outside the CLI's declared support; supported-runtime portability is untested.
- **Feedback:** FB-036 in [PRODUCT-FEEDBACK.md](PRODUCT-FEEDBACK.md): safe export controls and typed business parameters, not merely project renaming.

### Parameterization map

| Value | Where it lives today | Label |
|---|---|---|
| Design tokens, colors, fonts | `global.css`, `index.html` | [ALREADY PARAMETERIZED] |
| Regions, centers, zoom | `Regions` data from the generator | [ALREADY PARAMETERIZED] |
| Agent instructions and examples | [config/fleet-agent.json](config/fleet-agent.json) | [ALREADY PARAMETERIZED] |
| Semantic model names and measures | [fleet-semantics.mjs](tools/phase2/fleet-semantics.mjs) | [ALREADY PARAMETERIZED] |
| Ontology terminology | [ontology.mjs](tools/phase2/ontology.mjs) | [ALREADY PARAMETERIZED] |
| Workspace, capacity, item IDs for tools | [config/fabric-target.json](config/fabric-target.json) | [ALREADY PARAMETERIZED] |
| Organization name and app title | `index.html`, `App.tsx` strings | [EASY WIN TODAY] (one small constants module; not done, to avoid touching the working app) |
| Default map bounds | `TEXAS` constant in `fleet-map.tsx` | [EASY WIN TODAY] |
| Agent and workspace IDs inside the Function | `function_app.ts` constant | [FUTURE TEMPLATE IMPROVEMENT] (needs a Function redeploy) |
| Stale threshold (15 minutes) | Duplicated in `lib/fleet.ts`, agent instructions, a DAX measure and an ontology rule | [FUTURE TEMPLATE IMPROVEMENT] (single source of truth) |
| Status types and asset terminology | UI strings, entity enums, generator vocabulary, agent text | [FUTURE TEMPLATE IMPROVEMENT] |
| CLI project-name substitutions | Root package/Rayfin identity, root README tokens and filename token verified in E-TEMPLATE | [ALREADY PARAMETERIZED] (scaffold only) |
| User-defined template parameters | Custom organization/map and filename tokens remained unchanged in the tested 1.36.2 path; no parameter schema found in the inspected guide/CLI | [FUTURE TEMPLATE IMPROVEMENT] |

### Safe future template packaging (not executed)

Do not pass the working directory directly to another developer as a reusable template.

1. **Stage an explicit allowlist into a new directory:** reviewed workspace source,
   manifests/lockfile, required scripts, a template manifest and public documentation.
   Do not rely on `.gitignore` or assume a new project name creates a new environment.
2. **Exclude operational state:** deployment metadata, environment files, Function
   local settings, target configuration with actual identifiers, generated build/data
   output, internal planning and raw evidence. Let the CLI install its managed agent
   files rather than shipping an existing `mcpServers.rayfin` configuration.
3. **Supply reviewed placeholder configuration:** require the next builder to confirm
   their own source and target. Rebind the Function's agent/workspace endpoint and
   remove the old hosted redirect in the staged copy; retain protected hosting,
   Fabric SSO, password-disabled auth and dependency pins.
4. **Separate naming from business presets:** use the documented project-name tokens
   for identity. Organization, geography, terminology and thresholds still need an
   explicit application configuration contract; arbitrary mustache tokens do not
   implement it. Do not refactor the working demo to prove this today.
5. **Validate the staged export before sharing:** inspect its copy manifest and scan
   for private values and stale endpoints. Then scaffold on a supported Node runtime,
   install from the workspace root, typecheck/build/test, and verify authentication
   and persistence only against an explicitly approved separate target.

Today established those boundaries, not completion of this packaging work.
