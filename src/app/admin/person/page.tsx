'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EvidenceList } from '@/components/EvidenceList';
import { useAuth } from '@/contexts/AuthContext';

type Person = { id: string; fullName: string; email: string; schoolId: string; roleKey: string };
type Cert = { id: string; certTypeKey: string; expiryDate?: string; status?: string; schoolId?: string };

function PersonInner() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'district_admin' || userRole === 'school_admin';
  const sp = useSearchParams();
  const personId = sp.get('id') || '';

  const [person, setPerson] = useState<Person | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailBanner, setEmailBanner] = useState<{ status: string; newEmail: string } | null>(null);
  const [emailChanges, setEmailChanges] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailBusy, setEmailBusy] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const pRes = await fetch('/api/getPeople');
        if (!pRes.ok) throw new Error((await pRes.json()).error?.message || 'Failed to load person');
        const people: Person[] = await pRes.json();
        const p = people.find((x) => x.id === personId) || null;
        setPerson(p);
        const cRes = await fetch(`/api/getCerts?personId=${encodeURIComponent(personId)}`);
        if (cRes.ok) setCerts(await cRes.json());
        const ec = await fetch(`/api/listEmailChanges?status=all&personId=${encodeURIComponent(personId)}`);
        if (ec.ok) {
          const data = await ec.json();
          setEmailChanges(data.items || []);
          const pending = data.items?.find((x: any) => x.status === 'pending');
          const verified = data.items?.find((x: any) => x.status === 'verified');
          if (pending) setEmailBanner({ status: 'pending', newEmail: pending.newEmail });
          else if (verified) setEmailBanner({ status: 'verified', newEmail: verified.newEmail });
          else setEmailBanner(null);
        }
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    if (personId) load();
  }, [personId]);

  const requestEmailChange = async () => {
    if (!newEmail) { alert('Please enter a new email'); return; }
    try {
      setEmailBusy(true);
      const res = await fetch('/api/requestEmailChange', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newEmail, personId }),
      });
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Request failed');
      alert('Email change requested. Check the new inbox for a verification email.');
      setNewEmail('');
      const ec = await fetch(`/api/listEmailChanges?status=all&personId=${encodeURIComponent(personId)}`);
      if (ec.ok) {
        const data = await ec.json();
        setEmailChanges(data.items || []);
        const pending = data.items?.find((x: any) => x.status === 'pending');
        const verified = data.items?.find((x: any) => x.status === 'verified');
        if (pending) setEmailBanner({ status: 'pending', newEmail: pending.newEmail });
        else if (verified) setEmailBanner({ status: 'verified', newEmail: verified.newEmail });
        else setEmailBanner(null);
      }
    } catch (e: any) {
      alert(e?.message || 'Request failed');
    } finally {
      setEmailBusy(false);
    }
  };

  const resendVerification = async (requestId: string) => {
    try { await fetch('/api/resendEmailVerification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) }); alert('Verification email resent.'); } catch {}
  };
  const approveInline = async (requestId: string) => {
    try { await fetch('/api/approveEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) }); const ec = await fetch(`/api/listEmailChanges?status=all&personId=${encodeURIComponent(personId)}`); if (ec.ok) setEmailChanges((await ec.json()).items || []); } catch (e: any) { alert(e?.message || 'Approve failed'); }
  };
  const rejectInline = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional)') || undefined;
    try { await fetch('/api/rejectEmailChange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, reason }) }); const ec = await fetch(`/api/listEmailChanges?status=all&personId=${encodeURIComponent(personId)}`); if (ec.ok) setEmailChanges((await ec.json()).items || []); } catch (e: any) { alert(e?.message || 'Reject failed'); }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!person) return <div className="p-6">Person not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{person.fullName}</h1>
        <div className="text-sm text-gray-600">{person.email}</div>
        {emailBanner && (
          <div className={`mt-2 text-sm rounded p-2 ${emailBanner.status==='pending' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            {emailBanner.status === 'pending' && <>Email change requested to <strong>{emailBanner.newEmail}</strong>. Awaiting verification.</>}
            {emailBanner.status === 'verified' && <>Email change to <strong>{emailBanner.newEmail}</strong> verified. Awaiting admin approval.</>}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Certifications</h2>
        {certs.length === 0 ? (
          <div className="text-sm text-gray-600">No certifications yet.</div>
        ) : (
          <div className="space-y-4">
            {certs.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.certTypeKey}</div>
                    <div className="text-xs text-gray-500">Status: {c.status} • Due: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a className="text-xs text-blue-700 hover:underline" href={`/admin/cert?id=${c.id}`}>Open</a>
                    <button onClick={async () => { await fetch('/api/sendReminderLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certId: c.id }) }); alert('Reminder link sent'); }} className="text-xs px-2 py-1 rounded border text-blue-700 hover:bg-blue-50">Send reminder</button>
                  </div>
                </div>
                <div className="mt-3">
                  <EvidenceList certId={c.id} canManage={true} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Email Settings</h2>
        <div className="rounded border p-3">
          <div className="text-sm text-gray-700">Current: <span className="font-medium">{person.email}</span></div>
          <div className="mt-3 flex items-center gap-2">
            <input type="email" placeholder="new.email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="border rounded px-3 py-2 text-sm flex-1" />
            <button disabled={emailBusy || !newEmail} onClick={requestEmailChange} className="text-sm px-3 py-2 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">{emailBusy ? 'Requesting…' : 'Request change'}</button>
          </div>
          {emailBanner && (
            <div className={`mt-3 text-xs rounded p-2 ${emailBanner.status==='pending' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
              {emailBanner.status === 'pending' && <>A change to <strong>{emailBanner.newEmail}</strong> was requested. Ask the user to verify via the email we sent.</>}
              {emailBanner.status === 'verified' && <>New email <strong>{emailBanner.newEmail}</strong> is verified. Awaiting admin approval.</>}
            </div>
          )}
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Change Requests</div>
            <div className="divide-y rounded border">
              {emailChanges.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{r.newEmail}</div>
                    <div className="text-xs text-gray-500">status: {r.status} • requested: {new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' && (
                      <button onClick={() => resendVerification(r.id)} className="text-xs px-2 py-1 rounded border text-blue-700 hover:bg-blue-50">Resend verification</button>
                    )}
                    {isAdmin && r.status === 'verified' && (
                      <>
                        <button onClick={() => approveInline(r.id)} className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50">Approve</button>
                        <button onClick={() => rejectInline(r.id)} className="text-xs px-2 py-1 rounded border text-red-700 hover:bg-red-50">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {emailChanges.length === 0 && <div className="p-2 text-sm text-gray-600">No requests.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <PersonInner />
    </Suspense>
  );
}
