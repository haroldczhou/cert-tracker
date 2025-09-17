import crypto from 'node:crypto';

const defaultExpSeconds = 15 * 60; // 15 minutes

export type MagicClaims = {
  email: string;
  districtId: string;
  exp: number; // epoch seconds
  iat: number; // epoch seconds
};

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error('APP_SESSION_SECRET is required');
  return secret;
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signMagicToken(payload: { email: string; districtId: string; expSeconds?: number }) {
  const { email, districtId, expSeconds = defaultExpSeconds } = payload;
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expSeconds;
  const header = { alg: 'HS256', typ: 'JWT' };
  const claims: MagicClaims = { email, districtId, iat, exp };
  const part1 = b64url(JSON.stringify(header));
  const part2 = b64url(JSON.stringify(claims));
  const data = `${part1}.${part2}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest();
  const part3 = b64url(sig);
  return `${data}.${part3}`;
}

export function verifyMagicToken(token: string): MagicClaims | null {
  try {
    const [p1, p2, p3] = token.split('.');
    if (!p1 || !p2 || !p3) return null;
    const data = `${p1}.${p2}`;
    const expected = b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
    if (expected !== p3) return null;
    const claims = JSON.parse(Buffer.from(p2, 'base64').toString()) as MagicClaims;
    if (!claims?.exp || !claims?.email || !claims?.districtId) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

export function makeSessionCookie(claims: MagicClaims) {
  // httpOnly cookie with short lifetime (e.g., session), SameSite=Lax
  const value = Buffer.from(JSON.stringify({ email: claims.email, districtId: claims.districtId })).toString('base64url');
  const attrs = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV !== 'development') attrs.push('Secure');
  return `app_session=${value}; ${attrs.join('; ')}`;
}

export function readSessionCookie(cookieHeader: string | null | undefined): { email: string; districtId: string } | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(cookieHeader.split(';').map((c) => {
    const [k, ...rest] = c.trim().split('=');
    return [k, rest.join('=')];
  }));
  const raw = cookies['app_session'];
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (decoded?.email && decoded?.districtId) return { email: decoded.email, districtId: decoded.districtId };
    return null;
  } catch {
    return null;
  }
}
