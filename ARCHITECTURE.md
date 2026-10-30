# Architecture - Zava Security Texas Fleet Command

Zava Security is a **fictional company**; every record is synthetic. This is a reference
architecture for intelligent operational applications on Microsoft Fabric Apps (Rayfin),
not a production design. Claims here are limited to what was built and verified; see
[RAYFIN-FEATURES.md](RAYFIN-FEATURES.md) for evidence and [REUSABLE-PATTERNS.md](REUSABLE-PATTERNS.md)
for how to reuse it.

## Components

> **Operational dependency:** everything below runs on the PayGo F64 capacity
> `demodinoeast2` (East US 2). When the capacity is off, none of it can be viewed;
> the Hackathon owner needs to be nudged by the judges in order to turn it on.

```text
                    Private Fabric site (assetAccess: protected, Fabric SSO)
                                       |
              React + Vite app: map, roster, details, Ask the fleet, alert inbox
              |                                   |                            |
   GraphQL reads/writes                 askFabricDataAgent              browser operation spans
   (claims-based policies)              (Rayfin Function)               (content-free diagnostics)
              |                                   |
   Fabric SQL database              Published Fabric Data Agent (MCP)
   tx-fleet-command  ---OneLake replica--->  Lakehouse shortcuts (read-only)
              |
              |---OneLake replica---> Direct Lake semantic model "Texas Fleet Operations"
              '---SQL analytics endpoint---> Ontology "Fleet_Operations" (bindings)
```

| Layer | Capability | Location | Status |
|---|---|---|---|
| Hosting | Private (protected) static site; Fabric SSO; password auth off | [rayfin.yml](rayfin/rayfin.yml) | Verified |
| App | React/Vite, Leaflet map, accessible roster, filters, light and dark themes | [packages/frontend/src](packages/frontend/src) | Verified |
| Data | Decorated entities on Fabric SQL; GraphQL; 13 trusted foreign keys | [packages/data/src](packages/data/src) | Verified |
| Contracts | Browser-safe shared types and golden questions | [packages/shared/src](packages/shared/src/index.ts) | Verified |
| Function | `askFabricDataAgent` with platform Fabric token | [packages/functions/src](packages/functions/src) | Verified |
| AI | Published Data Agent over Lakehouse shortcuts | [config/fleet-agent.json](config/fleet-agent.json) | Verified, advisory |
| Semantics | Direct Lake model, 17 measures | [tools/phase2](tools/phase2/fleet-semantics.mjs) | Verified against SQL |
| Ontology | 7 entities, 7 relationships, 6 rules (preview) | [tools/phase2/ontology.mjs](tools/phase2/ontology.mjs) | Definition verified; queries not |
| Operations | Native Metrics, native Function history, browser spans | [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | Owner session |

## Data flows

1. **See (read path).** The browser reads every page of vehicles, assignments and alerts through authenticated GraphQL and renders the map, roster and KPIs. Loading, empty and error states are explicit; no substitute data is shown.
2. **Act (write path).** Creating an alert writes an `Alerts` row; a policy requires the creator subject to match the caller. Acknowledge and resolve update only workflow fields. Each step also writes a `FleetEvents` row. If the event write fails after the alert is saved, the UI reports a partial save and offers a repair that reuses the same request, so a reload cannot duplicate the alert.
3. **Ask (agent path).** The browser calls the Function, which obtains the platform-delivered Fabric token and talks to the published agent over MCP. Results return as typed answers or typed, retryable failures with a request reference. No key is stored; no prompt or answer is logged.
4. **Understand (analytical path).** The SQL database's OneLake replica feeds a Direct Lake semantic model with explicit measures (for example `Vehicles Needing Attention` as one uncapped union) and a disconnected scenario clock. The ontology binds the same entities and adds relationships and natural-language rules.
5. **Operate (observability path).** Native Metrics cover app usage and queries; native Function history persists invocation logs; the browser emits content-free start and completion spans for diagnosis.

## Time semantics

Telemetry is frozen at a **scenario clock** (2026-10-27 15:00 UTC, 10:00 AM Central), not
wall-clock time. Freshness, "stale" (older than 15 minutes) and "last hour" are always
computed against that clock. Alert actions carry their actual UTC time, so alert status is
current state, not a historical snapshot at the scenario time. This distinction is stated in
the agent instructions, the semantic model descriptions and the ontology rules.

## Trust boundaries and security

- **Signed-out visitors** see only the private-site gate. Hosting access does not weaken data or Function authorization.
- **Data access** requires an authenticated user; reference and telemetry entities are read-only through the API; alert creation checks the caller's subject.
- **The agent** is read-only, cannot send or change alerts, and is told to treat table text as data, never as instructions.
- **Identity columns** (subjects, actor) are excluded from the semantic model and ontology; free-text notes and platform tables are not modeled.
- **Secrets:** none are stored or required. The Function uses a platform-delivered token; the Secret Store was not exercised.

## Deliberately out of scope

Real notification delivery (Teams, email, webhooks), assignee-only access, realtime
positions, concurrent-operator guarantees, a tamper-proof audit trail, production
authorization, and ontology-backed queries or agent answers. The inbox is a shared,
tracked in-app workflow with fictional recipients.

## Where to look

| Question | Start here |
|---|---|
| How is the schema defined? | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) |
| How do alerts behave under failure? | [docs/ALERTS.md](docs/ALERTS.md) |
| How is the agent configured and checked? | [docs/DATA_AGENT.md](docs/DATA_AGENT.md) |
| What do the measures mean? | [docs/PHASE2_SEMANTIC_MODEL.md](docs/PHASE2_SEMANTIC_MODEL.md) |
| What does the ontology contain? | [docs/PHASE2_ONTOLOGY.md](docs/PHASE2_ONTOLOGY.md) |
| How do I run the demo? | [DEMO.md](DEMO.md) |
