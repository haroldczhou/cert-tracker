import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function getDistrictConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const docs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'config' },
        { name: '@id', value: `config:${districtId}` },
        { name: '@did', value: districtId },
      ],
    });
    const defaults = { reminderOffsets: [60, 30, 7, 1, 0], expiringThresholdDays: 30 };
    const cfg = docs[0] ?? { id: `config:${districtId}`, type: 'config', districtId, ...defaults };
    return ok(cfg);
  } catch (error) {
    context.log('Error getting district config:', error);
    return ERR.INTERNAL();
  }
}

app.http('getDistrictConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getDistrictConfig,
});

