import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext, authorizeRole } from './utils/auth';
import { ERR, ok } from './utils/http';
import { randomUUID } from 'node:crypto';
import { parseCSV } from './utils/csv';

export async function importSchoolsCsv(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, roles } = userCtx;
    if (!districtId) return ERR.NO_DISTRICT();
    if (!authorizeRole(roles, ['district_admin'])) return ERR.FORBIDDEN();
    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const body = (await request.json()) as { csv: string; delimiter?: string };
    const csv = (body?.csv || '').trim();
    if (!csv) return ERR.VALIDATION('csv is required');
    const { headers, rows } = parseCSV(csv, body?.delimiter || ',');
    if (rows.length === 0) return ok({ created: 0, skipped: 0 });
    const lower = headers.map((h) => h.toLowerCase());
    const nameIdx = lower.indexOf('name');
    if (nameIdx < 0) return ERR.VALIDATION('Missing "name" column in CSV');

    let created = 0, skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      const name = (cols[nameIdx] ?? '').trim();
      if (!name) { skipped++; continue; }
      const dup = await queryAll<any>({
        query: 'SELECT TOP 1 c.id FROM c WHERE c.type = @t AND c.districtId = @did AND c.name = @n',
        parameters: [
          { name: '@t', value: 'school' },
          { name: '@did', value: districtId },
          { name: '@n', value: name },
        ],
      });
      if (dup.length > 0) { skipped++; continue; }
      const now = new Date().toISOString();
      await entities.items.create({ id: randomUUID(), type: 'school', districtId, name, active: true, createdAt: now, updatedAt: now });
      created++;
    }
    return ok({ created, skipped });
  } catch (e) {
    context.log('importSchoolsCsv error', e);
    return ERR.INTERNAL();
  }
}

app.http('importSchoolsCsv', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: importSchoolsCsv,
});
