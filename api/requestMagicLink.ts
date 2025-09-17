import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { ERR, ok } from './utils/http';
import { signMagicToken } from './utils/session';
import { EmailClient } from '@azure/communication-email';

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

    const acs = process.env.ACS_CONNECTION_STRING;
    const fromEmail = process.env.MAGIC_FROM_EMAIL || process.env.REMINDER_FROM_EMAIL || '';
    let sent = false;
    if (acs && fromEmail) {
      try {
        const client = new EmailClient(acs);
        const subject = 'Your sign-in link to Cert Tracker';
        const html = `
          <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            <p>Hello,</p>
            <p>Click the button below to sign in. This link will expire in 15 minutes.</p>
            <p style="margin:24px 0;">
              <a href="${link}" style="background:#2563EB;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;">Sign in</a>
            </p>
            <p>Or copy and paste this URL into your browser:</p>
            <p><a href="${link}">${link}</a></p>
            <p>If you didn’t request this, you can ignore this email.</p>
          </div>`;
        await client.beginSend({
          senderAddress: fromEmail,
          recipients: { to: [{ address: email }] },
          content: {
            subject,
            html,
            plainText: `Open this link to sign in (expires in 15 minutes):\n${link}`,
          },
        });
        sent = true;
      } catch (e) {
        context.log('ACS email send failed; falling back to dev return', e);
      }
    } else {
      context.log('ACS configuration missing; skipping email send');
    }

    const devReturn = process.env.NODE_ENV !== 'production' ? { link } : {};
    context.log(`Magic link requested for ${email} in district ${districtId} (sent=${sent})`);
    return ok({ sent: !!sent, ...devReturn });
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
