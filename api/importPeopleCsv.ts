import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';
import { randomUUID } from 'node:crypto';
import { parseCSV } from './utils/csv';

export async function importPeopleCsv(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin', 'school_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { csv: string; delimiter?: string };
    const csv = (body?.csv || '').trim();
    if (!csv) return ERR.VALIDATION('csv is required');
    const { headers, rows } = parseCSV(csv, body?.delimiter || ',');
    if (rows.length === 0) return ok({ created: 0, skipped: 0, errors: [] });
    const header = headers.map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('fullname');
    const emailIdx = header.indexOf('email');
    const roleIdx = header.indexOf('rolekey');
    const schoolIdx = header.indexOf('schoolname');
    if (nameIdx < 0 || emailIdx < 0 || roleIdx < 0 || schoolIdx < 0) return ERR.VALIDATION('CSV must include columns: fullName,email,roleKey,schoolName');

    let created = 0, skipped = 0; const errors: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      const fullName = (cols[nameIdx] ?? '').trim();
      const email = (cols[emailIdx] ?? '').trim();
      const roleKey = (cols[roleIdx] ?? '').trim();
      const schoolName = (cols[schoolIdx] ?? '').trim();
      if (!fullName || !email || !roleKey || !schoolName) { skipped++; continue; }
      try {
        const schools = await queryAll<any>({ query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.districtId = @did AND c.name = @n', parameters: [{ name: '@t', value: 'school' }, { name: '@did', value: districtId }, { name: '@n', value: schoolName }] });
        if (schools.length === 0) { errors.push({ row: i+1, error: `School '${schoolName}' not found` }); skipped++; continue; }
        const schoolId = schools[0].id;
        const now = new Date().toISOString();
        await entities.items.create({ id: randomUUID(), type: 'person', districtId, schoolId, roleKey, fullName, email, active: true, createdAt: now, updatedAt: now });
        created++;
      } catch (e: any) {
        errors.push({ row: i+1, error: e?.message || 'create failed' });
      }
    }
    return ok({ created, skipped, errors });
  } catch (e) {
    context.log('importPeopleCsv error', e);
    return ERR.INTERNAL();
  }
}

app.http('importPeopleCsv', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: importPeopleCsv,
});
