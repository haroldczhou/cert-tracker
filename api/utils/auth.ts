import { HttpRequest } from '@azure/functions';
import { queryAll } from './cosmos';

export type UserContext = {
  districtId: string | null;
  roles: Set<string>;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  raw?: any;
};

export function getUserContext(request: HttpRequest): UserContext | null {
  const cp = request.headers.get('x-ms-client-principal');
  if (!cp) return null;
  const user = JSON.parse(Buffer.from(cp, 'base64').toString());
  const claims: Array<{ typ: string; val: string }> = user.claims || [];
  let districtId =
    claims.find((c) => c.typ === 'extension_districtId')?.val || null;
  if (!districtId && process.env.DEV_DEFAULT_DISTRICT_ID) {
    districtId = process.env.DEV_DEFAULT_DISTRICT_ID;
  }
  const userId =
    user.userId ||
    claims.find((c) => c.typ.endsWith('/nameidentifier') || c.typ.endsWith('/objectidentifier'))?.val ||
    null;
  const userEmail = user.userDetails || claims.find((c) => c.typ.toLowerCase().includes('email'))?.val || null;
  const userName = claims.find((c) => c.typ.toLowerCase().includes('name'))?.val || null;
  const roles = new Set<string>();
  for (const c of claims) {
    if (
      c.typ === 'roles' ||
      c.typ === 'extension_roles' ||
      c.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ) {
      for (const r of c.val.split(/[;,\s]+/).filter(Boolean)) roles.add(r);
    }
  }
  return { districtId, roles, userId, userEmail, userName, raw: user };
}

export function authorizeRole(roles: Set<string>, allowed: string[]): boolean {
  // Strict: must intersect with allowed
  if (roles.has('district_admin')) return true;
  return allowed.some((r) => roles.has(r));
}

export async function getUserProfile(districtId: string, userId: string | null) {
  if (!userId) return null;
  const res = await queryAll<any>({
    query: 'SELECT TOP 1 c.id, c.schoolId, c.roleKey FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
    parameters: [
      { name: '@t', value: 'profile' },
      { name: '@id', value: userId },
      { name: '@did', value: districtId },
    ],
  });
  return res[0] ?? null;
}
