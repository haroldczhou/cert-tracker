import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll, entities } from './utils/cosmos';
import { ERR, ok } from './utils/http';

export async function verifyEmailChange(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method !== 'POST' && request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();
    const url = new URL(request.url);
    let token: string | null = null;
    if (request.method === 'GET') {
      token = url.searchParams.get('token');
    } else {
      try {
        const body = (await request.json()) as any;
        token = body?.token ?? null;
      } catch {
        token = null;
      }
    }
    if (!token) return ERR.VALIDATION('token is required', { required: ['token'] });

    const reqs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.verificationToken = @tok',
      parameters: [
        { name: '@t', value: 'emailChange' },
        { name: '@tok', value: token },
      ],
    });
    if (reqs.length === 0) return ERR.NOT_FOUND('Invalid token');
    const reqDoc = reqs[0];
    if (reqDoc.status !== 'pending') return ERR.CONFLICT('Request already processed');
    if (reqDoc.verificationExpiresAt && new Date(reqDoc.verificationExpiresAt).getTime() < Date.now()) return ERR.CONFLICT('Token expired');

    reqDoc.status = 'verified';
    reqDoc.verifiedAt = new Date().toISOString();
    await entities.items.upsert(reqDoc);
    return ok({ verified: true });
  } catch (e) {
    context.log('verifyEmailChange error', e);
    return ERR.INTERNAL();
  }
}

app.http('verifyEmailChange', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: verifyEmailChange,
});
