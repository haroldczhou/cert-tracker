import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { EmailClient } from '@azure/communication-email';

export async function sendReminderLink(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    const body = (await request.json()) as { certId: string; message?: string };
    const { certId, message } = body || ({} as any);
    if (!certId) return ERR.VALIDATION('certId is required', { required: ['certId'] });

    const certs = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @cid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@cid', value: certId },
        { name: '@did', value: districtId },
      ],
    });
    if (certs.length === 0) return ERR.NOT_FOUND('Cert not found');
    const cert = certs[0];

    if (roles.has('school_admin') && !roles.has('district_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== cert.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    const people = await queryAll<any>({
      query: 'SELECT TOP 1 c.id, c.fullName, c.email FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@pid', value: cert.personId },
        { name: '@did', value: districtId },
      ],
    });
    if (people.length === 0) return ERR.NOT_FOUND('Person not found for cert');
    const person = people[0];

    // Create magic link doc
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const doc = {
      id,
      type: 'magicLink',
      districtId,
      certId: cert.id,
      personId: cert.personId,
      expiresAt,
      used: false,
      evidenceId: null,
      createdAt: new Date().toISOString(),
      createdByUid: userId ?? null,
    };
    await entities.items.create(doc);

    const base = process.env.PUBLIC_BASE_URL || '';
    const link = base ? `${base}/magic-upload?token=${id}` : undefined;

    const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
    const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
    if (!ACS || !FROM) return ok({ link, token: id, warning: 'Missing ACS config; email not sent' });

    const client = new EmailClient(ACS);
    const subject = 'Certification Update Request';
    const lines = [
      `Hello ${person.fullName},`,
      message || `Please upload your latest certification evidence at your earliest convenience.`,
      link ? `Upload link (expires in 24 hours): ${link}` : '',
    ].filter(Boolean);
    await client.beginSend({
      senderAddress: FROM,
      recipients: { to: [{ address: person.email }] },
      content: { subject, html: lines.map((l) => `<p>${l}</p>`).join('') },
    });

    return ok({ sent: true, link, token: id });
  } catch (e) {
    context.log('sendReminderLink error', e);
    return ERR.INTERNAL();
  }
}

app.http('sendReminderLink', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: sendReminderLink,
});

