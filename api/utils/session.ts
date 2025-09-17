import jwt from 'jsonwebtoken';

const defaultExpSeconds = 15 * 60; // 15 minutes

export type MagicClaims = {
  email: string;
  districtId: string;
  exp?: number;
  iat?: number;
};

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error('APP_SESSION_SECRET is required');
  return secret;
}

export function signMagicToken(payload: { email: string; districtId: string; expSeconds?: number }) {
  const secret = getSecret();
  const { email, districtId, expSeconds = defaultExpSeconds } = payload;
  const token = jwt.sign({ email, districtId } as MagicClaims, secret, { expiresIn: expSeconds });
  return token;
}

export function verifyMagicToken(token: string): MagicClaims | null {
  try {
    const secret = getSecret();
    return jwt.verify(token, secret) as MagicClaims;
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

