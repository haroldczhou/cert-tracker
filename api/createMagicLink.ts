import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { randomUUID } from 'node:crypto';
import { ERR, ok } from './utils/http';

export async function createMagicLink(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles, userId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { certId: string; expiresInMinutes?: number };
    const { certId, expiresInMinutes = 60 * 24 } = body || ({} as any);
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

    const id = randomUUID();
    const now = Date.now();
    const expiresAt = new Date(now + expiresInMinutes * 60 * 1000).toISOString();
    const doc = {
      id,
      type: 'magicLink',
      districtId,
      certId: cert.id,
      personId: cert.personId,
      expiresAt,
      used: false,
      evidenceId: null,
      createdAt: new Date(now).toISOString(),
      createdByUid: userId ?? null,
    };
    await entities.items.create(doc);

    const base = process.env.PUBLIC_BASE_URL || '';
    const link = base ? `${base}/magic-upload?token=${id}` : undefined;
    return ok({ token: id, expiresAt, link });
  } catch (e) {
    context.log('Error creating magic link', e);
    return ERR.INTERNAL();
  }
}

app.http('createMagicLink', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createMagicLink,
});

