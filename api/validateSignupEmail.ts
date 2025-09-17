import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryAll } from './utils/cosmos';
import { ok, ERR } from './utils/http';

/**
 * B2C Custom Policy REST API: Validate Signup Email
 *
 * Purpose
 * - During B2C local account signup, validate that the email exists in the
 *   pre-approved staff list (person documents). If not present, block signup.
 * - Optionally returns districtId so the policy can stamp it into the token
 *   as an extension claim (extension_districtId) for downstream app use.
 *
 * Request
 * - Method: POST
 * - Body: { email: string }
 *
 * Response
 * - 200 OK with { allow: boolean, reason?: string, districtId?: string }
 */
export async function validateSignupEmail(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method !== 'POST') return ERR.METHOD_NOT_ALLOWED();

  let email = '';
  try {
    const body = (await request.json()) as { email?: string };
    email = (body?.email || '').trim().toLowerCase();
  } catch {
    // fallthrough; email stays empty
  }

  if (!email) {
    return { status: 409, body: JSON.stringify({ message: 'Missing email' }) };
  }

  // Look for a pre-approved person record with this email
  const people = await queryAll<any>({
    query: 'SELECT TOP 1 c.id, c.districtId FROM c WHERE c.type = @t AND LOWER(c.email) = @eml',
    parameters: [
      { name: '@t', value: 'person' },
      { name: '@eml', value: email },
    ],
  });

  if (people.length === 0) {
    return { status: 409, body: JSON.stringify({ message: 'Email not on the pre-approved staff list' }) };
  }

  const { districtId } = people[0];
  return ok({ allow: true, districtId });
}

app.http('validateSignupEmail', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: validateSignupEmail,
});
