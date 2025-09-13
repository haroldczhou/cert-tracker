'use client';

import { useEffect, useState } from 'react';

type School = { id: string; name: string };

export default function SchoolsAdminPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [name, setName] = useState('');
  const [csv, setCsv] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const buildTemplate = () => {
    const dlm = delimiter === '\\t' ? '\t' : delimiter;
    const rows = [
      ['name'],
      ['Lincoln Elementary School'],
      ['Washington Middle School'],
    ];
    return rows.map((r) => r.map((v) => csvEscape(v, dlm)).join(dlm)).join('\n');
  };
  const csvEscape = (v: string, dlm: string) => {
    const needs = v.includes('"') || v.includes('\n') || v.includes(dlm);
    const s = v.replace(/"/g, '""');
    return needs ? `"${s}"` : s;
  };
  const downloadTemplate = () => {
    const content = buildTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schools_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/getSchools');
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Failed to load schools');
      setSchools(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) { alert('Please enter a school name'); return; }
    try {
      setBusy(true);
      const res = await fetch('/api/createSchool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Create failed');
      setName('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    if (!csv.trim()) { alert('Paste CSV first'); return; }
    try {
      setBusy(true);
      const res = await fetch('/api/importSchoolsCsv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, delimiter }) });
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Import failed');
      const data = await res.json();
      alert(`Imported. Created: ${data.created}, Skipped: ${data.skipped}`);
      setCsv('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const updateSchool = async (id: string, fields: Partial<{ name: string; active: boolean }>) => {
    try {
      await fetch(`/api/updateSchool?id=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      await load();
    } catch {}
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Schools</h1>
      </div>
      <div className="rounded border p-3">
        <div className="text-sm font-medium mb-2">Create School</div>
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="School name" className="border rounded px-3 py-2 text-sm flex-1" />
          <button disabled={busy} onClick={create} className="text-sm px-3 py-2 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
      <div className="rounded border p-3">
        <div className="text-sm font-medium mb-2">Import Schools from CSV</div>
        <p className="text-xs text-gray-600 mb-2">Template (headers required): <code>name</code></p>
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-700">
          <label>Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
          </select>
        </div>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="w-full border rounded p-2 text-sm font-mono" placeholder={"name\nLincoln Elementary\nWashington Middle"} />
        <div className="mt-2">
          <button disabled={busy} onClick={importCsv} className="text-sm px-3 py-2 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">Import</button>
          <button onClick={downloadTemplate} className="ml-2 text-sm px-3 py-2 rounded border text-gray-700 hover:bg-gray-50">Download template</button>
        </div>
      </div>
      <div className="rounded border">
        <div className="p-3 text-sm font-medium border-b">Existing Schools</div>
        {loading ? (
          <div className="p-3 text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="divide-y">
            {schools.map((s) => (
              <div key={s.id} className="p-3 text-sm text-gray-900 flex items-center justify-between gap-3">
                <input defaultValue={s.name} onBlur={(e) => updateSchool(s.id, { name: e.target.value })} className="border rounded px-2 py-1 text-sm flex-1" />
                <button onClick={() => updateSchool(s.id, { active: false })} className="text-xs px-2 py-1 rounded border text-red-700 hover:bg-red-50">Deactivate</button>
                <button onClick={() => updateSchool(s.id, { active: true })} className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50">Activate</button>
              </div>
            ))}
            {schools.length === 0 && <div className="p-3 text-sm text-gray-600">No schools yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
