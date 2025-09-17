'use client';

import React, { useEffect, useState } from 'react';

type State =
  | { status: 'checking' }
  | { status: 'linked'; message?: string }
  | { status: 'not_found'; email?: string }
  | { status: 'error'; message: string };

export default function OnboardingPage() {
  const [state, setState] = useState<State>({ status: 'checking' });

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/completeRegistration', { method: 'POST' });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setState({ status: 'linked', message: data?.message || 'Registration complete.' });
          return;
        }
        if (res.status === 404 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setState({ status: 'not_found', email: data?.email });
          return;
        }
        const text = await res.text();
        setState({ status: 'error', message: text || 'Unexpected error' });
      } catch (e: any) {
        setState({ status: 'error', message: e?.message || 'Network error' });
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-8">
        {state.status === 'checking' && (
          <div>
            <h1 className="text-xl font-semibold mb-2">Completing registration…</h1>
            <p className="text-gray-600">Please wait while we verify your account.</p>
          </div>
        )}

        {state.status === 'linked' && (
          <div>
            <h1 className="text-xl font-semibold mb-2">You’re all set</h1>
            <p className="text-gray-600 mb-6">{state.message || 'Your account is now linked.'}</p>
            <div className="flex gap-3">
              <a href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Go to Dashboard</a>
              <a href="/.auth/logout" className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200">Logout</a>
            </div>
          </div>
        )}

        {state.status === 'not_found' && (
          <div>
            <h1 className="text-xl font-semibold mb-2">Access not yet configured</h1>
            <p className="text-gray-700 mb-4">
              We couldn’t find a pre-approved staff record for your email{state.email ? ` (${state.email})` : ''}.
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-6">
              <li>Please contact your district administrator to add your email and assign your school.</li>
              <li>Once added, sign in again and this step will complete automatically.</li>
            </ul>
            <div className="flex gap-3">
              <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Try Again</a>
              <a href="/.auth/logout" className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200">Logout</a>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div>
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{state.message}</p>
            <div className="flex gap-3">
              <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Back to Login</a>
              <a href="/.auth/logout" className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200">Logout</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

