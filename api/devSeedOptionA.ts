import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';

export async function devSeedOptionA(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Guard: only allow in dev via env flag
    if (process.env.DEV_ENABLE_SEED !== '1') {
      return { status: 403, body: 'Seeding disabled' };
    }
    const districtId = process.env.DEV_DEFAULT_DISTRICT_ID || 'district-001';
    const now = new Date().toISOString();

    // Ensure school
    const schoolName = 'Lincoln Elementary';
    let schools = await queryAll<any>({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @d AND c.name = @n', parameters: [ { name: '@t', value: 'school' }, { name: '@d', value: districtId }, { name: '@n', value: schoolName } ] });
    let school = schools[0];
    if (!school) {
      const { resource } = await entities.items.create({ id: crypto.randomUUID(), type: 'school', districtId, name: schoolName, active: true, createdAt: now, updatedAt: now });
      school = resource;
    }

    // Ensure person
    const personEmail = 'jane.teacher@example.org';
    let people = await queryAll<any>({ query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @d AND c.email = @e', parameters: [ { name: '@t', value: 'person' }, { name: '@d', value: districtId }, { name: '@e', value: personEmail } ] });
    let person = people[0];
    if (!person) {
      const { resource } = await entities.items.create({ id: crypto.randomUUID(), type: 'person', districtId, schoolId: school.id, roleKey: 'teacher', fullName: 'Jane Teacher', email: personEmail, active: true, createdAt: now, updatedAt: now });
      person = resource;
    }

    // Create cert
    const expiry = new Date(); expiry.setUTCDate(expiry.getUTCDate() + 20);
    const cert = { id: crypto.randomUUID(), type: 'cert', districtId, schoolId: school.id, personId: person.id, certTypeKey: 'cert-cpr', issueDate: null, expiryDate: expiry.toISOString(), status: 'expiring', createdAt: now, updatedAt: now };
    await entities.items.create(cert);

    return { status: 200, body: JSON.stringify({ districtId, school, person, cert }) };
  } catch (e: any) {
    context.log('devSeedOptionA error', e);
    return { status: 500, body: JSON.stringify({ error: e?.message || 'seed error' }) };
  }
}

app.http('devSeedOptionA', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  handler: devSeedOptionA,
});

