'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirectToLogin } from '@/lib/auth';
import { School } from '@/types/entities';
import { ArrowLeft } from 'lucide-react';

export default function AddStaff() {
  const { isAuthenticated, loading } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    roleKey: 'teacher',
    schoolId: ''
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin();
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSchools();
    }
  }, [isAuthenticated]);

  const loadSchools = async () => {
    try {
      const response = await fetch('/api/getSchools');
      if (response.ok) {
        const schoolsData = await response.json();
        setSchools(schoolsData);
        if (schoolsData.length > 0) {
          setForm(prev => ({ ...prev, schoolId: schoolsData[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/createPerson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        window.location.href = '/dashboard';
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create staff member'}`);
      }
    } catch (error) {
      console.error('Failed to create staff member:', error);
      alert('Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingSchools) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Add Staff Member</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="roleKey" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="roleKey"
                  required
                  value={form.roleKey}
                  onChange={(e) => setForm(prev => ({ ...prev, roleKey: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                  <option value="nurse">Nurse</option>
                  <option value="food_service">Food Service</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="substitute">Substitute</option>
                </select>
              </div>

              <div>
                <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
                  School
                </label>
                <select
                  id="schoolId"
                  required
                  value={form.schoolId}
                  onChange={(e) => setForm(prev => ({ ...prev, schoolId: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}