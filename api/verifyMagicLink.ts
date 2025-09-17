import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ERR } from './utils/http';
import { verifyMagicToken, makeSessionCookie } from './utils/session';

export async function verifyMagicLink(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return ERR.VALIDATION('token is required');
    const claims = verifyMagicToken(token);
    if (!claims) return ERR.FORBIDDEN('Invalid or expired link');

    const setCookie = makeSessionCookie(claims);
    // Decide redirect: selection or dashboard. We’ll let the client decide next.
    const location = '/dashboard';
    return {
      status: 302,
      headers: {
        'Set-Cookie': setCookie,
        Location: location,
      },
    };
  } catch (e) {
    return ERR.INTERNAL();
  }
}

app.http('verifyMagicLink', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: verifyMagicLink,
});

