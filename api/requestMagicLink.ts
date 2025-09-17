import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';
import { signMagicToken } from './utils/session';

export async function requestMagicLink(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    let email = '';
    try {
      const body = (await request.json()) as { email?: string };
      email = (body?.email || '').trim().toLowerCase();
    } catch {}
    if (!email) return ERR.VALIDATION('email is required', { required: ['email'] });

    // Find persons by email
    const people = await queryAll<any>({
      query: 'SELECT c.id, c.districtId FROM c WHERE c.type = @t AND LOWER(c.email) = @eml',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@eml', value: email },
      ],
    });
    if (people.length === 0) return ERR.NOT_FOUND('No pre-approved record found');
    const districtIds = Array.from(new Set(people.map((p) => p.districtId).filter(Boolean)));
    if (districtIds.length !== 1) return ERR.CONFLICT('Multiple districts detected for this email; contact support');
    const districtId = districtIds[0];

    const token = signMagicToken({ email, districtId, expSeconds: 15 * 60 });
    const base = process.env.PUBLIC_BASE_URL || '';
    const link = base ? `${base}/api/verifyMagicLink?token=${encodeURIComponent(token)}` : `/api/verifyMagicLink?token=${encodeURIComponent(token)}`;

    // TODO: Integrate email provider (ACS/SendGrid). For now, return a generic OK.
    const devReturn = process.env.NODE_ENV !== 'production' ? { link } : {};
    context.log(`Magic link requested for ${email} in district ${districtId}`);
    return ok({ sent: true, ...devReturn });
  } catch (e) {
    context.log('requestMagicLink error', e);
    return ERR.INTERNAL();
  }
}

app.http('requestMagicLink', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: requestMagicLink,
});

