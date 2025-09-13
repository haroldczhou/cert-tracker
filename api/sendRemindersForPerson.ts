import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll, entities } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { EmailClient } from '@azure/communication-email';

export async function sendRemindersForPerson(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { personId: string; status?: 'expiring' | 'expired' | 'all' };
    const { personId, status = 'expiring' } = body || ({} as any);
    if (!personId) return ERR.VALIDATION('personId is required', { required: ['personId'] });

    const people = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @pid AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@pid', value: personId },
        { name: '@did', value: districtId },
      ],
    });
    if (people.length === 0) return ERR.NOT_FOUND('Person not found');
    const person = people[0];

    if (roles.has('school_admin') && !roles.has('district_admin')) {
      const profile = await getUserProfile(districtId, userId);
      if (profile?.schoolId && profile.schoolId !== person.schoolId) return ERR.FORBIDDEN('Forbidden for this school');
    }

    let q = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did AND c.personId = @pid';
    const params: any[] = [
      { name: '@t', value: 'cert' },
      { name: '@did', value: districtId },
      { name: '@pid', value: personId },
    ];
    if (status !== 'all') {
      q += ' AND c.status = @st';
      params.push({ name: '@st', value: status });
    }
    const certs = await queryAll<any>({ query: q, parameters: params });

    const results: Array<{ certId: string; status: 'sent' | 'skipped'; reason?: string }> = [];
    const base = process.env.PUBLIC_BASE_URL || '';
    const ACS = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
    const FROM = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
    const client = ACS && FROM ? new EmailClient(ACS) : null;

    for (const cert of certs) {
      try {
        // create magic link doc
        const id = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const doc = {
          id,
          type: 'magicLink',
          districtId,
          certId: cert.id,
          personId: person.id,
          expiresAt,
          used: false,
          evidenceId: null,
          createdAt: new Date().toISOString(),
          createdByUid: userId ?? null,
        };
        await entities.items.create(doc);
        const link = base ? `${base}/magic-upload?token=${id}` : undefined;
        if (client && FROM) {
          const subject = 'Certification Update Request';
          const html = [`<p>Hello ${person.fullName},</p>`, `<p>Please upload your latest evidence for ${cert.certTypeKey}.</p>`, link ? `<p>Upload link (24h): <a href="${link}">${link}</a></p>` : ''].join('');
          await client.beginSend({ senderAddress: FROM, recipients: { to: [{ address: person.email }] }, content: { subject, html } });
        }
        results.push({ certId: cert.id, status: 'sent' });
      } catch (e: any) {
        results.push({ certId: cert.id, status: 'skipped', reason: e?.message || 'error' });
      }
    }

    return ok({ count: results.length, results });
  } catch (e) {
    context.log('sendRemindersForPerson error', e);
    return ERR.INTERNAL();
  }
}

app.http('sendRemindersForPerson', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: sendRemindersForPerson,
});

