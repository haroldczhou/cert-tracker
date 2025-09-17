'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Config = {
  subscriptionStatus?: 'active' | 'trial' | 'inactive' | null;
  trialEndsAt?: string | null;
  plan?: string | null;
};

export default function BillingPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/getDistrictConfig');
        if (res.ok) setCfg(await res.json());
      } catch {}
    };
    load();
  }, []);

  const trialDaysLeft = (() => {
    if (!cfg?.trialEndsAt) return null;
    const diff = new Date(cfg.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const startSubscription = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/startSubscription', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Failed to start subscription');
      setMessage('Subscription activated. Redirecting to dashboard…');
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to start subscription');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
          <p className="mt-2 text-gray-600">Choose a plan and activate your subscription.</p>

          {cfg && (
            <div className="mt-6 grid gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Current status</div>
                <div className="mt-1 text-gray-900">
                  {cfg.subscriptionStatus || 'unknown'}{cfg.subscriptionStatus === 'trial' && trialDaysLeft !== null ? ` • ${trialDaysLeft} days left` : ''}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Plan</div>
                <div className="mt-1 text-gray-900">{cfg.plan || 'starter'}</div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={startSubscription}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start subscription'}
            </button>
            <Link href="/dashboard" className="ml-3 text-gray-700 hover:text-gray-900">Cancel</Link>
            <Link href="/dashboard/billing/manage" className="ml-6 text-blue-600 hover:underline">Manage subscription</Link>
          </div>

          {message && (
            <div className="mt-6 text-sm text-gray-800">{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
