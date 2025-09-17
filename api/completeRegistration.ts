import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { entities, queryAll } from './utils/cosmos';
import { getUserContext } from './utils/auth';
import { ERR, ok } from './utils/http';

// Links the currently logged-in user to a pre-created person record by email.
// Requirements:
// - Admins pre-create people (email, roleKey, schoolId) via createPerson.
// - On first login, user calls this endpoint to bind their auth userId to that person.
// - If no matching person (by email, district), returns 404; no school creation here.

export async function completeRegistration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userCtx = getUserContext(request);
    if (!userCtx) return ERR.UNAUTHORIZED();
    const { districtId, userId, userEmail, userName } = userCtx;
    if (!districtId || !userId) return ERR.NO_DISTRICT();
    if (!userEmail) return ERR.FORBIDDEN('Missing email from identity');

    if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

    const emailLower = userEmail.toLowerCase();

    // Find pre-created person by email in this district
    const people = await queryAll<any>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.districtId = @did AND LOWER(c.email) = @eml',
      parameters: [
        { name: '@t', value: 'person' },
        { name: '@did', value: districtId },
        { name: '@eml', value: emailLower },
      ],
    });

    if (people.length === 0) {
      return { status: 404, body: JSON.stringify({ message: 'No pre-approved record found', email: userEmail }) };
    }

    const person = people[0];

    // If already linked to same user, just upsert profile and return OK
    if (person.authUid && person.authUid !== userId) {
      return ERR.FORBIDDEN('This email is already linked to another account');
    }

    person.authUid = userId;
    person.updatedAt = new Date().toISOString();
    await entities.items.upsert(person);

    // Upsert profile (id=userId) with school and role from the person record
    const profile = {
      id: userId,
      type: 'profile' as const,
      districtId,
      schoolId: person.schoolId ?? null,
      roleKey: person.roleKey ?? 'staff',
      email: userEmail,
      name: userName ?? person.fullName ?? null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await entities.items.upsert(profile);

    return ok({ message: 'Linked to pre-approved staff record', personId: person.id, schoolId: person.schoolId, roleKey: person.roleKey });
  } catch (error) {
    context.log('Error completing registration:', error);
    return ERR.INTERNAL();
  }
}

app.http('completeRegistration', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: completeRegistration,
});

