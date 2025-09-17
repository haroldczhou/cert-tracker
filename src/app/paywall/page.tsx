'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Config = {
  subscriptionStatus?: 'active' | 'trial' | 'inactive' | null;
  trialEndsAt?: string | null;
  plan?: string | null;
};

export default function PaywallPage() {
  const [cfg, setCfg] = useState<Config | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/getDistrictConfig');
        if (res.ok) {
          const data = await res.json();
          setCfg({
            subscriptionStatus: data.subscriptionStatus ?? null,
            plan: data.plan ?? null,
            trialEndsAt: data.trialEndsAt ?? null,
          });
        } else {
          setCfg(null);
        }
      } catch {
        setCfg(null);
      }
    };
    load();
  }, []);

  const trialDaysLeft = (() => {
    if (!cfg?.trialEndsAt) return null;
    const diff = new Date(cfg.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Subscription required</h1>
        <p className="mt-2 text-gray-600">Your workspace needs an active subscription to access the dashboard.</p>

        {cfg?.subscriptionStatus === 'trial' && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
            <div className="font-medium">Trial active</div>
            <div className="text-sm">{trialDaysLeft !== null ? `${trialDaysLeft} days remaining` : `Trial in progress`}</div>
          </div>
        )}

        {cfg?.subscriptionStatus !== 'active' && (
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="/get-started" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">Get started</Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-gray-800 font-medium hover:bg-gray-50"
            >
              Start subscription
            </Link>
          </div>
        )}

        <div className="mt-10 text-sm text-gray-500">
          If you need a new workspace, <a href="/get-started/create-workspace" className="text-blue-600 hover:underline">create one</a>.
        </div>
      </div>
    </div>
  );
}
