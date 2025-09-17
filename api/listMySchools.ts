import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from './utils/auth';
import { queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';

export async function listMySchools(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userEmail } = userCtx;
    if (!districtId || !userEmail) return ERR.NO_DISTRICT();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();

    const emailLower = userEmail.toLowerCase();
    const people = await queryAll<any>({
      query: 'SELECT c.id, c.schoolId, c.roleKey FROM c WHERE c.type = @t AND c.districtId = @did AND LOWER(c.email) = @eml',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@did', value: districtId },
        { name: '@eml', value: emailLower },
      ],
    });

    return ok({ items: people });
  } catch (e) {
    context.log('listMySchools error', e);
    return ERR.INTERNAL();
  }
}

app.http('listMySchools', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: listMySchools,
});

