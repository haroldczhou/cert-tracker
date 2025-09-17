import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

// Placeholder: Immediately marks the subscription as active for the caller's district.
// Replace later with Stripe Checkout + webhook to toggle status.
export async function startSubscription(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN('Admin only');
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    // Load existing config (if any)
    const existing = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'config' },
        { name: '@id', value: `config:${districtId}` },
        { name: '@did', value: districtId },
      ],
    });
    const now = new Date().toISOString();
    const cfg = existing[0] ?? { id: `config:${districtId}`, type: 'config', districtId, reminderOffsets: [60,30,7,1,0], expiringThresholdDays: 30, createdAt: now };
    cfg.subscriptionStatus = 'active';
    cfg.plan = cfg.plan ?? 'starter';
    cfg.trialEndsAt = null;
    cfg.updatedAt = now;
    const { resource } = await entities.items.upsert(cfg);
    return ok({ message: 'Subscription activated (placeholder)', config: resource });
  } catch (e) {
    context.log('startSubscription error', e);
    return ERR.INTERNAL();
  }
}

app.http('startSubscription', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: startSubscription,
});

