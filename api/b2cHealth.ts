import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function b2cHealth(_request: HttpRequest): Promise<HttpResponseInit> {
  return { status: 200, body: JSON.stringify({ ok: true, service: 'b2c', time: new Date().toISOString() }) };
}

app.http('b2cHealth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: b2cHealth,
});

