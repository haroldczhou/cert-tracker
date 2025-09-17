import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function setDistrictConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as Partial<{ 
      reminderOffsets: number[];
      expiringThresholdDays: number;
      emailFrom?: string;
      timezone?: string;
      subscriptionStatus?: 'active' | 'trial' | 'inactive';
      plan?: string;
      trialEndsAt?: string | null;
    }>;
    const cfg = {
      id: `config:${districtId}`,
      type: 'config',
      districtId,
      reminderOffsets: body.reminderOffsets ?? [60, 30, 7, 1, 0],
      expiringThresholdDays: body.expiringThresholdDays ?? 30,
      emailFrom: body.emailFrom ?? null,
      timezone: body.timezone ?? null,
      subscriptionStatus: body.subscriptionStatus ?? null,
      plan: body.plan ?? null,
      trialEndsAt: body.trialEndsAt ?? null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const { resource } = await entities.items.upsert(cfg);
    return ok(resource);
  } catch (error) {
    context.log('Error setting district config:', error);
    return ERR.INTERNAL();
  }
}

app.http('setDistrictConfig', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: setDistrictConfig,
});
