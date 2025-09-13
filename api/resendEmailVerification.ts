import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll, entities } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { ERR, ok } from './utils/http';
import { EmailClient } from '@azure/communication-email';

export async function resendEmailVerification(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { requestId: string };
    const { requestId } = body || ({} as any);
    if (!requestId) return ERR.VALIDATION('requestId is required', { required: ['requestId'] });

    const reqs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'emailChange' },
        { name: '@id', value: requestId },
        { name: '@did', value: districtId },
      ],
    });
    if (reqs.length === 0) return ERR.NOT_FOUND('Request not found');
    const doc = reqs[0];
    if (doc.status !== 'pending') return ERR.CONFLICT('Request is not pending');

    // extend expiry and resend link
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    doc.verificationExpiresAt = expiresAt;
    await entities.items.upsert(doc);

    const base = process.env.PUBLIC_BASE_URL || '';
    const link = base ? `${base}/email-verify?token=${encodeURIComponent(doc.verificationToken)}` : undefined;
    const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
    const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
    if (ACS && FROM && link) {
      try {
        const client = new EmailClient(ACS);
        await client.beginSend({
          senderAddress: FROM,
          recipients: { to: [{ address: doc.newEmail }] },
          content: { subject: 'Verify your email change', html: `<p>Please verify your email change by clicking the link:</p><p><a href="${link}">${link}</a></p>` },
        });
      } catch {}
    }
    return ok({ resent: true, expiresAt });
  } catch (e) {
    context.log('resendEmailVerification error', e);
    return ERR.INTERNAL();
  }
}

app.http('resendEmailVerification', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: resendEmailVerification,
});

