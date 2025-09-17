'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirectToLogin } from '@/lib/auth';
import { Person, School } from '@/types/entities';
import { ShieldCheck, AlertTriangle, XCircle, Users, Plus } from 'lucide-react';

export default function Dashboard() {
  const { isAuthenticated, loading, user, districtId, userRole } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [subOk, setSubOk] = useState<boolean | null>(null);
  const [subStatus, setSubStatus] = useState<'active' | 'trial' | 'inactive' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin();
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    const checkSubAndLoad = async () => {
      if (!isAuthenticated || !districtId) return;
      try {
        const res = await fetch('/api/getDistrictConfig');
        if (!res.ok) throw new Error('config');
        const cfg = await res.json();
        const status = cfg.subscriptionStatus as 'active' | 'trial' | 'inactive' | null | undefined;
        const trialEndsAt = cfg.trialEndsAt ? new Date(cfg.trialEndsAt).getTime() : null;
        const trialActive = status === 'trial' && trialEndsAt !== null && trialEndsAt > Date.now();
        const ok = status === 'active' || trialActive;
        setSubOk(ok);
        setSubStatus(status ?? null);
        setTrialDaysLeft(trialActive && trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24))) : null);
        if (!ok) {
          window.location.href = '/paywall';
          return;
        }
        await loadData();
      } catch (e) {
        console.error('Subscription check failed', e);
        setSubOk(false);
        window.location.href = '/paywall';
      }
    };
    checkSubAndLoad();
  }, [isAuthenticated, districtId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [peopleResponse, schoolsResponse] = await Promise.all([
        fetch('/api/getPeople'),
        fetch('/api/getSchools')
      ]);

      if (peopleResponse.ok) {
        const peopleData = await peopleResponse.json();
        setPeople(peopleData);
      }

      if (schoolsResponse.ok) {
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || subOk === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  const stats = {
    valid: 0, // TODO: Calculate from certs
    expiring: 0, // TODO: Calculate from certs
    expired: 0, // TODO: Calculate from certs
    totalStaff: people.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {subStatus === 'trial' && trialDaysLeft !== null && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-sm text-blue-900">
            <div>Trial active: {trialDaysLeft} days remaining</div>
            <a href="/dashboard/billing" className="text-blue-700 hover:text-blue-900 font-medium">Go to billing</a>
          </div>
        </div>
      )}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Certification Tracker
              </h1>
              <div className="mt-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  <span className="truncate max-w-[280px]">Signed in as {user?.userDetails || 'user'}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span className="uppercase tracking-wide">{userRole || 'staff'}</span>
                </span>
              </div>
            </div>
              <div className="flex items-center gap-3">
                {userRole === 'staff' && (
                  <button
                    onClick={() => (window.location.href = '/select-school')}
                    className="border border-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Switch school
                  </button>
                )}
                <button
                  onClick={() => (window.location.href = '/admin/evidence')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Evidence Review
                </button>
                <button
                  onClick={() => (window.location.href = '/admin/people')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  People
                </button>
                <button
                  onClick={() => (window.location.href = '/admin/schools')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Schools
                </button>
                <button
                  onClick={() => (window.location.href = (user?.identityProvider === 'magic' ? '/api/sessionLogout' : '/.auth/logout'))}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Valid Certifications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.valid}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expiring Soon
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.expiring}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expired
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.expired}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Staff
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalStaff}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Staff</h2>
                <button
                  onClick={() => window.location.href = '/dashboard/staff/add'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Staff
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {loadingData ? (
                <div className="text-center py-4">Loading staff...</div>
              ) : people.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No staff</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding a staff member.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {people.slice(0, 5).map((person) => (
                    <div key={person.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {person.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {person.email} • {person.roleKey}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={`/admin/person?id=${person.id}`} className="text-sm text-blue-600 hover:underline">View</a>
                        <ShieldCheck className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  {people.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => window.location.href = '/dashboard/staff'}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View all {people.length} staff members
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Schools</h2>
            </div>
            <div className="px-6 py-4">
              {loadingData ? (
                <div className="text-center py-4">Loading schools...</div>
              ) : schools.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500">No schools configured</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {schools.map((school) => (
                    <div key={school.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{school.name}</div>
                        <div className="text-xs text-gray-500">{people.filter(p => p.schoolId === school.id).length} staff</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const ids = people.filter(p => p.schoolId === school.id).map(p => p.id);
                              if (ids.length === 0) { alert('No staff in this school.'); return; }
                              const res = await fetch('/api/sendRemindersBulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personIds: ids, status: 'expiring' }) });
                              if (!res.ok) throw new Error((await res.json()).error?.message || 'Failed to send');
                              alert('Reminders sent for expiring certifications.');
                            } catch (e: any) {
                              alert(e?.message || 'Failed to send reminders');
                            }
                          }}
                          className="text-xs px-2 py-1 rounded border text-blue-700 hover:bg-blue-50"
                        >
                          Send reminders
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
