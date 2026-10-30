import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Primitive } from '@radix-ui/react-primitive';
import { AlertTriangle, ArrowRight, Clock3, MapPin, Moon, Radio, RefreshCw, Search, Sun, Truck, X } from 'lucide-react';
import type { AlertRecord, VehicleRecord } from '@rayfin-app/shared';
import { Button, FilterSelect } from '@/components/fleet-controls';
import { FleetAgent } from '@/components/fleet-agent';
import { AlertWorkspace } from '@/components/alert-workspace';
import { useTheme } from '@/hooks/theme.context';
import { activeAlerts, centralDate, centralTime, EMPTY_FILTERS, filterVehicles, isStale, reportAge, STATUS, summarizeFleet, type FleetFilters } from '@/lib/fleet';
import { loadFleet, type FleetSnapshot } from '@/services/fleet.service';

const FleetMap = lazy(() => import('@/components/fleet-map'));

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; fleet: FleetSnapshot };

function VehicleDetails({ vehicle, fleet, onClose }: {
  vehicle: VehicleRecord; fleet: FleetSnapshot; onClose: () => void;
}) {
  const assignment = fleet.assignments.find((item) => item.vehicle_id === vehicle.id);
  const crew = fleet.crews.find((item) => item.id === vehicle.crew_id);
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const alerts = activeAlerts(fleet).filter((alert) => alert.vehicle_id === vehicle.id)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const age = reportAge(vehicle, fleet.clock.asOf);
  return <section aria-label={`Vehicle details for ${vehicle.vehicleCode}`} className="border-t border-border bg-card p-400 xl:border-l xl:border-t-0">
    <div className="mb-400 flex items-start justify-between gap-200">
      <div>
        <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">Vehicle inspection</p>
        <h2 className="font-heading text-600 font-bold">{vehicle.vehicleCode}</h2>
        <p className="text-300 text-muted-foreground">{vehicle.callSign}</p>
      </div>
      <Button aria-label="Close vehicle details" onClick={onClose}><X className="icon-size-200" /></Button>
    </div>
    <p className={`mb-400 text-300 font-semibold ${STATUS[vehicle.status].color}`}>{STATUS[vehicle.status].label}</p>
    <dl className="grid grid-cols-2 gap-400 text-200">
      {[
        ['Region', fleet.regions.find((region) => region.id === vehicle.region_id)?.name],
        ['Speed', `${vehicle.speedMph} mph`],
        ['Health', vehicle.healthStatus.replaceAll('_', ' ')],
        [vehicle.energyType === 'electric' ? 'Battery' : 'Fuel', `${vehicle.energyPct}%`],
        ['Last report', centralTime(vehicle.lastTelemetryAt)],
        ['Report age', `${age} min${isStale(vehicle, fleet.clock.asOf) ? ' / stale' : ''}`],
        ['Delay', vehicle.delayStatus === 'delayed' ? `${vehicle.delayMinutes} min delayed` : vehicle.delayStatus.replaceAll('_', ' ')],
        ['Fictional crew', crew?.crewCode],
      ].map(([label, value]) => <div key={label}>
        <dt className="mb-100 text-muted-foreground">{label}</dt>
        <dd className="font-semibold">{value}</dd>
      </div>)}
    </dl>
    {assignment && <section className="my-400 rounded-lg border border-border bg-muted p-300" aria-label="Current assignment">
      <h3 className="mb-200 text-200 font-semibold uppercase tracking-wide text-muted-foreground">Fictional assignment</h3>
      <p className="text-300 font-semibold">{assignment.routeCode}</p>
      <p className="text-200">{assignment.destinationName}</p>
      <div className="mt-300 flex flex-col gap-100 text-200">
        <span>Scheduled <strong>{centralTime(assignment.scheduledArrival)}</strong></span>
        <span>ETA <strong>{centralTime(assignment.estimatedArrival)}</strong></span>
      </div>
    </section>}
    <h3 className="mb-200 text-300 font-semibold">Active alerts ({alerts.length})</h3>
    {alerts.length === 0 ? <p className="text-200 text-muted-foreground">No active alerts for this vehicle.</p>
      : <ul className="space-y-200">
        {alerts.map((alert) => <li key={alert.id} className="rounded-md border border-warning-border bg-warning-surface p-300 text-200">
          <p className={alert.severity === 'critical' ? 'font-bold text-destructive' : 'font-bold text-warning'}>
            {alert.severity.toUpperCase()} / {alert.status}
          </p>
          <p className="mt-100 text-warning">{alert.message}</p>
        </li>)}
      </ul>}
    <p className="mt-400 border-t border-border pt-300 font-monospace text-200 text-muted-foreground">
      {vehicle.lat.toFixed(5)}, {vehicle.lng.toFixed(5)}<br />Fictional positions; not road routing.
    </p>
    <a href="#alert-workspace" onClick={() => document.getElementById('alert-title')?.focus()}
      className="mt-300 inline-block rounded-md border border-primary px-300 py-200 text-300 font-semibold text-primary hover:bg-accent">Create an alert for this vehicle</a>
  </section>;
}

function FleetWorkspace({ fleet, onSave, onRefresh }: {
  fleet: FleetSnapshot; onSave: (alert: AlertRecord) => void; onRefresh: (alerts: AlertRecord[]) => void;
}) {
  const [filters, setFilters] = useState<FleetFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string>();
  const [reset, setReset] = useState(0);
  const detailAnchor = useRef<HTMLDivElement>(null);
  const vehicles = filterVehicles(fleet, filters);
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
  useEffect(() => {
    if (selected && window.matchMedia('(max-width: 1279px)').matches) {
      detailAnchor.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [selected]);
  const summary = summarizeFleet(fleet, vehicles);
  const global = summarizeFleet(fleet, fleet.vehicles);
  const region = fleet.regions.find((item) => item.id === filters.region);
  const mostDelayed = fleet.regions.map((item) => ({
    ...item, delayed: fleet.vehicles.filter((vehicle) => vehicle.region_id === item.id && vehicle.delayStatus === 'delayed').length,
  })).sort((a, b) => b.delayed - a.delayed || a.code.localeCompare(b.code))[0];
  const setFilter = (key: keyof FleetFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedId(undefined);
  };
  const selectVehicle = (id: string) => {
    setSelectedId(id);
  };
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSelectedId(undefined);
    setReset((value) => value + 1);
  };
  const alertIds = new Set(activeAlerts(fleet).map((alert) => alert.vehicle_id));

  return <>
    <section aria-label="Operational summary for filtered vehicles" className="grid grid-cols-2 gap-300 md:grid-cols-4">
      {[
        { label: 'Vehicles in view', value: summary.total, detail: `${fleet.vehicles.length} total in Fabric`, icon: Truck },
        { label: 'Delayed vehicles', value: summary.delayed, detail: `${summary.moving} vehicles en route`, icon: Clock3 },
        { label: 'Active alerts', value: summary.alerts, detail: `${summary.affected} vehicles / ${summary.critical} critical alerts`, icon: AlertTriangle },
        { label: 'Stale telemetry', value: summary.stale, detail: 'More than 15 min at scenario time', icon: Radio },
      ].map((metric) => <article key={metric.label} className="rounded-xl border border-border bg-card px-400 py-300">
        <div className="flex items-center justify-between gap-200 text-200 font-medium text-muted-foreground">
          <h2>{metric.label}</h2><metric.icon className="icon-size-200" aria-hidden="true" />
        </div>
        <p className="my-100 font-heading text-hero-900 font-semibold tabular-nums">{metric.value}</p>
        <p className="text-200 text-muted-foreground">{metric.detail}</p>
      </article>)}
    </section>

    {mostDelayed && mostDelayed.delayed > 0 && <section aria-label="Statewide exception briefing" className="flex flex-wrap items-center justify-between gap-300 rounded-xl border border-warning-border bg-warning-surface px-400 py-300 text-warning">
      <div className="flex items-center gap-300">
        <AlertTriangle className="icon-size-400 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-300 font-semibold">{mostDelayed.name} needs a closer look</h2>
          <p className="text-200">{mostDelayed.delayed} of {global.delayed} delayed vehicles statewide are in {mostDelayed.code}. Based on the persisted scenario.</p>
        </div>
      </div>
      <Button className="border-warning-border bg-transparent text-warning hover:bg-card" onClick={() => {
        setFilters({ ...EMPTY_FILTERS, region: mostDelayed.id, attention: 'delayed' });
        setSelectedId(undefined);
      }}>Investigate {mostDelayed.code}<ArrowRight className="icon-size-200" aria-hidden="true" /></Button>
    </section>}

    <section aria-label="Fleet filters" className="flex flex-wrap items-end gap-300">
      <FilterSelect label="Texas region" value={filters.region} onChange={(value) => setFilter('region', value)}
        options={[{ value: 'all', label: 'All Texas regions' }, ...fleet.regions.map((item) => ({ value: item.id, label: `${item.code} / ${item.name}` }))]} />
      <FilterSelect label="Vehicle status" value={filters.status} onChange={(value) => setFilter('status', value)}
        options={[{ value: 'all', label: 'All statuses' }, ...Object.entries(STATUS).map(([value, item]) => ({ value, label: item.label }))]} />
      <FilterSelect label="Attention" value={filters.attention} onChange={(value) => setFilter('attention', value)}
        options={[{ value: 'all', label: 'All vehicles' }, { value: 'alerts', label: 'Active alerts' }, { value: 'delayed', label: 'Delayed' }, { value: 'stale', label: 'Stale telemetry' }]} />
      <label className="flex min-w-(--width-control) flex-1 flex-col gap-100 text-200 font-semibold text-muted-foreground">
        Find a vehicle
        <span className="flex items-center gap-200 rounded-md border border-input bg-card px-300 py-200 text-foreground">
          <Search className="icon-size-200 shrink-0" aria-hidden="true" />
          <Primitive.input value={filters.search} onChange={(event) => setFilter('search', event.target.value)}
            placeholder="Vehicle ID or call sign" aria-label="Find a vehicle" className="min-w-0 flex-1 bg-transparent text-300 font-regular outline-none" />
        </span>
      </label>
      <Button onClick={resetFilters}>Reset</Button>
    </section>

    <section aria-label="Fleet map and vehicle roster" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-200 border-b border-border px-400 py-300">
        <div className="flex items-baseline gap-300">
          <h2 className="font-heading text-500 font-semibold">Texas operating picture</h2>
          <p role="status" className="text-200 text-muted-foreground">{vehicles.length} of {fleet.vehicles.length} vehicles shown</p>
        </div>
        <Button onClick={() => { setSelectedId(undefined); setReset((value) => value + 1); }} className="text-200">
          <MapPin className="icon-size-200" aria-hidden="true" />{region ? `${region.code} overview` : 'Texas overview'}
        </Button>
      </div>
      <div className={`grid min-w-0 lg:grid-cols-[var(--width-roster)_minmax(0,1fr)] ${selected ? 'xl:grid-cols-[var(--width-roster)_minmax(0,1fr)_var(--width-details)]' : ''}`}>
        <section aria-label="Vehicle roster" className="order-2 border-t border-border lg:order-1 lg:border-r lg:border-t-0">
          <div className="flex items-center justify-between border-b border-border px-400 py-300 text-200 text-muted-foreground">
            <h3 className="font-semibold">VEHICLE ROSTER</h3><span>Alerts first</span>
          </div>
          <div className="max-h-(--height-roster) overflow-auto">
            {vehicles.length === 0 ? <p className="p-400 text-300 text-muted-foreground">No vehicles match these filters. Reset to see the whole fleet.</p>
              : <ul>{vehicles.map((vehicle) => <li key={vehicle.id}>
                <Primitive.button type="button" aria-pressed={selectedId === vehicle.id}
                  onClick={() => selectVehicle(vehicle.id)}
                  className={`flex w-full items-center gap-300 border-b border-border px-400 py-300 text-left hover:bg-accent ${selectedId === vehicle.id ? 'bg-accent' : ''}`}>
                  <Truck className={`icon-size-300 shrink-0 ${STATUS[vehicle.status].color}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-200">
                      <strong className="text-300">{vehicle.vehicleCode}</strong>
                      {alertIds.has(vehicle.id) && <AlertTriangle aria-label="Active alert" className="icon-size-200 text-warning" />}
                    </span>
                    <span className="block truncate text-200 text-muted-foreground">{vehicle.callSign} / {fleet.regions.find((item) => item.id === vehicle.region_id)?.code}</span>
                    <span className={`block text-200 ${STATUS[vehicle.status].color}`}>{STATUS[vehicle.status].label}
                      {vehicle.delayStatus === 'delayed' ? ` / ${vehicle.delayMinutes} min delayed` : ''}</span>
                  </span>
                </Primitive.button>
              </li>)}</ul>}
          </div>
        </section>
        <div className="order-1 min-w-0 lg:order-2">
          <Suspense fallback={<div role="status" className="flex h-fleet-map items-center justify-center bg-map text-300">Loading Texas map...</div>}>
            <FleetMap vehicles={vehicles} regions={fleet.regions} region={region} selected={selected} reset={reset} onSelect={selectVehicle} />
          </Suspense>
        </div>
        {selected && <div ref={detailAnchor} className="order-3 min-w-0 lg:col-span-2 xl:col-span-1">
          <VehicleDetails vehicle={selected} fleet={fleet} onClose={() => setSelectedId(undefined)} />
        </div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-300 border-t border-border px-400 py-300">
        <div aria-label="Vehicle status legend" className="flex flex-wrap gap-400 text-200">
          {Object.entries(STATUS).map(([value, item]) => <span key={value} className="inline-flex items-center gap-100">
            <span className={`h-200 w-200 rounded-full ${item.background}`} aria-hidden="true" />{item.label}
          </span>)}
        </div>
        <p className="text-200 text-muted-foreground">Select a marker or roster row to inspect.</p>
      </div>
    </section>
    <FleetAgent asOf={fleet.clock.asOf} />
    <AlertWorkspace fleet={fleet} vehicle={selected} onSave={onSave} onRefresh={onRefresh} />
  </>;
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    let active = true;
    loadFleet().then((fleet) => {
      if (active) setState({ kind: 'ready', fleet });
    }).catch(() => {
      console.error('[fleet] Read failed. Check the content-free operation reference in browser diagnostics.');
      if (active) setState({ kind: 'error' });
    });
    return () => { active = false; };
  }, [request]);
  const reload = () => {
    setState({ kind: 'loading' });
    setRequest((value) => value + 1);
  };
  return <main className="min-h-screen">
    <header className="border-b border-command bg-command text-command-foreground">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-400 px-400 py-500 md:px-600">
        <div className="flex items-center gap-400">
          <div className="rounded-lg border border-command-muted/40 p-300"><Truck className="icon-size-600" aria-hidden="true" /></div>
          <div>
            <p className="text-200 font-semibold uppercase tracking-widest text-command-muted">Zava Security / Fabric Apps reference</p>
            <h1 className="font-heading text-hero-800 font-semibold leading-hero-800">Texas Fleet Command</h1>
          </div>
        </div>
        <div className="flex items-center gap-300">
          <div className="text-right text-200">
            <p className="font-semibold">SCENARIO CLOCK / CENTRAL</p>
            <p className="text-command-muted">{state.kind === 'ready'
              ? `${centralDate(state.fleet.clock.asOf)} / ${centralTime(state.fleet.clock.asOf)}` : 'Awaiting Fabric data'}</p>
          </div>
          <Button aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}
            className="border-command-muted/40 bg-transparent text-command-foreground hover:bg-command-muted/20">
            {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
          </Button>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-screen-2xl space-y-400 px-400 py-400 md:px-600">
      <div className="flex flex-wrap items-center justify-between gap-200">
        <p className="text-200 text-muted-foreground"><strong>SYNTHETIC DEMO.</strong> Zava Security is a fictional company. Vehicles, crews, assignments, and incidents are invented and represent no real company, customer, or operating practice.</p>
        <Button className="text-200" disabled={state.kind === 'loading'} onClick={reload}>
          <RefreshCw className="icon-size-200" aria-hidden="true" />Reload Fabric data
        </Button>
      </div>
      {state.kind === 'loading' && <section role="status" className="flex h-fleet-map flex-col items-center justify-center gap-300 rounded-xl border border-border bg-card text-muted-foreground">
        <Radio className="icon-size-600" aria-hidden="true" />
        <h2 className="font-heading text-600 text-foreground">Connecting the Texas fleet</h2>
        <p className="px-400 text-center text-300">Reading every page of vehicles, assignments, and alerts from Fabric SQL.</p>
      </section>}
      {state.kind === 'error' && <section role="alert" className="rounded-xl border border-destructive bg-card p-600">
        <h2 className="mb-200 font-heading text-600 text-destructive">Fleet data is unavailable</h2>
        <p className="mb-400 text-300">Check your Fabric session and access to Trucks Rayfin, then retry. No cached or substitute fleet is displayed.</p>
        <Button onClick={reload}>Retry fleet data</Button>
      </section>}
      {state.kind === 'ready' && (state.fleet.vehicles.length === 0
        ? <p role="status" className="rounded-xl border border-border bg-card p-600">No vehicles are stored in this fleet. Check the approved database and seed setup.</p>
        : <FleetWorkspace fleet={state.fleet}
          onSave={(alert) => setState((previous) => previous.kind !== 'ready' ? previous : ({
            ...previous, fleet: { ...previous.fleet, alerts: [...previous.fleet.alerts.filter((item) => item.id !== alert.id), alert] },
          }))}
          onRefresh={(alerts) => setState((previous) => previous.kind !== 'ready' ? previous : ({
            ...previous, fleet: { ...previous.fleet, alerts },
          }))} />)}
      <footer className="flex flex-wrap justify-between gap-200 pb-300 text-200 text-muted-foreground">
        <p>Microsoft Fabric Apps / Rayfin / App-owned SQL</p>
        <p>Synthetic operating picture / read-only agent / shared, tracked in-app alerts</p>
      </footer>
    </div>
  </main>;
}
