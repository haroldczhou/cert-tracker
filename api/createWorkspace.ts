import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { ERR, ok } from './utils/http';

function isValidDistrictId(v: string) {
  return /^[a-z0-9-]{3,40}$/.test(v);
}

export async function createWorkspace(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { userId, userEmail, districtId: existingDistrict } = userCtx;
    if (!userId) return ERR.UNAUTHORIZED();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    // If user already has a district in their claims, don't allow creating a new one here
    if (existingDistrict) {
      return ERR.CONFLICT('User already belongs to a workspace');
    }

    let body: any = {};
    try { body = await request.json(); } catch {}
    const districtId = (body?.districtId || '').trim().toLowerCase();
    const districtName = (body?.districtName || '').trim();
    if (!districtId || !isValidDistrictId(districtId)) {
      return ERR.VALIDATION('districtId is required (3-40 chars, a-z, 0-9, -)');
    }

    // Ensure no existing config with that districtId
    const existing = await queryAll<any>({
      query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.id = @id',
      parameters: [
        { name: '@t', value: 'config' },
        { name: '@id', value: `config:${districtId}` },
      ],
    });
    if (existing.length > 0) return ERR.CONFLICT('Workspace already exists');

    const now = new Date();
    const trialDays = 30;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    // Create district document
    const districtDoc = {
      id: `district:${districtId}`,
      type: 'district',
      districtId,
      name: districtName || districtId,
      createdAt: now.toISOString(),
      ownerUid: userId,
      ownerEmail: userEmail ?? null,
    };
    await entities.items.create(districtDoc);

    // Create config with trial status
    const configDoc = {
      id: `config:${districtId}`,
      type: 'config',
      districtId,
      reminderOffsets: [60, 30, 7, 1, 0],
      expiringThresholdDays: 30,
      subscriptionStatus: 'trial' as const,
      plan: 'starter',
      trialEndsAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await entities.items.create(configDoc);

    return ok({
      message: 'Workspace created. Update your B2C policy to stamp extension_districtId and re-login.',
      districtId,
      trialEndsAt,
    });
  } catch (error) {
    context.log('createWorkspace error', error);
    return ERR.INTERNAL();
  }
}

app.http('createWorkspace', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createWorkspace,
});

