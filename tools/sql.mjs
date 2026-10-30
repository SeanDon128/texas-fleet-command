import sql from 'mssql';
import { accessToken, assertTarget, fabricRequest, inWorkspace, target } from './fabric.mjs';

export { sql };
export const entities = ['Region', 'TeamMember', 'Crew', 'Vehicle', 'Assignment', 'Alert',
  'FleetEvent', 'TelemetryPing', 'OperatorNote', 'SimClock'];
export const quote = (identifier) => `[${identifier.replaceAll(']', ']]')}]`;
export const qualified = (table) => `${quote(table.schema)}.${quote(table.name)}`;

export async function connectSql() {
  await assertTarget();
  const { value: database } = await fabricRequest(inWorkspace(`sqlDatabases/${target.sqlDatabaseId}`));
  if (database.id !== target.sqlDatabaseId || database.workspaceId !== target.workspaceId ||
      database.displayName !== target.appName) throw new Error('SQL database is not the approved app-owned database.');
  return openPool(database.properties.serverFqdn, database.properties.databaseName, '.database.fabric.microsoft.com');
}

export async function connectHistorySql() {
  await assertTarget();
  const { value: lakehouse } = await fabricRequest(inWorkspace(`lakehouses/${target.lakehouseId}`));
  if (lakehouse.workspaceId !== target.workspaceId || lakehouse.displayName !== target.lakehouseName ||
      lakehouse.properties.sqlEndpointProperties.id !== target.historySqlEndpointId ||
      lakehouse.properties.sqlEndpointProperties.provisioningStatus !== 'Success') {
    throw new Error('History SQL analytics endpoint is not the approved, ready endpoint.');
  }
  return openPool(lakehouse.properties.sqlEndpointProperties.connectionString, target.lakehouseName, '.datawarehouse.fabric.microsoft.com');
}

async function openPool(serverWithPort, database, suffix) {
  const [server, port = '1433'] = serverWithPort.replace(/^tcp:/i, '').split(',');
  if (!server.endsWith(suffix)) throw new Error('Unexpected SQL server domain.');
  const pool = new sql.ConnectionPool({
    server, port: Number(port), database,
    authentication: { type: 'azure-active-directory-access-token', options: { token: accessToken('https://database.windows.net/') } },
    options: { encrypt: true, trustServerCertificate: false, useUTC: true, appName: 'Synthetic Texas Fleet Data Build' },
    connectionTimeout: 30_000, requestTimeout: 90_000, pool: { max: 2, min: 0 },
  });
  pool.on('error', (error) => { console.error('SQL connection error:', error.message); process.exitCode = 1; });
  await pool.connect();
  return pool;
}

export async function inspectLayout(pool) {
  const { recordset } = await pool.request().query(`
    SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS tableName, COLUMN_NAME AS name,
           DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS maxLength,
           NUMERIC_PRECISION AS precision, NUMERIC_SCALE AS scale,
           IS_NULLABLE AS nullable, ORDINAL_POSITION AS ordinal
    FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`);
  const layout = new Map();
  for (const entity of entities) {
    const candidates = recordset.filter((column) =>
      column.schema === 'dbo' && [entity, `${entity}s`].some((name) => name.toLowerCase() === column.tableName.toLowerCase()));
    if (!candidates.length) throw new Error(`Missing generated SQL table for ${entity}; schema application is incomplete.`);
    const names = new Set(candidates.map((column) => column.tableName));
    if (names.size !== 1) throw new Error(`Ambiguous generated table for ${entity}.`);
    layout.set(entity, { schema: 'dbo', name: candidates[0].tableName, columns: candidates });
  }
  return layout;
}

export function sqlType(column) {
  switch (column.type) {
    case 'uniqueidentifier': return sql.UniqueIdentifier;
    case 'nvarchar': return sql.NVarChar(column.maxLength === -1 ? sql.MAX : column.maxLength);
    case 'varchar': return sql.VarChar(column.maxLength === -1 ? sql.MAX : column.maxLength);
    case 'int': return sql.Int;
    case 'bit': return sql.Bit;
    case 'decimal': case 'numeric': return sql.Decimal(column.precision, column.scale);
    case 'float': return sql.Float;
    case 'datetime2': return sql.DateTime2(column.scale);
    case 'datetimeoffset': return sql.DateTimeOffset(column.scale);
    case 'datetime': return sql.DateTime;
    default: throw new Error(`Unsupported generated SQL type: ${column.type} for ${column.name}`);
  }
}

export function dbValue(value, column) {
  if (value === undefined || value === null) {
    if (column.nullable !== 'YES') throw new Error(`Missing required SQL value: ${column.tableName}.${column.name}`);
    return null;
  }
  if (column.type.startsWith('datetime')) {
    const date = new Date(value);
    if (!Number.isFinite(date.valueOf())) throw new Error(`Invalid datetime: ${column.name}`);
    return date;
  }
  return value;
}
