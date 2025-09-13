'use client';

import { useState } from 'react';

export default function DevSeedPage() {
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const seed = async () => {
    try {
      setBusy(true);
      const res = await fetch('/api/devSeedOptionA', { method: 'POST' });
      const txt = await res.text();
      setResult(txt);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Dev Seed (Option A)</h1>
      <p className="text-sm text-gray-600">Seeds a school, person, and a sample cert in your DEV_DEFAULT_DISTRICT_ID.</p>
      <button disabled={busy} onClick={seed} className="text-sm px-3 py-2 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">{busy ? 'Seeding…' : 'Run seed'}</button>
      <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">{result}</pre>
    </div>
  );
}

