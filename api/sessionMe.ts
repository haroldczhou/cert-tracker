import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { readSessionCookie } from './utils/session';

export async function sessionMe(request: HttpRequest): Promise<HttpResponseInit> {
  const raw = request.headers.get('cookie');
  const sess = readSessionCookie(raw);
  if (!sess) return { status: 200, body: JSON.stringify({ session: null }) };
  return {
    status: 200,
    body: JSON.stringify({
      session: {
        email: sess.email,
        districtId: sess.districtId,
        roles: ['authenticated', 'staff'],
      },
    }),
  };
}

app.http('sessionMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: sessionMe,
});

