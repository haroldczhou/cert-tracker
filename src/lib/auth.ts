export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{
    typ: string;
    val: string;
  }>;
}

export async function getClientPrincipal(): Promise<ClientPrincipal | null> {
  try {
    const response = await fetch('/.auth/me');
    if (!response.ok) {
      // Try app session fallback
      const s = await fetch('/api/sessionMe').then(r => r.ok ? r.json() : null).catch(() => null);
      if (s?.session?.email && s?.session?.districtId) {
        const cp: ClientPrincipal = {
          identityProvider: 'magic',
          userId: `magic:${s.session.email}`,
          userDetails: s.session.email,
          userRoles: s.session.roles || ['authenticated'],
          claims: [
            { typ: 'extension_districtId', val: s.session.districtId },
            { typ: 'email', val: s.session.email },
            { typ: 'extension_role', val: 'staff' },
          ],
        };
        return cp;
      }
      return null;
    }
    
    const data = await response.json();
    const cp = data.clientPrincipal;
    if (cp) return cp;
    // Fallback if SWA principal missing
    const s = await fetch('/api/sessionMe').then(r => r.ok ? r.json() : null).catch(() => null);
    if (s?.session?.email && s?.session?.districtId) {
      const cp2: ClientPrincipal = {
        identityProvider: 'magic',
        userId: `magic:${s.session.email}`,
        userDetails: s.session.email,
        userRoles: s.session.roles || ['authenticated'],
        claims: [
          { typ: 'extension_districtId', val: s.session.districtId },
          { typ: 'email', val: s.session.email },
          { typ: 'extension_role', val: 'staff' },
        ],
      };
      return cp2;
    }
    return null;
  } catch (error) {
    console.error('Failed to get client principal:', error);
    return null;
  }
}

export function getDistrictId(clientPrincipal: ClientPrincipal): string | null {
  return clientPrincipal.claims?.find(c => c.typ === 'extension_districtId')?.val || null;
}

export function getUserRole(clientPrincipal: ClientPrincipal): string | null {
  return clientPrincipal.claims?.find(c => c.typ === 'extension_role')?.val || null;
}

export function redirectToLogin() {
  // Route to our login chooser so users can pick a provider
  window.location.href = '/login';
}

export function redirectToLogout() {
  window.location.href = '/.auth/logout';
}
