'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type MyPerson = { id: string; schoolId: string; roleKey: string };
type School = { id: string; name: string };

export default function SelectSchoolPage() {
  const [mine, setMine] = useState<MyPerson[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, s] = await Promise.all([
          fetch('/api/listMySchools'),
          fetch('/api/getSchools')
        ]);
        if (m.ok) {
          const d = await m.json();
          setMine(d.items || []);
        }
        if (s.ok) setSchools(await s.json());
      } catch {}
    };
    load();
  }, []);

  const mapName = useMemo(() => Object.fromEntries(schools.map(s => [s.id, s.name])), [schools]);

  const choose = async (personId: string, schoolId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/selectSchool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, schoolId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Failed');
      window.location.href = '/dashboard';
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-semibold mb-2">Select school</h1>
        <p className="text-gray-600 mb-6 text-sm">Choose which school profile you want to manage today.</p>

        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

        {mine.length === 0 ? (
          <div className="text-gray-600 text-sm">No schools found for your account. Please contact your administrator.</div>
        ) : (
          <div className="space-y-3">
            {mine.map((p) => (
              <button
                key={p.id}
                onClick={() => choose(p.id, p.schoolId)}
                disabled={busy}
                className="w-full text-left rounded-md border border-gray-200 hover:bg-gray-50 p-4"
              >
                <div className="font-medium text-gray-900">{mapName[p.schoolId] || p.schoolId}</div>
                <div className="text-sm text-gray-600">Role: {p.roleKey}</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <Link href="/dashboard" className="text-blue-600 hover:underline">Skip</Link>
        </div>
      </div>
    </div>
  );
}

