'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirectToLogin } from '@/lib/auth';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        window.location.href = '/dashboard';
      } else {
        redirectToLogin();
      }
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Redirecting...</div>
    </div>
  );
}
