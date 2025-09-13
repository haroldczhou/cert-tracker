import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';

export async function updateSchool(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'PATCH' && request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return ERR.VALIDATION('Missing id', { required: ['id'] });

    const body = (await request.json()) as Partial<{ name: string; active: boolean }>;

    const docs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'school' },
        { name: '@id', value: id },
        { name: '@did', value: districtId },
      ],
    });
    if (docs.length === 0) return ERR.NOT_FOUND('School not found');
    const school = docs[0];
    if (typeof body.name !== 'undefined') school.name = body.name;
    if (typeof body.active !== 'undefined') school.active = body.active;
    school.updatedAt = new Date().toISOString();
    const { resource } = await entities.items.upsert(school);
    return ok(resource);
  } catch (e) {
    context.log('Error updating school', e);
    return ERR.INTERNAL();
  }
}

app.http('updateSchool', {
  methods: ['PATCH', 'POST'],
  authLevel: 'anonymous',
  handler: updateSchool,
});

