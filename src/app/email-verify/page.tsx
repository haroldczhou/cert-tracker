'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function EmailVerifyInner() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Verifying…');

  useEffect(() => {
    const run = async () => {
      if (!token) { setStatus('error'); setMessage('Missing token.'); return; }
      try {
        const res = await fetch(`/api/verifyEmailChange?token=${encodeURIComponent(token)}`, { method: 'GET' });
        if (!res.ok) throw new Error((await res.json()).error?.message || 'Verification failed');
        setStatus('ok');
        setMessage('Email verified. An administrator may need to approve the change.');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Verification failed');
      }
    };
    run();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
        <h1 className="text-lg font-semibold mb-2">Email Verification</h1>
        <p className={status==='error' ? 'text-red-600' : 'text-gray-700'}>{message}</p>
      </div>
    </div>
  );
}
export default function EmailVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <EmailVerifyInner />
    </Suspense>
  );
}
