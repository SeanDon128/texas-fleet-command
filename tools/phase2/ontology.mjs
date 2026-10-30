import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import sql from 'mssql';
import {
  accessToken, assertTarget, fabricRequest, inWorkspace, target, waitForOperation,
} from '../fabric.mjs';

const configUrl = new URL('../../config/phase2-ontology.json', import.meta.url);
const root = new URL('../../fabric/phase2/ontology/', import.meta.url);
const config = JSON.parse(await readFile(configUrl, 'utf8'));
const receiptUrl = new URL('receipt.json', root);
const command = process.argv[2] ?? 'build';
const entities = [
  ['Vehicle', 'Vehicles', 'Synthetic vehicle. vehicleCode is unique; callSign is not a key. Needs attention is an uncapped union of active alert, delayed, stale telemetry, health not ok, or offline/maintenance.',
    { id: 'string', vehicleCode: 'string', callSign: 'string', region_id: 'string', status: 'string', healthStatus: 'string', delayStatus: 'string', delayMinutes: 'int64', lastTelemetryAt: 'dateTime', energyType: 'string', energyPct: 'int64', isSynthetic: 'boolean' }],
  ['Region', 'Regions', 'Synthetic operating region, not a physical vehicle location or unique route geography.',
    { id: 'string', code: 'string', name: 'string', hubName: 'string' }],
  ['Alert', 'Alerts', 'Synthetic alert. Active means current record status open or acknowledged, not a historical snapshot at the scenario clock. Review assignment does not assert notification.',
    { id: 'string', vehicle_id: 'string', region_id: 'string', assignedTo_id: 'string', status: 'string', severity: 'string', type: 'string', message: 'string', createdAt: 'dateTime', resolvedAt: 'dateTime', source: 'string', isSynthetic: 'boolean' }],
  ['Assignment', 'Assignments', 'Synthetic vehicle assignment. Current means isCurrent true. Each routeCode/destination is assignment-specific, not a shared Route or Stop entity.',
    { id: 'string', vehicle_id: 'string', originRegion_id: 'string', routeCode: 'string', destinationName: 'string', scheduledArrival: 'dateTime', estimatedArrival: 'dateTime', isCurrent: 'boolean', status: 'string', delayMinutes: 'int64', isSynthetic: 'boolean' }],
  ['FleetEvent', 'FleetEvents', 'Synthetic event history. Operator actions use actual UTC and can occur after ScenarioClock.asOf. Actor identity is intentionally excluded.',
    { id: 'string', vehicle_id: 'string', region_id: 'string', alert_id: 'string', type: 'string', occurredAt: 'dateTime', detail: 'string', isSynthetic: 'boolean' }],
  ['ScenarioClock', 'SimClocks', 'Exactly one synthetic scenario clock. asOf is the only telemetry freshness reference, never wall-clock UTC. Decimal speed is intentionally excluded.',
    { id: 'string', scenarioName: 'string', asOf: 'dateTime' }],
  ['TeamMember', 'TeamMembers', 'Fictional review-team member. Display name and role are synthetic; email and identity subject fields are excluded.',
    { id: 'string', displayName: 'string', role: 'string', region_id: 'string', isSynthetic: 'boolean' }],
];
const relationships = [
  ['operatesIn', 'Vehicle', 'region_id', 'Region', 'Vehicle operates in a region; many vehicles to one region.'],
  ['assignedToVehicle', 'Assignment', 'vehicle_id', 'Vehicle', 'Many assignments, including noncurrent records, refer to one vehicle.'],
  ['affectsVehicle', 'Alert', 'vehicle_id', 'Vehicle', 'Many alerts refer to one vehicle.'],
  ['observedOnVehicle', 'FleetEvent', 'vehicle_id', 'Vehicle', 'Many historical events refer to one vehicle.'],
  ['concernsAlert', 'FleetEvent', 'alert_id', 'Alert', 'Optional event-to-alert reference; null alert_id means no relationship instance.'],
  ['assignedForReview', 'Alert', 'assignedTo_id', 'TeamMember', 'Optional review responsibility; no notification is implied.'],
  ['teamBasedIn', 'TeamMember', 'region_id', 'Region', 'Fictional team member is based in one region.'],
];
const rules = [
  ['ActiveAlert', 'An active alert has current record status open or acknowledged. This is current state, not an as-of historical snapshot.', [['Alert', ['status']]]],
  ['DelayedVehicle', 'A delayed vehicle has delayStatus exactly delayed. Do not include at_risk or infer delay from wall-clock time.', [['Vehicle', ['delayStatus', 'delayMinutes']]]],
  ['StaleTelemetry', 'Telemetry is stale strictly when Vehicle.lastTelemetryAt is earlier than ScenarioClock.asOf minus 15 minutes. Equality at the threshold is not stale. Never use wall clock. The scenario clock is 2026-10-27T15:00:00Z.', [['Vehicle', ['lastTelemetryAt']], ['ScenarioClock', ['asOf']]]],
  ['NeedsAttention', 'A vehicle needs attention when it has at least one active alert OR delayStatus is delayed OR telemetry is stale under StaleTelemetry OR healthStatus is not ok OR status is offline or maintenance. Count the distinct uncapped union, not the sum of flags. Multiple alerts must not duplicate vehicles.', [['Vehicle', ['id', 'status', 'delayStatus', 'healthStatus', 'lastTelemetryAt']], ['Alert', ['vehicle_id', 'status']], ['ScenarioClock', ['asOf']]], ['affectsVehicle']],
  ['CurrentAssignment', 'A current assignment has isCurrent true (SQL bit 1). Do not select all historical assignments or infer a shared route entity.', [['Assignment', ['isCurrent', 'vehicle_id']]]],
  ['SyntheticTimeSemantics', 'All data is synthetic Zava Security (a fictional company) demo data and supports no claims about any real company or operation. Scenario-clock telemetry time is separate from actual UTC operator action timestamps, which can be later. Alert status reflects current record state, not a historical as-of snapshot.', [['ScenarioClock', ['asOf']], ['Alert', ['status', 'createdAt', 'resolvedAt']], ['FleetEvent', ['occurredAt']]]],
];

function stableId(name) {
  const h = createHash('sha256').update(`${config.logicalId}:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function save(name, value) {
  await mkdir(new URL(name.includes('/') ? name.slice(0, name.lastIndexOf('/') + 1) : './', root), { recursive: true });
  await writeFile(new URL(name, root), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
}

async function guard() {
  for (const key of ['tenantId', 'username', 'workspaceId', 'capacityId', 'sqlDatabaseId', 'sqlAnalyticsEndpointId']) {
    if (config[key] !== target[key]) throw new Error(`Target mismatch: ${key}`);
  }
  if (config.displayName !== 'Fleet_Operations' || config.graphMaterialization || config.refreshSchedule) {
    throw new Error('Only the approved context-only Fleet_Operations ontology is permitted.');
  }
  if (config.sourceDatabase !== config.sqlAnalyticsEndpointId ||
      config.sourceServer !== '<sql-analytics-endpoint>') {
    throw new Error('Only the approved existing SQLDatabase replica source is permitted.');
  }
  await assertTarget();
}

async function build() {
  const parts = [];
  const add = async (path, text) => {
    await save(`definition/${path}`, text);
    parts.push({ path, payload: Buffer.from(text).toString('base64'), payloadType: 'InlineBase64' });
  };
  await add('.platform', `${JSON.stringify({
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
    metadata: { type: 'Ontology', displayName: config.displayName },
    config: { version: '2.0', logicalId: config.logicalId },
  }, null, 2)}\n`);
  await add('database.tmdl', '/// Synthetic fleet context only. No graph materialization or refresh schedule.\ndatabase\n\tcompatibilityLevel: 1000000\n');
  await add('model.tmdl', `model Model\n\n${entities.map(([, table]) => `ref table ${table}`).join('\n')}\n\n${entities.map(([name]) => `ref entity ${name}`).join('\n')}\n\nref namespace default\n\n${rules.map(([name]) => `ref rule ${name}`).join('\n')}\n`);
  await add('namespaces/default.tmdl', `namespace default\n\tlineageTag: ${stableId('namespace')}\n`);
  await add('expressions.tmdl', `expression DatabaseQuery =\n\t\tlet\n\t\t    database = Sql.Database("${config.sourceServer}", "${config.sourceDatabase}")\n\t\tin\n\t\t    database\n\tlineageTag: ${stableId('DatabaseQuery')}\n`);
  for (const [name, table, description, properties] of entities) {
    let columns = '';
    let bindings = '';
    for (const [property, type] of Object.entries(properties)) {
      columns += `\n\tcolumn ${property}\n\t\tdataType: ${type}\n\t\tlineageTag: ${stableId(`column:${table}:${property}`)}\n\t\tsourceColumn: ${property}\n`;
      bindings += `\n\tproperty ${property}\n\t\tdataType: ${type}\n\t\tlineageTag: ${stableId(`property:${name}:${property}`)}\n\n\t\tbackingConfiguration\n\t\t\tvalueColumn: ${table}.${property}\n`;
    }
    await add(`tables/${table}.tmdl`, `table ${table}\n\tlineageTag: ${stableId(`table:${table}`)}\n${columns}\n\tpartition ${table} = entity\n\t\tmode: directLake\n\t\tsource\n\t\t\tentityName: ${table}\n\t\t\tschemaName: dbo\n\t\t\texpressionSource: DatabaseQuery\n`);
    await add(`entities/${name}.tmdl`, `/// ${description}\nentity ${name}\n\tlineageTag: ${stableId(`entity:${name}`)}\n\tbackingTable: ${table}\n\tkeyProperty: id\n${bindings}`);
  }
  const tables = new Map(entities.map(([name, table]) => [name, table]));
  await add('relationships.tmdl', relationships.map(([name, from, column, to]) =>
    `relationship ${name}\n\tfromColumn: ${tables.get(from)}.${column}\n\ttoColumn: ${tables.get(to)}.id\n`).join('\n'));
  await add('entityRelationships.tmdl', relationships.map(([name, from, , to, description]) =>
    `/// ${description}\nentityRelationship ${name}\n\tlineageTag: ${stableId(`relationship:${name}`)}\n\tfromEntity: ${from}\n\ttoEntity: ${to}\n\n\tbackingConfiguration\n\t\trelationship: ${name}\n`).join('\n'));
  for (const [name, statement, refs, rels = []] of rules) {
    await add(`rules/${name}.tmdl`, `rule ${name}\n\tstatement: ${statement}\n\tlineageTag: ${stableId(`rule:${name}`)}\n${refs.map(([entity, props]) => `\n\truleReferencedEntity ${entity}\n\t\tpropertyScope: specific\n${props.map((p) => `\n\t\truleReferencedProperty ${p}\n`).join('')}`).join('')}${rels.map((r) => `\n\truleReferencedRelationship ${r}\n`).join('')}`);
  }
  await save('create-request.json', { displayName: config.displayName, description: config.description, definition: { parts } });
  console.log(`Built ${parts.length} parts: ${entities.length} entities, ${relationships.length} relationships, ${rules.length} semantic rules.`);
  return parts;
}

async function validate() {
  const request = JSON.parse(await readFile(new URL('create-request.json', root), 'utf8'));
  const parts = request.definition.parts;
  const paths = parts.map((p) => p.path);
  if (new Set(paths).size !== paths.length) throw new Error('Duplicate definition part.');
  for (const required of ['.platform', 'database.tmdl', 'model.tmdl', 'namespaces/default.tmdl', 'expressions.tmdl']) {
    if (!paths.includes(required)) throw new Error(`Missing ${required}`);
  }
  const source = JSON.parse(await readFile(new URL('source-verification.json', root), 'utf8'));
  for (const [name] of entities) {
    const count = Number(source.counts[0][name]);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(`Invalid source ${name} count.`);
  }
  if (source.keyChecks.some((r) => Number(r.duplicateKeys) || Number(r.nullKeys)) ||
      source.relationshipChecks.some((r) => Number(r.orphans)) ||
      source.clock[0]?.asOf !== '2026-10-27T15:00:00.000Z' ||
      Number(source.currentAssignments[0]?.currentAssignments) !== 120 ||
      Number(source.currentAssignments[0]?.currentVehicles) !== 120) {
    throw new Error('Source keys, relationships, scenario clock, or current assignments failed validation.');
  }
  const entityText = parts.filter((p) => /^(?:tables|entities)\//.test(p.path))
    .map((p) => Buffer.from(p.payload, 'base64').toString('utf8')).join('\n');
  if (/\b(?:column|property) (?:\S*Sub|email|actor|lat|lng|speedMph|speed|centerLat|centerLng|destLat|destLng)\s*(?:\r?\n)/i.test(entityText)) {
    throw new Error('Excluded identity or decimal property is present.');
  }
  for (const [name, table, , properties] of entities) {
    if (properties.id !== 'string') throw new Error(`${name} key must be a string.`);
    const entityPart = parts.find((p) => p.path === `entities/${name}.tmdl`);
    const text = Buffer.from(entityPart.payload, 'base64').toString('utf8');
    for (const property of Object.keys(properties)) {
      if (!text.includes(`valueColumn: ${table}.${property}\n`)) throw new Error(`Unbound property ${name}.${property}`);
    }
  }
  for (const [name, from, column, to] of relationships) {
    if (!entities.find(([n]) => n === from)[3][column] || !entities.find(([n]) => n === to)[3].id) {
      throw new Error(`Invalid relationship columns: ${name}`);
    }
  }
  const result = {
    validatedAt: new Date().toISOString(), scope: 'Local structural checks and source-schema/count evidence, not service TMDL compilation',
    partCount: parts.length, entityCount: entities.length, relationshipCount: relationships.length, ruleCount: rules.length,
    definitionSha256: createHash('sha256').update(JSON.stringify(request.definition)).digest('hex'),
    sourceCountsVerified: true, sourceKeysAndRelationshipsVerified: true, exactPropertyMappingsChecked: true, excludedFieldsChecked: true,
    serverSyntaxValidated: false, persistedOntology: false,
  };
  await save('local-validation.json', result);
  console.log(JSON.stringify(result));
}

async function source() {
  await guard();
  const pool = await new sql.ConnectionPool({
    server: config.sourceServer, database: config.sourceDatabase,
    authentication: { type: 'azure-active-directory-access-token', options: { token: accessToken('https://database.windows.net/') } },
    options: { encrypt: true, trustServerCertificate: false, useUTC: true, appName: 'Fleet Ontology Read Only Verification' },
    connectionTimeout: 30_000, requestTimeout: 60_000, pool: { max: 1, min: 0 },
  }).connect();
  try {
    const schema = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo'");
    for (const [, table, , properties] of entities) for (const column of Object.keys(properties)) {
      if (!schema.recordset.some((r) => r.TABLE_NAME === table && r.COLUMN_NAME === column)) throw new Error(`Source binding missing: dbo.${table}.${column}`);
    }
    const counts = await pool.request().query(`SELECT ${entities.map(([name, table]) => `(SELECT COUNT_BIG(*) FROM dbo.[${table}]) AS [${name}]`).join(', ')}`);
    const sample = await pool.request().query(`SELECT v.vehicleCode,v.callSign,v.status,v.healthStatus,v.delayStatus,v.delayMinutes,v.lastTelemetryAt,r.code AS regionCode,c.asOf,
      (SELECT COUNT(*) FROM dbo.Alerts a WHERE a.vehicle_id=v.id AND a.status IN ('open','acknowledged')) AS activeAlerts,
      CASE WHEN v.lastTelemetryAt < DATEADD(minute,-15,c.asOf) THEN 1 ELSE 0 END AS stale
      FROM dbo.Vehicles v JOIN dbo.Regions r ON r.id=v.region_id CROSS JOIN dbo.SimClocks c WHERE v.vehicleCode='SYN-027'`);
    const baseline = await pool.request().query(`WITH flags AS (SELECT v.id,
      CASE WHEN v.lastTelemetryAt<DATEADD(minute,-15,c.asOf) THEN 1 ELSE 0 END AS stale,
      CASE WHEN v.delayStatus='delayed' THEN 1 ELSE 0 END AS delayed,
      CASE WHEN v.delayStatus='delayed' OR v.lastTelemetryAt<DATEADD(minute,-15,c.asOf) OR v.healthStatus<>'ok' OR v.status IN ('offline','maintenance')
        OR EXISTS(SELECT 1 FROM dbo.Alerts a WHERE a.vehicle_id=v.id AND a.status IN ('open','acknowledged')) THEN 1 ELSE 0 END AS needsAttention
      FROM dbo.Vehicles v CROSS JOIN dbo.SimClocks c)
      SELECT COUNT(*) AS vehicles,SUM(stale) AS stale,SUM(delayed) AS delayed,SUM(needsAttention) AS needsAttention FROM flags`);
    const regions = await pool.request().query(`WITH flags AS (SELECT v.id,v.region_id,
      CASE WHEN v.delayStatus='delayed' THEN 1 ELSE 0 END AS delayed,
      CASE WHEN v.delayStatus='delayed' OR v.lastTelemetryAt<DATEADD(minute,-15,c.asOf) OR v.healthStatus<>'ok' OR v.status IN ('offline','maintenance')
        OR EXISTS(SELECT 1 FROM dbo.Alerts a WHERE a.vehicle_id=v.id AND a.status IN ('open','acknowledged')) THEN 1 ELSE 0 END AS needsAttention
      FROM dbo.Vehicles v CROSS JOIN dbo.SimClocks c)
      SELECT r.code,COUNT(*) AS vehicles,SUM(f.delayed) AS delayed,SUM(f.needsAttention) AS needsAttention,
        (SELECT COUNT(*) FROM dbo.Alerts a WHERE a.region_id=r.id AND a.status IN ('open','acknowledged')) AS activeAlerts
      FROM flags f JOIN dbo.Regions r ON r.id=f.region_id GROUP BY r.id,r.code ORDER BY r.code`);
    const active = await pool.request().query(`SELECT COUNT(*) AS activeAlerts,COUNT(DISTINCT vehicle_id) AS affectedVehicles,
      SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS criticalAlerts FROM dbo.Alerts WHERE status IN ('open','acknowledged')`);
    const critical = await pool.request().query(`SELECT DISTINCT v.vehicleCode FROM dbo.Alerts a JOIN dbo.Vehicles v ON v.id=a.vehicle_id
      WHERE a.status IN ('open','acknowledged') AND a.severity='critical' ORDER BY v.vehicleCode`);
    const keyChecks = await pool.request().query(entities.map(([name, table]) =>
      `SELECT '${name}' AS entity,COUNT_BIG(*)-COUNT_BIG(DISTINCT id)-SUM(CAST(CASE WHEN id IS NULL THEN 1 ELSE 0 END AS bigint)) AS duplicateKeys,
        SUM(CAST(CASE WHEN id IS NULL THEN 1 ELSE 0 END AS bigint)) AS nullKeys FROM dbo.[${table}]`).join(' UNION ALL '));
    const tables = new Map(entities.map(([name, table]) => [name, table]));
    const relationshipChecks = await pool.request().query(relationships.map(([name, from, column, to]) =>
      `SELECT '${name}' AS relationship,COUNT_BIG(*) AS orphans FROM dbo.[${tables.get(from)}] f
        LEFT JOIN dbo.[${tables.get(to)}] t ON f.[${column}]=t.id WHERE f.[${column}] IS NOT NULL AND t.id IS NULL`).join(' UNION ALL '));
    const clock = await pool.request().query('SELECT scenarioName,asOf FROM dbo.SimClocks');
    const currentAssignments = await pool.request().query('SELECT COUNT(*) AS currentAssignments,COUNT(DISTINCT vehicle_id) AS currentVehicles FROM dbo.Assignments WHERE isCurrent=1');
    const evidence = { verifiedAt: new Date().toISOString(), verificationScope: 'Direct read-only SQL replica source; not an ontology query', server: config.sourceServer, database: config.sourceDatabase,
      counts: counts.recordset, sample: sample.recordset, baseline: baseline.recordset,
      regions: regions.recordset, activeAlerts: active.recordset, criticalVehicles: critical.recordset,
      keyChecks: keyChecks.recordset, relationshipChecks: relationshipChecks.recordset,
      clock: clock.recordset, currentAssignments: currentAssignments.recordset };
    await save('source-verification.json', evidence);
    console.log(JSON.stringify(evidence));
  } finally { await pool.close(); }
}

async function create(retryAfterEnablement = false) {
  await guard();
  if (config.ontologyId) throw new Error('An ontology ID is already registered. Verify it; never create a duplicate.');
  const existing = (await fabricRequest(inWorkspace('items?type=Ontology'))).value;
  if (existing.continuationToken || existing.continuationUri) throw new Error('Paginated inventory: inspect before creating.');
  if (existing.value.some((i) => i.displayName.toLowerCase() === config.displayName.toLowerCase())) {
    throw new Error('Ontology name exists. Refusing overwrite/adoption; use verify with this build receipt.');
  }
  if (retryAfterEnablement) {
    const failed = JSON.parse(await readFile(new URL('error-create.json', root), 'utf8'));
    const started = JSON.parse(await readFile(new URL('create-started.json', root), 'utf8'));
    if (config.deploymentStatus !== 'blocked_feature_unavailable' || failed.command !== 'create' ||
        !failed.message.includes('HTTP 403') || !failed.message.includes('"errorCode":"FeatureNotAvailable"') ||
        !failed.message.includes('"isRetriable":false') || started.workspaceId !== config.workspaceId ||
        started.displayName !== config.displayName || !Number.isFinite(Date.parse(started.startedAt))) {
      throw new Error('Retry requires a definitive prior feature-unavailable rejection for this exact target.');
    }
    for (const name of ['receipt.json', 'create-response.json']) {
      try {
        await readFile(new URL(name, root));
        throw new Error(`${name} exists: reconcile the accepted operation before retrying.`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const archive = `attempts/${started.startedAt.replaceAll(':', '-')}/`;
    await mkdir(new URL(archive, root), { recursive: true });
    for (const name of ['error-create.json', 'create-request.json', 'source-verification.json', 'local-validation.json']) {
      await copyFile(new URL(name, root), new URL(`${archive}${name}`, root));
    }
    await rename(new URL('create-started.json', root), new URL(`${archive}create-started.json`, root));
    await save('retry-authorization.json', { recordedAt: new Date().toISOString(),
      reason: 'User confirmed tenant Ontology preview enabled and explicitly requested retry.',
      priorAttempt: archive, existingOntologyCount: existing.value.length, workspaceId: config.workspaceId });
  }
  for (const name of ['receipt.json', 'create-started.json']) {
    try {
      await readFile(new URL(name, root));
      throw new Error(`A ${name} already exists. Inspect the previous operation before any new create.`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const parts = await build();
  await validate();
  await save('create-started.json', { startedAt: new Date().toISOString(), workspaceId: config.workspaceId, displayName: config.displayName });
  const receipt = await fabricRequest(inWorkspace('ontologies'), {
    method: 'POST', body: { displayName: config.displayName, description: config.description, definition: { parts } },
  });
  await save('create-response.json', { status: receipt.status, operationId: receipt.headers.get('x-ms-operation-id'), value: receipt.value, recordedAt: new Date().toISOString() });
  const completion = await waitForOperation(receipt, 'Create Fleet_Operations ontology', 360_000);
  let item = receipt.value;
  if (!item?.id && completion.operationId) item = (await fabricRequest(`operations/${completion.operationId}/result`)).value;
  if (!item?.id || item.displayName !== config.displayName || item.workspaceId !== config.workspaceId) throw new Error('Unexpected creation result. Inspect the saved operation; do not retry create.');
  await save('receipt.json', { createdAt: new Date().toISOString(), item, completion });
  config.ontologyId = item.id;
  config.deploymentStatus = 'created_query_verification_pending';
  await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Created ontology ${item.id}`);
  await verify();
}

async function verify() {
  await guard();
  const receipt = JSON.parse(await readFile(receiptUrl, 'utf8'));
  const id = receipt.item.id;
  if (config.ontologyId && config.ontologyId !== id) throw new Error('Receipt and configured ontology IDs differ.');
  const item = (await fabricRequest(inWorkspace(`ontologies/${id}`))).value;
  if (item.type !== 'Ontology' || item.properties?.generation !== 2 ||
      item.displayName !== config.displayName || item.workspaceId !== config.workspaceId) {
    throw new Error('Saved ontology identity or generation does not match.');
  }
  const response = await fabricRequest(inWorkspace(`ontologies/${id}/getDefinition`), { method: 'POST' });
  let definition = response.value;
  if (response.status === 202) {
    const done = await waitForOperation(response, 'Read ontology definition', 240_000);
    definition = (await fabricRequest(`operations/${done.operationId}/result`)).value;
  }
  await save('get-definition.json', definition);
  const parts = definition.definition?.parts ?? definition.parts;
  if (!Array.isArray(parts)) throw new Error('Definition response has no parts.');
  for (const part of parts) {
    if (part.path.startsWith('/') || part.path.includes('..') || part.path.includes('\\')) throw new Error('Unexpected definition path.');
    await save(`persisted-definition/${part.path}`, Buffer.from(part.payload, 'base64').toString('utf8'));
  }
  const text = parts.map((p) => Buffer.from(p.payload, 'base64').toString('utf8')).join('\n');
  for (const [name] of entities) if (!text.includes(`entity ${name}`)) throw new Error(`Missing persisted entity ${name}`);
  for (const [name, table, , properties] of entities) {
    const part = parts.find((p) => p.path === `entities/${name}.tmdl` || p.path === `entities/default#${name}.tmdl`);
    if (!part) throw new Error(`Missing persisted entity part ${name}`);
    const entityText = Buffer.from(part.payload, 'base64').toString('utf8');
    for (const property of Object.keys(properties)) {
      if (!entityText.includes(`valueColumn: ${table}.${property}`)) throw new Error(`Missing persisted binding ${name}.${property}`);
    }
  }
  for (const [name] of relationships) if (!text.includes(`entityRelationship ${name}`)) throw new Error(`Missing persisted relationship ${name}`);
  for (const [name] of rules) if (!text.includes(`rule ${name}`)) throw new Error(`Missing persisted rule ${name}`);
  if (/\b(?:entraSub|email|actor)\s*(?:\r?\n|:)/i.test(text)) throw new Error('Excluded identity property found.');
  const inventory = (await fabricRequest(inWorkspace('items'))).value;
  if (inventory.continuationToken || inventory.continuationUri) throw new Error('Paged inventory must be reconciled for associated resources.');
  const itemSuffix = id.replaceAll('-', '');
  const associatedResources = inventory.value.filter((row) =>
    ['GraphModel', 'Eventhouse', 'KQLDatabase'].includes(row.type) && row.displayName.endsWith(itemSuffix))
    .map(({ id, type, displayName }) => ({ id, type, displayName }));
  const result = {
    verifiedAt: new Date().toISOString(), item, persistedPartCount: parts.length,
    entities: entities.map(([name]) => name), relationships: relationships.map(([name]) => name), rules: rules.map(([name]) => name),
    definitionPersisted: true, bindingDefinitionsPersisted: text.includes(config.sourceServer) && text.includes(config.sourceDatabase),
    ontologyDataQueryVerified: false, graphMaterializationRequested: false,
    graphDataLoadVerified: false, associatedResources,
    url: `https://app.fabric.microsoft.com/groups/${config.workspaceId}/ontologies/${id}?ctid=${config.tenantId}`,
  };
  await save('verification.json', result);
  config.ontologyId = id;
  config.deploymentStatus = 'definition_verified_query_verification_pending';
  await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
  console.log(JSON.stringify(result));
}

async function updateText() {
  await guard();
  const apply = process.argv.includes('--apply');
  const receipt = JSON.parse(await readFile(receiptUrl, 'utf8'));
  const id = receipt.item.id;
  if (config.ontologyId !== id) throw new Error('Receipt and configured ontology IDs differ.');
  const response = await fabricRequest(inWorkspace(`ontologies/${id}/getDefinition`), { method: 'POST' });
  let current = response.value;
  if (response.status === 202) {
    const done = await waitForOperation(response, 'Read ontology definition', 240_000);
    current = (await fabricRequest(`operations/${done.operationId}/result`)).value;
  }
  const desired = rules.find(([name]) => name === 'SyntheticTimeSemantics')[1];
  const changed = [];
  const parts = current.definition.parts.map((part) => {
    if (part.path !== 'rules/SyntheticTimeSemantics.tmdl') return part;
    const before = Buffer.from(part.payload, 'base64').toString('utf8');
    const after = before.replace(/^(\s*statement:\s*).*$/m, (_, prefix) => `${prefix}${desired}`);
    if (after === before) return part;
    changed.push(part.path);
    return { ...part, payload: Buffer.from(after).toString('base64') };
  });
  console.log(JSON.stringify({ apply, changedParts: changed, totalParts: parts.length }));
  if (!changed.length) return;
  if (!apply) { console.log('Dry run only. Re-run with --apply to update this one rule statement.'); return; }
  const update = await fabricRequest(inWorkspace(`ontologies/${id}/updateDefinition`), { method: 'POST', body: { definition: { parts } } });
  await waitForOperation(update, 'Update ontology rule text', 240_000);
  const patched = await fabricRequest(inWorkspace(`ontologies/${id}`), { method: 'PATCH', body: { description: config.description } });
  await save('text-update-receipt.json', { appliedAt: new Date().toISOString(), changedParts: changed, itemDescriptionStatus: patched.status,
    note: 'Only the wording of one business rule and the item description changed; all other persisted parts were resubmitted unchanged.' });
  console.log('Updated. Running full read-back verification.');
  await verify();
}

try {
  if (command === 'build') await build();
  else if (command === 'update-text') await updateText();
  else if (command === 'validate') await validate();
  else if (command === 'source') await source();
  else if (command === 'create') await create();
  else if (command === 'retry-create') await create(true);
  else if (command === 'verify') await verify();
  else throw new Error('Expected build, validate, source, create, retry-create, or verify.');
} catch (error) {
  await save(`error-${command}.json`, { at: new Date().toISOString(), command, message: error.message });
  console.error(error.message);
  process.exitCode = 1;
}
