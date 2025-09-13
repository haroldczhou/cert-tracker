import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { computeStatus } from './utils/status';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR, ok } from './utils/http';

export async function updateCert(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'PATCH' && request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return ERR.VALIDATION('Missing id');

    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) {
      return ERR.FORBIDDEN();
    }

    const { resources } = await entities.items
      .query<any>({
        query: 'SELECT * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
        parameters: [
          { name: '@t', value: 'cert' },
          { name: '@id', value: id },
          { name: '@did', value: districtId },
        ],
      })
      .fetchAll();
    if (resources.length === 0) return ERR.NOT_FOUND('Cert not found');
    const cert = resources[0];

    // If school_admin, ensure school scope
    if (!roles.has('district_admin') && roles.has('school_admin')) {
      const profile = await getUserProfile(districtId, userCtx.userId);
      if (profile?.schoolId && profile.schoolId !== cert.schoolId) {
        return ERR.FORBIDDEN('Forbidden for this school');
      }
    }

    const body = (await request.json()) as Partial<{
      issueDate: string | null;
      expiryDate: string;
      docPath: string | null;
      certTypeKey: string;
    }>;

    const updated = { ...cert };
    if (typeof body.issueDate !== 'undefined') updated.issueDate = body.issueDate;
    if (typeof body.expiryDate !== 'undefined') updated.expiryDate = body.expiryDate as any;
    if (typeof body.docPath !== 'undefined') updated.docPath = body.docPath;
    if (typeof body.certTypeKey !== 'undefined') updated.certTypeKey = body.certTypeKey;
    if (updated.expiryDate) updated.status = computeStatus(updated.expiryDate);
    updated.updatedAt = new Date().toISOString();

    const { resource } = await entities.items.upsert(updated);
    await auditLog(districtId, userCtx.userId, 'update', 'cert', updated.id, { changed: Object.keys(body || {}) });
    return ok(resource);
  } catch (error) {
    context.log('Error updating cert:', error);
    return ERR.INTERNAL();
  }
}

app.http('updateCert', {
  methods: ['PATCH', 'POST'],
  authLevel: 'anonymous',
  handler: updateCert,
});
