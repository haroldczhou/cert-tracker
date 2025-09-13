import { CosmosClient, SqlQuerySpec } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

export const database = cosmosClient.database('app');
export const entities = database.container('entities');

export async function queryAll<T = any>(query: SqlQuerySpec) {
  const { resources } = await entities.items.query<T>(query).fetchAll();
  return resources;
}

