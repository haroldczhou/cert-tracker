'use client';

import React, { createContext, useContext } from 'react';
import { ClientPrincipal } from '@/lib/auth';

interface AuthContextType {
  user: ClientPrincipal | null;
  districtId: string | null;
  userRole: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const mockUser: ClientPrincipal = {
  identityProvider: 'aad',
  userId: 'test-user-123',
  userDetails: 'Test Administrator',
  userRoles: ['authenticated'],
  claims: [
    { typ: 'name', val: 'Test Administrator' },
    { typ: 'email', val: 'admin@testschool.edu' },
    { typ: 'extension_districtId', val: 'district-001' },
    { typ: 'extension_role', val: 'district_admin' }
  ]
};

const MockAuthContext = createContext<AuthContextType>({
  user: mockUser,
  districtId: 'district-001',
  userRole: 'district_admin',
  loading: false,
  isAuthenticated: true,
});

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthContext.Provider value={{
      user: mockUser,
      districtId: 'district-001',
      userRole: 'district_admin',
      loading: false,
      isAuthenticated: true,
    }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}