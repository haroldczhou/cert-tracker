import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { ERR, ok } from './utils/http';
import { sendRemindersForPerson } from './sendRemindersForPerson';

export async function sendRemindersBulk(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { roles } = userCtx;
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { personIds: string[]; status?: 'expiring' | 'expired' | 'all' };
    const { personIds, status = 'expiring' } = body || ({} as any);
    if (!Array.isArray(personIds) || personIds.length === 0) return ERR.VALIDATION('personIds must be a non-empty array');

    const results: any[] = [];
    for (const personId of personIds) {
      const res = (await sendRemindersForPerson({
        ...request,
        json: async () => ({ personId, status }),
      } as any, context)) as any;
      try {
        const body = JSON.parse(res.body || '{}');
        results.push({ personId, ok: res.status === 200, body });
      } catch {
        results.push({ personId, ok: res.status === 200 });
      }
    }

    return ok({ count: results.length, results });
  } catch (e) {
    context.log('sendRemindersBulk error', e);
    return ERR.INTERNAL();
  }
}

app.http('sendRemindersBulk', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: sendRemindersBulk,
});

