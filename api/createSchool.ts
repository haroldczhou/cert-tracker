import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, created } from './utils/http';
import { randomUUID } from 'node:crypto';

export async function createSchool(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as { name: string };
    const { name } = body || ({} as any);
    if (!name) return ERR.VALIDATION('Missing required fields', { required: ['name'] });

    const now = new Date().toISOString();
    const doc = {
      id: randomUUID(),
      type: 'school',
      districtId,
      name,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const { resource } = await entities.items.create(doc);
    return created(resource);
  } catch (e) {
    context.log('Error creating school', e);
    return ERR.INTERNAL();
  }
}

app.http('createSchool', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createSchool,
});

