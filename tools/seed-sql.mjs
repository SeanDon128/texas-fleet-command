import { connectSql, dbValue, entities, inspectLayout, qualified, sql, sqlType } from './sql.mjs';
import { readSeed, verifySql } from './verify-sql.mjs';

if (process.argv.length > 2) throw new Error('No seed flags are supported. This initial-load tool never replaces existing data.');
const dataset = await readSeed();
const pool = await connectSql();
try {
  const layout = await inspectLayout(pool);
  const transaction = new sql.Transaction(pool);
  let rolledBack = false;
  let committed = false;
  transaction.on('rollback', () => { rolledBack = true; });
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    let rows = 0;
    for (const entity of entities) {
      const table = layout.get(entity);
      const result = await new sql.Request(transaction).query(
        `SELECT COUNT(*) AS n FROM ${qualified(table)} WITH (UPDLOCK, HOLDLOCK)`);
      rows += result.recordset[0].n;
    }
    if (rows > 0) {
      await transaction.rollback();
      console.log('Database is nonempty. Verifying exact seed; existing operational records will not be overwritten.');
      await verifySql(pool, dataset);
    } else {
      for (const entity of entities) {
        const table = layout.get(entity);
        const batch = new sql.Table(`${table.schema}.${table.name}`);
        batch.create = false;
        const expectedFields = new Set(dataset.operational[entity].flatMap((row) => Object.keys(row)));
        for (const field of expectedFields) {
          if (!table.columns.some((column) => column.name === field)) throw new Error(`Missing generated column ${entity}.${field}`);
        }
        for (const column of table.columns) {
          batch.columns.add(column.name, sqlType(column), { nullable: column.nullable === 'YES' });
        }
        for (const row of dataset.operational[entity]) {
          batch.rows.add(...table.columns.map((column) => dbValue(row[column.name], column)));
        }
        await new sql.Request(transaction).bulk(batch, { checkConstraints: true });
        console.log(`${entity}: inserted ${batch.rows.length} synthetic rows.`);
      }
      await transaction.commit();
      committed = true;
      console.log('Committed synthetic data transaction.');
      await verifySql(pool, dataset);
    }
  } catch (error) {
    if (!rolledBack && !committed) {
      try { await transaction.rollback(); }
      catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Seed failed and rollback could not be confirmed.');
      }
    }
    throw error;
  }
} finally {
  await pool.close();
}
