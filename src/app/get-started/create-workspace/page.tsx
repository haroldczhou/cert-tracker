'use client';

import React, { useState } from 'react';

export default function CreateWorkspacePage() {
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch('/api/createWorkspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, districtName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(`Workspace created. District ID: ${data.districtId}. Update B2C to include this as extension_districtId, then sign out and sign in again.`);
      } else {
        setMessage(data?.error?.message || data?.message || 'Failed to create workspace');
      }
    } catch (e: any) {
      setMessage(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create a workspace</h1>
        <p className="mt-2 text-gray-600 text-sm">Choose a unique ID for your district/workspace. Use lowercase letters, numbers, and dashes (e.g., "springfield-usd").</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">District ID</label>
            <input
              type="text"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              placeholder="springfield-usd"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-600 focus:border-blue-600"
              required
              pattern="[a-z0-9-]{3,40}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">District name (optional)</label>
            <input
              type="text"
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder="Springfield Unified School District"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create workspace'}
          </button>
        </form>

        {message && (
          <div className="mt-6 text-sm text-gray-800">{message}</div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          After creation, configure your B2C custom policy to include <code>extension_districtId</code> = your District ID for admin accounts, then re‑login.
        </div>

        <div className="mt-8 flex items-center justify-between">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-800">Back to Home</a>
          <a href="/login" className="text-sm text-blue-600 hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  );
}

