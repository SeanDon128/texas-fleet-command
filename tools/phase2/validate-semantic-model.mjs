import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { accessToken, assertTarget, fabricRequest, inWorkspace, target } from '../fabric.mjs';
import { connectSql } from '../sql.mjs';

await assertTarget();
const item = JSON.parse(await readFile(new URL('../../config/phase2-semantic-model.json', import.meta.url), 'utf8'));
if (item.workspaceId !== target.workspaceId || item.sourceDatabaseId !== target.sqlDatabaseId ||
    !/^[0-9a-f-]{36}$/i.test(item.id) || Object.entries(target).some(([key, id]) => key.endsWith('Id') && id === item.id)) {
  throw new Error('Refusing to query anything except the registered additive semantic model.');
}
const { value: remote } = await fabricRequest(inWorkspace(`semanticModels/${item.id}`));
assert.equal(remote.displayName, 'Texas Fleet Operations');
assert.equal(remote.workspaceId, target.workspaceId);
const token = accessToken('https://analysis.windows.net/powerbi/api');
const startedAt = new Date().toISOString();
const endpoint = `https://api.powerbi.com/v1.0/myorg/groups/${target.workspaceId}/datasets/${item.id}/executeQueries`;
const queries = [
  {
    name: 'fleet-summary',
    dax: `EVALUATE ROW(
      "totalVehicles", [Total Vehicles], "activeVehicles", [Active Vehicles],
      "activeAlerts", [Active Alerts], "criticalAlerts", [Critical Alerts],
      "alertVehicles", [Vehicles With Active Alerts], "criticalVehicles", [Vehicles With Critical Alerts],
      "delayedVehicles", [Delayed Vehicles], "staleVehicles", [Vehicles Not Reporting],
      "freshVehicles", [Vehicles Reporting Normally], "healthVehicles", [Health Attention Vehicles],
      "outOfServiceVehicles", [Out Of Service Vehicles], "attentionVehicles", [Vehicles Needing Attention],
      "attentionRate", [Attention Rate], "averageSpeed", [Average Speed En Route (mph)],
      "currentAssignments", [Current Assignments], "eventsLastHour", [Events In Last Scenario Hour])`,
    sql: `SELECT COUNT(*) totalVehicles,
      SUM(CASE WHEN status IN ('en_route','at_stop','idle') THEN 1 ELSE 0 END) activeVehicles,
      (SELECT COUNT(*) FROM dbo.Alerts WHERE status IN ('open','acknowledged')) activeAlerts,
      (SELECT COUNT(*) FROM dbo.Alerts WHERE status IN ('open','acknowledged') AND severity='critical') criticalAlerts,
      SUM(hasAlert) alertVehicles, SUM(hasCritical) criticalVehicles, SUM(delayed) delayedVehicles,
      SUM(stale) staleVehicles, COUNT(*)-SUM(stale) freshVehicles,
      SUM(healthIssue) healthVehicles, SUM(outOfService) outOfServiceVehicles, SUM(attention) attentionVehicles,
      CAST(SUM(attention) AS float)/COUNT(*) attentionRate,
      AVG(CASE WHEN status='en_route' THEN CAST(speedMph AS float) END) averageSpeed,
      (SELECT COUNT(*) FROM dbo.Assignments WHERE isCurrent=1) currentAssignments,
      (SELECT COUNT(*) FROM dbo.FleetEvents e CROSS JOIN dbo.SimClocks c
        WHERE e.occurredAt > DATEADD(hour,-1,c.asOf) AND e.occurredAt <= c.asOf) eventsLastHour FROM Fleet`,
  },
  {
    name: 'regions',
    dax: `EVALUATE SELECTCOLUMNS(FILTER(SUMMARIZECOLUMNS('Regions'[Region Code],
      "n", [Total Vehicles], "a", [Vehicles Needing Attention], "r", [Attention Rate],
      "av", [Vehicles With Active Alerts], "al", [Active Alerts],
      "d", [Delayed Vehicles], "s", [Vehicles Not Reporting]), NOT ISBLANK('Regions'[Region Code])),
      "region", 'Regions'[Region Code], "vehicles", [n], "attention", [a], "rate", [r],
      "alertVehicles", [av], "activeAlerts", [al], "delayed", [d], "stale", [s]) ORDER BY [region]`,
    sql: `SELECT r.code region, COUNT(*) vehicles, SUM(f.attention) attention,
      CAST(SUM(f.attention) AS float)/COUNT(*) rate, SUM(f.hasAlert) alertVehicles,
      (SELECT COUNT(*) FROM dbo.Alerts a JOIN dbo.Vehicles v ON v.id=a.vehicle_id
        WHERE v.region_id=r.id AND a.status IN ('open','acknowledged')) activeAlerts,
      SUM(f.delayed) delayed, SUM(f.stale) stale
      FROM Fleet f JOIN dbo.Regions r ON r.id=f.region_id GROUP BY r.id,r.code ORDER BY r.code`,
  },
  {
    name: 'critical-vehicles',
    dax: `EVALUATE SELECTCOLUMNS(FILTER(SUMMARIZECOLUMNS('Vehicles'[Vehicle Code],
      "critical", [Critical Alerts], "active", [Active Alerts]), [critical] > 0),
      "vehicle", 'Vehicles'[Vehicle Code], "critical", [critical], "active", [active]) ORDER BY [vehicle]`,
    sql: `SELECT v.vehicleCode vehicle,
      SUM(CASE WHEN a.severity='critical' THEN 1 ELSE 0 END) critical, COUNT(*) active
      FROM dbo.Vehicles v JOIN dbo.Alerts a ON a.vehicle_id=v.id AND a.status IN ('open','acknowledged')
      GROUP BY v.vehicleCode HAVING SUM(CASE WHEN a.severity='critical' THEN 1 ELSE 0 END)>0 ORDER BY v.vehicleCode`,
  },
  {
    name: 'stale-vehicles',
    dax: `EVALUATE SELECTCOLUMNS(FILTER(SUMMARIZECOLUMNS('Vehicles'[Vehicle Code],
      "stale", [Vehicles Not Reporting]), [stale] > 0),
      "vehicle", 'Vehicles'[Vehicle Code], "stale", [stale]) ORDER BY [vehicle]`,
    sql: 'SELECT vehicleCode vehicle, stale FROM Fleet WHERE stale=1 ORDER BY vehicleCode',
  },
  {
    name: 'syn-027-drillthrough',
    dax: `EVALUATE CALCULATETABLE(ROW("vehicle", SELECTEDVALUE('Vehicles'[Vehicle Code]),
      "delayMinutes", MAX('Vehicles'[Delay Minutes]), "activeAlerts", [Active Alerts],
      "criticalAlerts", [Critical Alerts], "stale", [Vehicles Not Reporting],
      "attention", [Vehicles Needing Attention], "currentAssignments", [Current Assignments]),
      TREATAS({"SYN-027"}, 'Vehicles'[Vehicle Code]))`,
    sql: `SELECT f.vehicleCode vehicle, f.delayMinutes,
      (SELECT COUNT(*) FROM dbo.Alerts a WHERE a.vehicle_id=f.id AND a.status IN ('open','acknowledged')) activeAlerts,
      (SELECT COUNT(*) FROM dbo.Alerts a WHERE a.vehicle_id=f.id AND a.status IN ('open','acknowledged') AND a.severity='critical') criticalAlerts,
      f.stale, f.attention, (SELECT COUNT(*) FROM dbo.Assignments a WHERE a.vehicle_id=f.id AND a.isCurrent=1) currentAssignments
      FROM Fleet f WHERE f.vehicleCode='SYN-027'`,
  },
  {
    name: 'scenario-time',
    dax: `EVALUATE ROW("asOf", FORMAT([Scenario As Of UTC], "yyyy-MM-ddTHH:mm:ss"))`,
    sql: 'SELECT CONVERT(varchar(19),asOf,126) asOf FROM dbo.SimClocks',
  },
];

const flags = `;WITH Flags AS (
  SELECT v.*,
    CASE WHEN EXISTS(SELECT 1 FROM dbo.Alerts a WHERE a.vehicle_id=v.id AND a.status IN ('open','acknowledged')) THEN 1 ELSE 0 END hasAlert,
    CASE WHEN EXISTS(SELECT 1 FROM dbo.Alerts a WHERE a.vehicle_id=v.id AND a.status IN ('open','acknowledged') AND a.severity='critical') THEN 1 ELSE 0 END hasCritical,
    CASE WHEN v.delayStatus='delayed' THEN 1 ELSE 0 END delayed,
    CASE WHEN v.lastTelemetryAt<DATEADD(minute,-15,c.asOf) THEN 1 ELSE 0 END stale,
    CASE WHEN v.healthStatus IN ('watch','service_needed') THEN 1 ELSE 0 END healthIssue,
    CASE WHEN v.status IN ('offline','maintenance') THEN 1 ELSE 0 END outOfService
  FROM dbo.Vehicles v CROSS JOIN dbo.SimClocks c),
  Fleet AS (SELECT *, CASE WHEN hasAlert=1 OR delayed=1 OR stale=1 OR healthIssue=1 OR outOfService=1 THEN 1 ELSE 0 END attention FROM Flags)`;

const normalize = (rows) => rows.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key.replace(/^\[|\]$/g, ''), value])));
function compare(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: row count. DAX=${JSON.stringify(actual)} SQL=${JSON.stringify(expected)}`);
  actual.forEach((row, index) => {
    assert.deepEqual(Object.keys(row).sort(), Object.keys(expected[index]).sort(), `${label}: output shape row ${index}`);
    for (const [key, value] of Object.entries(row)) {
      const wanted = expected[index][key];
      if (typeof value === 'number' && typeof wanted === 'number') {
        assert.ok(Math.abs(value - wanted) < 1e-8, `${label} ${key}: DAX ${value}, SQL ${wanted}`);
      } else {
        assert.equal(value, wanted, `${label} row ${index} ${key}`);
      }
    }
  });
}

const pool = await connectSql();
const evidence = { modelId: item.id, workspaceId: item.workspaceId, startedAt, checks: [] };
try {
  const { recordset: invariants } = await pool.request().query(`SELECT
    (SELECT COUNT(*) FROM dbo.SimClocks) clocks,
    (SELECT COUNT(*) FROM dbo.Vehicles WHERE lastTelemetryAt IS NULL) missingTelemetry,
    (SELECT COUNT(*) FROM dbo.Vehicles v LEFT JOIN dbo.Regions r ON r.id=v.region_id WHERE r.id IS NULL) orphanVehicles,
    (SELECT COUNT(*) FROM dbo.Alerts a LEFT JOIN dbo.Vehicles v ON v.id=a.vehicle_id WHERE v.id IS NULL) orphanAlerts,
    (SELECT COUNT(*) FROM dbo.Regions WHERE code IS NULL) missingRegionCodes,
    (SELECT COUNT(*) FROM dbo.Assignments WHERE isCurrent=1) currentAssignments`);
  assert.equal(invariants[0].clocks, 1, 'Freshness requires one source scenario clock.');
  assert.equal(invariants[0].missingTelemetry, 0, 'Reporting normally assumes source lastTelemetryAt is present.');
  assert.equal(invariants[0].orphanVehicles, 0, 'Region grouping must not suppress unknown region vehicles.');
  assert.equal(invariants[0].orphanAlerts, 0, 'Alert relationships must not lose source records.');
  assert.equal(invariants[0].missingRegionCodes, 0, 'Source region codes must be present.');
  for (const query of queries) {
    const response = await fetch(endpoint, { method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: [{ query: query.dax }], serializerSettings: { includeNulls: true } }),
      signal: AbortSignal.timeout(90_000) });
    const body = await response.json();
    if (!response.ok || body.error || body.results?.length !== 1 || body.results[0].error ||
        body.results[0].tables?.length !== 1 || body.results[0].tables[0].error) {
      throw new Error(`${query.name}: DAX HTTP ${response.status}: ${JSON.stringify(body)}`);
    }
    const actual = normalize(body.results[0].tables[0].rows ?? []);
    const expected = (await pool.request().query(`${query.sql.includes('FROM Fleet') ? flags : ''}\n${query.sql}`)).recordset;
    compare(actual, expected, query.name);
    evidence.checks.push({ name: query.name, verifiedAt: new Date().toISOString(), rows: actual });
    console.log(JSON.stringify({ passed: query.name, rows: actual }));
  }
  const { recordsets } = await pool.request().query(`SELECT status,COUNT(*) n FROM dbo.Assignments GROUP BY status;
    SELECT status,COUNT(*) n FROM dbo.Alerts GROUP BY status; SELECT healthStatus,COUNT(*) n FROM dbo.Vehicles GROUP BY healthStatus;`);
  evidence.sourceCategories = { assignmentStatus: recordsets[0], alertStatus: recordsets[1], healthStatus: recordsets[2] };
  evidence.completedAt = new Date().toISOString();
  await writeFile(new URL('../../fabric/phase2/semantic-model/validation.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ passed: evidence.checks.length, persisted: 'fabric/phase2/semantic-model/validation.json' }));
} finally {
  await pool.close();
}
