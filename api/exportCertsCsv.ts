import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole, getUserProfile } from './utils/auth';
import { auditLog } from './utils/audit';
import { ERR } from './utils/http';

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      if (v === null || typeof v === 'undefined') return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    })
    .join(',');
}

export async function exportCertsCsv(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return { status: 401, body: 'Unauthorized' };
    const { districtId } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (request.method !== 'GET') return ERR.METHOD_NOT_ALLOWED();
    if (!authorizeRole(userCtx.roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();

    const url = new URL(request.url);
    let schoolId = url.searchParams.get('schoolId') ?? undefined;
    const personId = url.searchParams.get('personId') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const certTypeKey = url.searchParams.get('certTypeKey') ?? undefined;

    let cq = 'SELECT * FROM c WHERE c.type = @t AND c.districtId = @did';
    const cparams: any[] = [
      { name: '@t', value: 'cert' },
      { name: '@did', value: districtId },
    ];
    // If school_admin, force school scope
    if (!userCtx.roles.has('district_admin') && userCtx.roles.has('school_admin')) {
      const profile = await getUserProfile(districtId, userCtx.userId);
      if (profile?.schoolId) schoolId = profile.schoolId;
    }
    if (schoolId) { cq += ' AND c.schoolId = @sid'; cparams.push({ name: '@sid', value: schoolId }); }
    if (personId) { cq += ' AND c.personId = @pid'; cparams.push({ name: '@pid', value: personId }); }
    if (status) { cq += ' AND c.status = @st'; cparams.push({ name: '@st', value: status }); }
    if (certTypeKey) { cq += ' AND c.certTypeKey = @ctk'; cparams.push({ name: '@ctk', value: certTypeKey }); }
    cq += ' ORDER BY c.expiryDate ASC';

    const certs = await queryAll<any>({ query: cq, parameters: cparams });

    // Preload people for join
    const people = await queryAll<any>({
      query: 'SELECT c.id, c.fullName, c.email, c.schoolId FROM c WHERE c.type = @t AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@did', value: districtId },
      ],
    });
    const personById = new Map<string, any>();
    for (const p of people) personById.set(p.id, p);

    const headers = [
      'districtId',
      'schoolId',
      'personId',
      'personName',
      'email',
      'certTypeKey',
      'issueDate',
      'expiryDate',
      'status',
      'docPath',
      'updatedAt',
    ];
    const rows = [toCsvRow(headers)];

    for (const c of certs) {
      const p = personById.get(c.personId) || {};
      rows.push(
        toCsvRow([
          c.districtId,
          c.schoolId ?? p.schoolId ?? '',
          c.personId,
          p.fullName ?? '',
          p.email ?? '',
          c.certTypeKey,
          c.issueDate ?? '',
          c.expiryDate ?? '',
          c.status ?? '',
          c.docPath ?? '',
          c.updatedAt ?? '',
        ])
      );
    }

    const csv = rows.join('\n');
    const filename = `certs_${districtId}_${new Date().toISOString().slice(0, 10)}.csv`;
    await auditLog(districtId, userCtx.userId, 'export_csv', 'cert', '*', { count: certs.length, schoolId: schoolId ?? null });
    return {
      status: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="${filename}"`,
      },
      body: csv,
    };
  } catch (error) {
    context.log('Error exporting certs CSV:', error);
    return ERR.INTERNAL();
  }
}

app.http('exportCertsCsv', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: exportCertsCsv,
});
