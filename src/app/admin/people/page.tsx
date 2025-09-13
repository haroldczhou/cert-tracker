'use client';

import { useEffect, useMemo, useState } from 'react';

type Person = { id: string; fullName: string; email: string; roleKey: string; schoolId: string };
type School = { id: string; name: string };

export default function PeopleAdminPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [csv, setCsv] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const buildTemplate = () => {
    const dlm = delimiter === '\\t' ? '\t' : delimiter;
    const rows = [
      ['fullName', 'email', 'roleKey', 'schoolName'],
      ['Jane Teacher', 'jane@example.org', 'teacher', 'Lincoln Elementary'],
      ['John Nurse', 'john@example.org', 'nurse', 'Washington Middle'],
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
    a.download = 'people_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const [selectedQueue, setSelectedQueue] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([fetch('/api/getPeople'), fetch('/api/getSchools')]);
      if (pRes.ok) setPeople(await pRes.json());
      if (sRes.ok) setSchools(await sRes.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const loadQueue = async () => {
    try {
      const res = await fetch('/api/listEmailChanges');
      if (res.ok) setQueue((await res.json()).items || []);
    } catch {}
  };
  useEffect(() => { loadQueue(); }, []);

  const filtered = useMemo(() => {
    return people.filter((p) => (!schoolId || p.schoolId === schoolId) && (!query || p.fullName.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())));
  }, [people, schoolId, query]);

  const sendAllExpiring = async (personId: string) => {
    try {
      setBusy(personId);
      const res = await fetch('/api/sendRemindersForPerson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, status: 'expiring' }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Failed to send reminders');
      alert('Reminders sent for expiring certifications.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send reminders');
    } finally {
      setBusy(null);
    }
  };

  const importPeople = async () => {
    if (!csv.trim()) { alert('Paste CSV first'); return; }
    try {
      setBusy('import');
      const res = await fetch('/api/importPeopleCsv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, delimiter }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Import failed');
      const data = await res.json();
      alert(`Imported. Created: ${data.created}, Skipped: ${data.skipped}, Errors: ${data.errors?.length || 0}`);
      setCsv('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const bulkSend = async () => {
    try {
      setBusy('bulk');
      const personIds = filtered.map((p) => p.id);
      const res = await fetch('/api/sendRemindersBulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personIds, status: 'expiring' }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Bulk send failed');
      alert('Bulk reminders sent for filtered people.');
    } catch (e: any) {
      setError(e?.message || 'Bulk send failed');
    } finally {
      setBusy(null);
    }
  };

  const approveEmail = async (requestId: string) => {
    try {
      setBusy(requestId);
      const res = await fetch('/api/approveEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Approve failed');
      await Promise.all([load(), loadQueue()]);
    } catch (e: any) {
      setError(e?.message || 'Approve failed');
    } finally {
      setBusy(null);
    }
  };

  const rejectEmail = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional)') || undefined;
    try {
      setBusy(requestId);
      const res = await fetch('/api/rejectEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, reason }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Reject failed');
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  const bulkApprove = async () => {
    const ids = Object.keys(selectedQueue).filter((k) => selectedQueue[k]);
    if (ids.length === 0) return;
    try {
      setBusy('bulk-approve');
      for (const id of ids) {
        await fetch('/api/approveEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: id }) });
      }
      setSelectedQueue({});
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || 'Bulk approve failed');
    } finally {
      setBusy(null);
    }
  };

  const bulkReject = async () => {
    const ids = Object.keys(selectedQueue).filter((k) => selectedQueue[k]);
    if (ids.length === 0) return;
    const reason = prompt('Reason for rejection (optional)') || undefined;
    try {
      setBusy('bulk-reject');
      for (const id of ids) {
        await fetch('/api/rejectEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: id, reason }) });
      }
      setSelectedQueue({});
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || 'Bulk reject failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">People</h1>
      <div className="flex items-center gap-3 mb-4">
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="border rounded px-3 py-1 text-sm flex-1" />
        <button onClick={load} className="text-sm px-3 py-1 rounded border">Refresh</button>
        <button disabled={busy==='bulk' || filtered.length===0} onClick={bulkSend} className="text-sm px-3 py-1 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">Send reminders (filtered)</button>
      </div>

      <div className="rounded border p-3 mb-4">
        <div className="text-sm font-medium mb-2">Import People from CSV</div>
        <p className="text-xs text-gray-600 mb-2">Template (headers required): <code>fullName,email,roleKey,schoolName</code></p>
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-700">
          <label>Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
          </select>
        </div>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="w-full border rounded p-2 text-sm font-mono" placeholder={"fullName,email,roleKey,schoolName\nJane Teacher,jane@example.org,teacher,Lincoln Elementary"} />
        <div className="mt-2">
          <button disabled={busy==='import'} onClick={importPeople} className="text-sm px-3 py-1 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">Import</button>
          <button onClick={downloadTemplate} className="ml-2 text-sm px-3 py-1 rounded border text-gray-700 hover:bg-gray-50">Download template</button>
        </div>
      </div>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="divide-y rounded border">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="text-sm text-gray-900 font-medium truncate">{p.fullName}</div>
                <div className="text-xs text-gray-500">{p.email} • {p.roleKey}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/admin/person?id=${p.id}`} className="text-xs text-blue-700 hover:underline">Open</a>
                <button disabled={busy===p.id} onClick={() => sendAllExpiring(p.id)} className="text-xs px-2 py-1 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">Send reminders for expiring</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-3 text-sm text-gray-600">No people match the filters.</div>}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2">Pending Email Changes</h2>
        <div className="flex items-center gap-2 mb-2">
          <button disabled={busy==='bulk-approve' || Object.values(selectedQueue).every((v)=>!v)} onClick={bulkApprove} className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50 disabled:opacity-50">Approve selected</button>
          <button disabled={busy==='bulk-reject' || Object.values(selectedQueue).every((v)=>!v)} onClick={bulkReject} className="text-xs px-2 py-1 rounded border text-red-700 hover:bg-red-50 disabled:opacity-50">Reject selected</button>
        </div>
        <div className="divide-y rounded border">
          {queue.map((q) => (
            <div key={q.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="text-sm text-gray-900 font-medium truncate">{q.newEmail}</div>
                <div className="text-xs text-gray-500">person: {q.personId} • requested: {new Date(q.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!selectedQueue[q.id]} onChange={(e) => setSelectedQueue((prev) => ({ ...prev, [q.id]: e.target.checked }))} />
                <button disabled={busy===q.id} onClick={() => approveEmail(q.id)} className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50 disabled:opacity-50">Approve</button>
                <button disabled={busy===q.id} onClick={() => rejectEmail(q.id)} className="text-xs px-2 py-1 rounded border text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
          {queue.length === 0 && <div className="p-3 text-sm text-gray-600">No pending requests.</div>}
        </div>
      </div>
    </div>
  );
}

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }
