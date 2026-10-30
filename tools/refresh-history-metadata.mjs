import assert from 'node:assert/strict';
import { assertTarget, fabricRequest, inWorkspace, target, waitForOperation } from './fabric.mjs';

await assertTarget();
const receipt = await fabricRequest(inWorkspace(`sqlEndpoints/${target.historySqlEndpointId}/refreshMetadata`), {
  method: 'POST',
  body: { recreateTables: false, tables: [{ schema: 'dbo', tableNames: ['fleet_daily_kpi', 'vehicle_daily'] }] },
});
const completed = await waitForOperation(receipt, 'Refresh history SQL metadata');
const result = receipt.status === 202 ?
  (await fabricRequest(`operations/${completed.operationId}/result`)).value : completed;
assert.ok(Array.isArray(result?.value), 'Metadata refresh returned no per-table results.');
for (const name of ['fleet_daily_kpi', 'vehicle_daily']) {
  const status = result.value.find((row) => row.tableName === name || row.tableName === `dbo.${name}`);
  assert.ok(status?.status === 'Success' ||
    (status?.status === 'NotRun' && Number.isFinite(Date.parse(status.lastSuccessfulSyncDateTime))),
  `${name}: metadata refresh incomplete: ${JSON.stringify(result)}`);
  if (status.status === 'NotRun') {
    console.log(`${name}: refresh reports NotRun (last successful sync ${status.lastSuccessfulSyncDateTime}); a query check is still required.`);
  }
}
console.log(JSON.stringify(result, null, 2));
