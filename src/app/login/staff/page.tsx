'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage(null);
    setDevLink(null);
    try {
      const res = await fetch('/api/requestMagicLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Failed to send link');
      setStatus('sent');
      setMessage('Check your email for the sign-in link.');
      if (data?.link) setDevLink(data.link);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Failed to send link');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-semibold mb-1">Staff sign in</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Enter your email and we’ll send a one‑time sign‑in link. Only emails that your admin has added will work.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="block w-full text-center text-white rounded-md py-2 transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>{message}</div>
        )}
        {devLink && (
          <div className="mt-2 text-xs text-gray-500">
            Dev: <a className="text-blue-600 underline" href={devLink}>Open magic link</a>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Admin? <Link href="/login/admin" className="text-blue-600 hover:underline">Use Microsoft or Google</Link>.
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
