import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { ERR, ok } from './utils/http';
import { EmailClient } from '@azure/communication-email';

export async function requestEmailChange(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { newEmail: string; personId?: string };
    const { newEmail, personId } = body || ({} as any);
    if (!newEmail) return ERR.VALIDATION('newEmail is required', { required: ['newEmail'] });

    // resolve person
    let p: any | null = null;
    if (personId) {
      const res = await queryAll<any>({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did', parameters: [{ name: '@t', value: 'person' }, { name: '@id', value: personId }, { name: '@did', value: districtId }] });
      p = res[0] ?? null;
    } else {
      const res = await queryAll<any>({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @did AND (c.authUid = @uid OR c.email = @email)', parameters: [{ name: '@t', value: 'person' }, { name: '@did', value: districtId }, { name: '@uid', value: userId }, { name: '@email', value: userCtx.userEmail ?? '' }] });
      p = res[0] ?? null;
    }
    if (!p) return ERR.NOT_FOUND('Person not found');

    const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const doc = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'emailChange',
      districtId,
      personId: p.id,
      newEmail,
      status: 'pending',
      verificationToken: token,
      verificationExpiresAt: expiresAt,
      requestedByUid: userId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await entities.items.create(doc);
    // Send verification email to newEmail
    const base = process.env.PUBLIC_BASE_URL || '';
    const link = base ? `${base}/email-verify?token=${encodeURIComponent(token)}` : undefined;
    const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
    const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
    if (ACS && FROM && link) {
      try {
        const client = new EmailClient(ACS);
        await client.beginSend({
          senderAddress: FROM,
          recipients: { to: [{ address: newEmail }] },
          content: { subject: 'Verify your email change', html: `<p>Please verify your email change by clicking the link:</p><p><a href="${link}">${link}</a></p>` },
        });
      } catch {}
    }
    return ok({ requestId: doc.id, status: 'pending', verificationSent: !!(ACS && FROM && link) });
  } catch (e) {
    context.log('requestEmailChange error', e);
    return ERR.INTERNAL();
  }
}

app.http('requestEmailChange', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: requestEmailChange,
});
