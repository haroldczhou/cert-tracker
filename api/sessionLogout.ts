import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function sessionLogout(_request: HttpRequest): Promise<HttpResponseInit> {
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV !== 'development') attrs.push('Secure');
  const expired = `app_session=; ${attrs.join('; ')}`;
  return {
    status: 302,
    headers: {
      'Set-Cookie': expired,
      Location: '/',
    },
  };
}

app.http('sessionLogout', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: sessionLogout,
});

