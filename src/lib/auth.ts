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
      return null;
    }
    
    const data = await response.json();
    return data.clientPrincipal;
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
  window.location.href = '/.auth/login/aad';
}

export function redirectToLogout() {
  window.location.href = '/.auth/logout';
}