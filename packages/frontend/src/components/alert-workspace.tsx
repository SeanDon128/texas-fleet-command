import { useEffect, useRef, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import type { AlertRecord, VehicleRecord } from '@rayfin-app/shared';
import { Button, FilterSelect } from '@/components/fleet-controls';
import { EmptyState, ErrorState, LoadingState } from '@/components/crud-states';
import { centralDate, centralTime } from '@/lib/fleet';
import { loadAlerts, type FleetSnapshot } from '@/services/fleet.service';
import {
  loadAlertContext, missingTimelineEvents, saveAlertAction,
  type AlertAction, type AlertContext,
} from '@/services/alerts.service';

type ContextState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; value: AlertContext };
type Notice = { kind: 'saved' | 'partial' | 'error'; message: string };
const inputClass = 'w-full rounded-md border border-input bg-background p-300 text-300 text-foreground disabled:opacity-60';
const severityOrder = { critical: 0, warning: 1, info: 2 };
const eventLabels: Record<string, string> = { alert_created: 'Created / shared inbox', alert_acknowledged: 'Acknowledged', alert_resolved: 'Resolved' };

export function AlertWorkspace({ fleet, vehicle, onSave, onRefresh }: {
  fleet: FleetSnapshot; vehicle?: VehicleRecord;
  onSave: (alert: AlertRecord) => void; onRefresh: (alerts: AlertRecord[]) => void;
}) {
  const [context, setContext] = useState<ContextState>({ kind: 'loading' });
  const [request, setRequest] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertRecord['type']>('operations');
  const [severity, setSeverity] = useState<AlertRecord['severity']>('warning');
  const [recipient, setRecipient] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string>();
  const [action, setAction] = useState<AlertAction | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [missing, setMissing] = useState(0);
  const busy = useRef(false);
  const alive = useRef(true);
  const outstandingCreate = useRef<string | null>(null);
  const outcome = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    loadAlertContext().then((value) => {
      if (active) setContext({ kind: 'ready', value });
    }).catch(() => {
      console.error('[alerts] Inbox context read failed. No record content logged.');
      if (active) setContext({ kind: 'error' });
    });
    return () => { active = false; };
  }, [request]);
  const selected = fleet.alerts.find((alert) => alert.id === selectedId);
  useEffect(() => {
    let active = true;
    const check = selected && context.kind === 'ready'
      ? missingTimelineEvents(selected, context.value.events) : Promise.resolve(0);
    check.then((count) => { if (active) setMissing(count); }).catch(() => {
      console.error('[alerts] Timeline completeness check failed.');
      if (active) setMissing(-1);
    });
    return () => { active = false; };
  }, [selected, context]);

  const run = async (next: AlertAction) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setAction(next);
    setNotice(null);
    if (next.kind === 'create') outstandingCreate.current = next.command.id;
    try {
      const result = await saveAlertAction(next);
      if (!alive.current) return;
      onSave(result.alert);
      setSelectedId(result.alert.id);
      setContext((previous) => previous.kind !== 'ready' ? previous : ({
        kind: 'ready',
        value: { ...previous.value, events: [
          ...previous.value.events.filter((event) => !result.events.some((saved) => saved.id === event.id)),
          ...result.events,
        ] },
      }));
      if (result.timelineComplete) {
        setAction(null);
        if (outstandingCreate.current === result.alert.id) {
          setMessage('');
          outstandingCreate.current = null;
        }
        setNotice({ kind: 'saved', message: `Alert saved as ${result.alert.status}; its recorded workflow events are synchronized. No external notification sent.` });
      } else {
        setAction({ kind: 'repair', alertId: result.alert.id });
        setNotice({ kind: 'partial', message: 'The alert is saved in Fabric SQL, but its timeline is incomplete. Repair the timeline; do not create the alert again. Recovery is also available after reloading.' });
      }
    } catch {
      console.error('[alerts] Workflow did not complete; retry retains the same request identifier.');
      if (alive.current) setNotice({ kind: 'error', message: 'The write could not be confirmed. Check your session and connection, then retry this same request. It checks the stored alert before writing; your message is retained.' });
    } finally {
      busy.current = false;
      if (alive.current) {
        setPending(false);
        outcome.current?.focus();
      }
    }
  };
  const refresh = async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const [alerts, value] = await Promise.all([loadAlerts(), loadAlertContext()]);
      if (alive.current) {
        onRefresh(alerts);
        setContext({ kind: 'ready', value });
        setNotice({ kind: 'saved', message: `Inbox refreshed from Fabric SQL. Map filters, selected vehicle and agent answer are preserved.${action ? ' The retained request still requires retry or timeline repair.' : ''}` });
      }
    } catch {
      console.error('[alerts] Inbox refresh failed; no replacement snapshot applied.');
      if (alive.current) setNotice({ kind: 'error', message: 'Refresh failed. The previously loaded inbox is still shown; it may be out of date. Retry refresh after checking your connection.' });
    } finally {
      busy.current = false;
      if (alive.current) setRefreshing(false);
    }
  };
  const members = context.kind === 'ready' ? context.value.members : [];
  const eligible = members.filter((member) => member.region_id === vehicle?.region_id);
  const assignedTo = eligible.some((member) => member.id === recipient) ? recipient : '';
  const locked = pending || refreshing || action !== null;
  const alerts = fleet.alerts.filter((alert) =>
    (statusFilter === 'all' || (statusFilter === 'active' ? alert.status !== 'resolved' : alert.status === statusFilter))
    && (recipientFilter === 'all' || alert.assignedTo_id === recipientFilter))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
  const timeline = context.kind === 'ready' && selected
    ? context.value.events.filter((event) => event.alert_id === selected.id)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id)) : [];
  return <section id="alert-workspace" aria-labelledby="alert-title" className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-start justify-between gap-300 border-b border-border p-400">
      <div className="flex gap-300">
        <Bell className="icon-size-400 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">Decide / assign / track</p>
          <h2 id="alert-title" tabIndex={-1} className="font-heading text-600 font-semibold">Shared alert inbox</h2>
          <p className="text-200 text-muted-foreground">Fictional recipients. All signed-in app operators share this inbox; assignments are not private.</p>
        </div>
      </div>
      <Button disabled={pending || refreshing} onClick={() => void refresh()} className="text-200">
        <RefreshCw className="icon-size-200" aria-hidden="true" />{refreshing ? 'Refreshing inbox...' : 'Refresh inbox'}
      </Button>
    </div>
    <div className="space-y-400 p-400">
      <p className="text-200 text-muted-foreground">Operator actions use actual action time, displayed in Central, separate from the frozen telemetry scenario. No email, Teams message, or real-person notification is sent. Refresh to see changes by other operators.</p>
      <div ref={outcome} tabIndex={-1}>
        {notice && <div role={notice.kind === 'saved' ? 'status' : 'alert'} className="space-y-200 rounded-lg border border-border bg-muted p-300 text-300">
          <p>{notice.message}</p>
          {action && <Button disabled={pending || refreshing} onClick={() => void run(action)}>
            {pending ? 'Saving...' : action.kind === 'repair' ? 'Repair timeline' : 'Retry same request'}
          </Button>}
          {notice.kind === 'error' && !action && <Button disabled={refreshing} onClick={() => void refresh()}>Retry inbox refresh</Button>}
        </div>}
      </div>
      {context.kind === 'loading' && <LoadingState />}
      {context.kind === 'error' && <ErrorState message="Fictional recipients and timeline could not be loaded. Alert actions are disabled; the map remains usable."
        onRetry={() => { setContext({ kind: 'loading' }); setRequest((value) => value + 1); }} />}
      {context.kind === 'ready' && <div className="grid items-start gap-500 xl:grid-cols-3">
        <form aria-label="Create synthetic alert" className="space-y-300" onSubmit={(event) => {
          event.preventDefault();
          if (!vehicle || !assignedTo || locked) return;
          void run({ kind: 'create', command: {
            id: crypto.randomUUID(), vehicleId: vehicle.id, recipientId: assignedTo, type, severity, message,
          } });
        }}>
          <h3 className="text-400 font-semibold">Create a synthetic alert</h3>
          <p className="rounded-md border border-border bg-muted p-300 text-300">
            {vehicle ? <><strong>{vehicle.vehicleCode}</strong> / {vehicle.callSign}</> : 'Select a vehicle on the map or roster to begin.'}
          </p>
          <fieldset disabled={locked || !vehicle} className="space-y-300">
            <label className="block space-y-100 text-200 font-semibold">Alert type
              <select aria-label="Alert type" value={type} onChange={(event) => {
                const next = event.target.value;
                if (next === 'delay' || next === 'telemetry' || next === 'health' || next === 'operations') setType(next);
              }} className={inputClass}>
                <option value="operations">Operations</option><option value="delay">Delay</option>
                <option value="telemetry">Telemetry</option><option value="health">Vehicle health</option>
              </select>
            </label>
            <label className="block space-y-100 text-200 font-semibold">Severity
              <select aria-label="Alert severity" value={severity} onChange={(event) => {
                const next = event.target.value;
                if (next === 'critical' || next === 'warning' || next === 'info') setSeverity(next);
              }} className={inputClass}>
                <option value="warning">Warning</option><option value="critical">Critical</option><option value="info">Information</option>
              </select>
            </label>
            <label className="block space-y-100 text-200 font-semibold">Fictional recipient (same region)
              <select aria-label="Fictional recipient" required value={assignedTo} onChange={(event) => setRecipient(event.target.value)} className={inputClass}>
                <option value="">Choose a demo recipient</option>
                {eligible.map((member) => <option key={member.id} value={member.id}>{member.displayName} / {member.role} (fictional)</option>)}
              </select>
            </label>
            {vehicle && eligible.length === 0 && <p role="status" className="text-200 text-warning">No fictional recipients are configured for this region.</p>}
            <label htmlFor="alert-message" className="block text-200 font-semibold">Synthetic operational message</label>
            <textarea id="alert-message" required maxLength={1000} rows={4} value={message}
              aria-describedby="alert-message-help" onChange={(event) => setMessage(event.target.value)} className={inputClass} />
            <p id="alert-message-help" className="text-200 text-muted-foreground">{message.length} / 1,000 characters. Invented details only; never enter real sensitive operational information.</p>
            <Button type="submit" disabled={!assignedTo || !message.trim()}
              className="border-primary bg-primary text-primary-foreground hover:bg-primary/90">Create in-app alert</Button>
          </fieldset>
          {pending && <p role="status" className="text-200">Saving alert and timeline to Fabric SQL...</p>}
          {action?.kind === 'create' && <p className="text-200 text-muted-foreground">Request retained for {fleet.vehicles.find((item) => item.id === action.command.vehicleId)?.vehicleCode}. Retry uses this same target and identifier, even if the map selection changes.</p>}
        </form>
        <div className="min-w-0 space-y-300 xl:col-span-2">
          <div className="flex flex-wrap gap-300">
            <FilterSelect label="Inbox status" value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'active', label: 'Active alerts' }, { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All alerts' },
            ]} />
            <FilterSelect label="Inbox recipient" value={recipientFilter} onChange={setRecipientFilter}
              options={[{ value: 'all', label: 'All fictional teammates' }, ...members.map((member) => ({ value: member.id, label: `${member.displayName} (fictional)` }))]} />
          </div>
          <p className="text-200 text-muted-foreground">{alerts.length} of {fleet.alerts.length} alerts / independent of map filters / critical first</p>
          {alerts.length === 0 ? <EmptyState title="No alerts match this inbox view." hint="Choose another status or fictional recipient, or create an alert for a selected vehicle." />
            : <ul aria-label="Alert queue" className="max-h-(--height-roster) space-y-200 overflow-auto">
              {alerts.map((alert) => <li key={alert.id}>
                <Button aria-pressed={selectedId === alert.id} onClick={() => setSelectedId(alert.id)}
                  className="w-full flex-col items-stretch gap-100 text-left text-200">
                  <span className="flex flex-wrap justify-between gap-200">
                    <strong className={alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}>
                      {fleet.vehicles.find((item) => item.id === alert.vehicle_id)?.vehicleCode} / {alert.severity.toUpperCase()}
                    </strong>
                    <span>{alert.status} / {alert.source === 'operator' ? 'operator-created' : 'seeded scenario'}</span>
                  </span>
                  <span className="break-words">{alert.message}</span>
                  <span className="text-muted-foreground">Assigned to {members.find((member) => member.id === alert.assignedTo_id)?.displayName ?? 'Unmapped demo recipient'} (fictional)</span>
                </Button>
              </li>)}
            </ul>}
          {selected ? <section aria-label="Selected alert timeline" className="space-y-300 rounded-lg border border-border bg-muted p-400">
            <div className="flex flex-wrap justify-between gap-300">
              <div>
                <h3 className="text-400 font-semibold">Alert timeline / {selected.status}</h3>
                <p className="text-200 text-muted-foreground">Record {selected.id.slice(0, 8)} / {selected.source === 'operator' ? 'actual action time' : 'seeded times use scenario clock; new actions use actual time'}</p>
              </div>
              <div className="flex flex-wrap items-start gap-200">
                {selected.status === 'open' && <Button disabled={locked} onClick={() => void run({ kind: 'acknowledge', alertId: selected.id })}>
                  <Check className="icon-size-200" aria-hidden="true" />Acknowledge alert
                </Button>}
                {selected.status === 'acknowledged' && <Button disabled={locked} onClick={() => void run({ kind: 'resolve', alertId: selected.id })}>Resolve alert</Button>}
              </div>
            </div>
            <p className="break-words text-300">{selected.message}</p>
            <p className="text-200">Created {centralDate(selected.createdAt)} / {centralTime(selected.createdAt)}</p>
            {missing !== 0 && <div role="alert" className="space-y-200 text-200 text-warning">
              <p>{missing < 0 ? 'Timeline completeness could not be checked.' : `${missing} workflow event(s) still need synchronization. The saved alert state is authoritative.`}</p>
              <Button disabled={locked} onClick={() => void run({ kind: 'repair', alertId: selected.id })}>Synchronize recorded events</Button>
            </div>}
            {timeline.length === 0 ? <p className="text-200 text-muted-foreground">No linked events were recorded. Historical seeded actions are not reconstructed or attributed to a real operator.</p>
              : <ol className="space-y-200 text-200">{timeline.map((event) => <li key={event.id} className="border-l border-border pl-300">
                <p className="font-semibold">{eventLabels[event.type] ?? event.type.replaceAll('_', ' ')}</p>
                <p>{centralDate(event.occurredAt)} / {centralTime(event.occurredAt)}</p>
                <p className="break-words text-muted-foreground">{event.detail}</p>
              </li>)}</ol>}
            <p className="text-200 text-muted-foreground">Actions record the signed-in operator&apos;s subject ID, not an action by the fictional assignee. Resolving an alert does not change vehicle health, delays or telemetry.</p>
          </section> : <p className="text-200 text-muted-foreground">Select an alert to inspect its recorded timeline and available next action.</p>}
        </div>
      </div>}
    </div>
  </section>;
}
