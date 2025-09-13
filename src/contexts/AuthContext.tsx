'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClientPrincipal, getClientPrincipal, getDistrictId, getUserRole } from '@/lib/auth';

interface AuthContextType {
  user: ClientPrincipal | null;
  districtId: string | null;
  userRole: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  districtId: null,
  userRole: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const clientPrincipal = await getClientPrincipal();
        setUser(clientPrincipal);
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const districtId = user ? getDistrictId(user) : null;
  const userRole = user ? getUserRole(user) : null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      districtId,
      userRole,
      loading,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}