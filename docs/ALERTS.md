# Shared synthetic alert workflow

The internal milestone assigns a synthetic vehicle alert to an existing
fictional `TeamMember`. It is a **shared inbox**, not a real person's inbox:
all authenticated app operators can read and triage it. No email, Teams message,
webhook, or external notification is sent. Recipient identity mapping and
assignee-only authorization are not implemented.

## Demo flow

1. Select a map marker or roster row. Choose **Create an alert for this vehicle**.
2. Select type, severity, and a fictional recipient from that vehicle's region.
   Enter invented operational details only, up to 1,000 characters.
3. Choose **Create in-app alert**. The returned SQL record updates the map's
   active-alert counts, affected-vehicle badges, details, and shared queue.
4. Select the alert in the queue, then **Acknowledge alert**, then **Resolve alert**.
   Resolved alerts remain available using the inbox status filter.
5. Reload to prove persistence. **Refresh inbox** reads current alerts and
   timelines without resetting map filters, vehicle selection, or the agent panel.
   There is no background polling or realtime feed.

Resolving an alert changes the alert only. It does not repair telemetry, remove
a vehicle delay, or improve its health.

## Identity, permissions, and clocks

The typed Rayfin data client uses the authenticated app session. Creation
stamps `createdBySub` from `client.auth.getSession().user.id`; the create policy
checks this against `claims.sub`. Subjects are opaque strings, not presumed UUIDs.
No browser token bridge, direct browser SQL, or elevated-owner Function is used.

The Alert update permission includes only `status`, `acknowledgedAt`,
`acknowledgedBySub`, `resolvedAt`, and `resolvedBySub`. It does not permit rewriting
the vehicle, recipient, message, original creator, source, or severity.
FleetEvents remain readable/creatable, not API-updatable/deletable.

The scenario clock remains fixed for vehicle positions, stale-report calculations,
and agent questions about the scenario's last hour. **New operator actions use
actual action timestamps**, stored as UTC and displayed with date and Central
timezone. Those later events are intentionally outside the frozen scenario hour.
The inbox explains this distinction; no telemetry is advanced or made artificially
fresh. Seeded events retain their original scenario timestamps.

## Failure and retry semantics

Alert and FleetEvent writes are **two separate API writes, not a transaction**.
Generic optimistic CRUD rollback would falsely undo a confirmed alert when only
its event failed. The specialized lifecycle service therefore uses:

- A stable client-generated alert UUID retained while a request is unresolved.
  Retry reads that ID first, rather than automatically creating another record.
- A synchronous busy guard and disabled controls to prevent same-tab double-submit.
- Authoritative returned records: no temporary alert is counted as persisted.
- Explicitly selected lookup fields: in SDK 1.36.2 `findById` returns only `id`,
  despite the full entity return type. Update mutations select their input fields
  plus ID, not a complete entity; returned fields are merged into the selected
  persisted preflight row, never replaced with the outgoing patch.
- Optional acknowledgement timestamp/actor and resolution actor fields on Alert,
  saved together with each status update. The existing resolution timestamp is reused.
- Deterministic UUIDs for the three event kinds, derived from alert ID and event type.
  Retries read before creating; duplicate event commits are reconciled on the next retry.
- An explicit partial-save state when the alert is stored but its timeline is not.
  Input is retained until full confirmation. Missing events can be reconstructed
  from persisted alert metadata after a page reload, even by another app operator.
- No invented historical actor/timestamp for seeded actions without that metadata.
- A failed refresh keeps the prior view with an explicit stale-data warning.

This is a serialized prototype workflow, **not** a production concurrency or audit
guarantee. The installed typed client does not expose a documented multi-entity
transaction or compare-and-swap update. A read-before-write check is not atomic.
Concurrent operators can race on a status update; the frontend's ordered transitions
are not a server-enforced state machine. API callers can also set permitted audit
fields, and event actors are not an independently verified audit authority.
Before production, use a caller-authorized transactional endpoint with conditional
state/version checks, server timestamps/actor stamping, an outbox, and enforced
recipient authorization. Do not present this event timeline as tamper-proof.

## Files and validation

- [Alert entity](../packages/data/src/Alert.ts): additive nullable audit metadata and
  action-specific permissions.
- [Workflow service](../packages/frontend/src/services/alerts.service.ts): full
  paginated context reads, identity/reference checks, mutations and recovery.
- [Inbox UI](../packages/frontend/src/components/alert-workspace.tsx): scoped form,
  independent queue filters, state actions and linked timeline.
- [Workflow tests](../packages/frontend/src/services/alerts.service.spec.ts) and
  [UI tests](../packages/frontend/src/components/alert-workspace.spec.tsx).

The CRUD kit's loading/error/empty states are adapted to the existing fleet tokens.
Its generic optimistic mutation hook is deliberately not used for a two-record
workflow whose first write may already have committed.

## Hosted acceptance - October 28, 2026

Deployed to the existing protected `tx-fleet-command` in Trucks Rayfin /
demodinoeast2 / East US 2. Preview and deployment had no warnings; the existing
Function was excluded from deployment, not replaced. No new Fabric item was needed.

| Check | Observed outcome |
|---|---|
| Protected access and reads | Private sign-in gate appeared before app content; normal sign-in/session restoration loaded 120 vehicles and the original 25 active alerts |
| Create -> reload -> acknowledge -> reload -> resolve -> reload | Passed through the hosted UI. Independent SQL confirmed one alert, three distinct event types, matching action timestamps and consistent creator/action subjects |
| Live update of operating picture | A new warning on SYN-027 changed active alert count 25 -> 26 without changing affected vehicles (19); resolution restored the active count. Map details used the saved record |
| Partial save | Browser-only interception returned HTTP 503 for `createFleetEvent`. One alert persisted; no event was fabricated, draft stayed visible and the UI explicitly reported a partial save |
| Recovery after reload | Reload discarded tab-local operation state; selecting the stored alert exposed one missing event. Keyboard synchronization created that event using the original action metadata, with no second alert |
| Creator policy | A browser-only modified create request used a different `createdBySub`; the API returned GraphQL `BadRequest` / `Could not insert row with given values.` and SQL confirmed zero matching rows. Removing interception and retrying the retained request created one valid alert |
| Immutable-field update | Adding a message edit to an acknowledgement request returned GraphQL `Forbidden` / `Unauthorized due to one or more fields in this mutation.` The message/status remained unchanged until an unmodified retry successfully acknowledged it |
| Keyboard, filters and theme | Keyboard acknowledgement, resolution, recovery and theme activation worked. Inbox refresh preserved a selected vehicle and HOU filter; a separate run preserved an existing agent answer |
| Layout | Desktop at 1400px and light/dark mobile at 390px had no horizontal page overflow; all form controls remained within the viewport |
| Existing Data Agent | A fresh regional-summary invocation still worked through the unchanged Function. Eight vehicle totals and eight delayed counts matched SQL |
| Clean runtime | Final clean reload/interactions reported zero page errors, alert-console errors or failed app-origin requests; deliberate outage/policy-test errors are excluded |
| Test cleanup | One transaction validated exact IDs/messages/source/status before deleting only three temporary alerts and six linked events. API delete permission was not added |
| Original data | Fresh exact-seed verification passed all 3,583 operational rows and 13 enabled/trusted foreign keys; Lakehouse SQL verified all 3,840 history rows |

Static gates passed: typecheck, build, lint, 101 frontend tests (13 files),
116 data/schema tests, 18 MCP transport tests and Functions validation. Unit tests
also cover same-tab double-submit prevention, lost mutation responses, repeated
status requests, partial update projections and timeline-ID conflicts.

The UI intentionally offers no delete action. Future temporary verification-row
cleanup must likewise target only explicitly recorded test IDs using approved
owner tooling, without granting app users delete permission.

The browser screenshot tool rendered the inbox correctly for visual review.
Saving a native Playwright screenshot after viewport changes produced a clipped
image; it was discarded rather than represented as submission evidence. Capture
desktop/mobile form and an operator-created timeline in normal Edge for packaging.
A prior app bundle later rendered in the actual Fabric host in the owner session.
The hardened release's embedding, stale/different-user session replacement and a
real second user remain unverified; none is inferred from the checks above.

### Hardening-release follow-up

The subsequent observability release passed **112 frontend tests across 14
files**, 116 data/schema tests, 18 MCP transport tests, typecheck, build, lint
and Functions validation. It deployed to the same protected application without
replacing the existing Function or reseeding data.

One additional temporary alert was used for hosted acceptance. An actual
Chromium `net::ERR_NETWORK_IO_SUSPENDED` interruption initially prevented a
confirmed save. A same-request retry stored **one alert and zero events**;
the UI retained the request and browser diagnostics explicitly reported
`partial / timeline_incomplete`. This was not an injected service outage and
is not proof of a Fabric outage.

After reload, synchronization repaired the missing creation event from the
alert's saved metadata. Acknowledge -> reload -> resolve -> reload then passed.
Independent SQL verified all three event kinds, each actor and each original
action timestamp. Safe browser spans recorded repair, acknowledgement and
resolution without alert text, record IDs or actor identity. One automation
timeout used the wrong label: the creation event is **Created / shared inbox**,
not "Alert created"; this was not an application defect.

A guarded transaction removed only this exact temporary alert and its three
linked events. This is separate from the earlier milestone's three-alert,
six-event cleanup. Exact verification again passed the original **3,583
operational rows**, **13 trusted/enabled foreign keys** and **3,840 history
rows**. Do not repeat this cleanup or delete future operator records to make
the fixture counts match.

`npm run data:verify` is the original exact-seed verifier. It must not be used to
erase legitimate operator records or roll back alert actions to match fixed fixture
counts. Use the live application and independent targeted SQL reads for this milestone.
