'use client';

import { useEffect, useState, useCallback } from 'react';
import { MockAuthProvider, useMockAuth } from '@/contexts/MockAuthContext';
import { Person, School, CertType, Cert } from '@/types/entities';
import { ShieldCheck, AlertTriangle, XCircle, Users, Plus, School as SchoolIcon, Award, RefreshCw } from 'lucide-react';

function LiveDashboardContent() {
  const { user, districtId, userRole } = useMockAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'schools' | 'certifications'>('overview');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    roleKey: 'teacher',
    schoolId: ''
  });

  const loadRealData = useCallback(async () => {
    try {
      // Load schools (this will work since we have the API)
      const schoolsResponse = await fetch('/api/getSchools');
      if (schoolsResponse.ok) {
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData);
        if (schoolsData.length > 0 && !newStaff.schoolId) {
          setNewStaff(prev => ({ ...prev, schoolId: schoolsData[0].id }));
        }
      }

      // Load people  
      const peopleResponse = await fetch('/api/getPeople');
      if (peopleResponse.ok) {
        const peopleData = await peopleResponse.json();
        setPeople(peopleData);
      }

      // For now, use sample cert types and certs since we don't have APIs for those yet
      setCertTypes([
        {
          id: 'cert-teaching-license',
          type: 'certType',
          name: 'State Teaching License',
          defaultValidMonths: 60,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'cert-cpr',
          type: 'certType',
          name: 'Pediatric CPR Certification',
          defaultValidMonths: 24,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'cert-food-handler',
          type: 'certType',
          name: 'Food Handler Permit',
          defaultValidMonths: 36,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'cert-background-check',
          type: 'certType',
          name: 'Background Check',
          defaultValidMonths: 12,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      setCerts([]);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [newStaff.schoolId]);

  useEffect(() => {
    setLoading(true);
    loadRealData().finally(() => setLoading(false));
  }, [loadRealData]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/createPerson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ms-client-principal': btoa(JSON.stringify({
            userId: 'test-user-123',
            userDetails: 'Test Administrator',
            claims: [
              { typ: 'extension_districtId', val: 'district-001' }
            ]
          }))
        },
        body: JSON.stringify(newStaff),
      });

      if (response.ok) {
        const newPerson = await response.json();
        setPeople(prev => [...prev, newPerson]);
        setNewStaff({
          fullName: '',
          email: '',
          roleKey: 'teacher',
          schoolId: schools[0]?.id || ''
        });
        setShowAddForm(false);
        alert('Staff member added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to add staff member'}`);
      }
    } catch (error) {
      console.error('Failed to add staff member:', error);
      alert('Failed to add staff member');
    }
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.name || 'Unknown School';
  };

  const stats = {
    valid: certs.filter(c => c.status === 'valid').length,
    expiring: certs.filter(c => c.status === 'expiring').length, 
    expired: certs.filter(c => c.status === 'expired').length,
    totalStaff: people.length,
    totalSchools: schools.length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg">Setting up Azure Cosmos DB data...</div>
          <div className="text-sm text-gray-500 mt-2">This may take a few seconds</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Live Dashboard - Azure Connected
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Testing real data flow: {user?.userDetails} ({userRole}) - District: {districtId}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                ✅ Azure Connected
              </div>
              <button
                onClick={loadRealData}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Success message removed in streamlined flow */}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ShieldCheck },
              { id: 'staff', name: 'Staff Management', icon: Users },
              { id: 'schools', name: 'Schools', icon: SchoolIcon },
              { id: 'certifications', name: 'Certifications', icon: Award }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'staff' | 'schools' | 'certifications')}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <SchoolIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Schools
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalSchools}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Data Display */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Live Data from Azure Cosmos DB</h2>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Schools ({schools.length})</h3>
                    <div className="space-y-2">
                      {schools.map((school) => (
                        <div key={school.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{school.name}</span>
                          <span className="text-xs text-gray-500">{people.filter(p => p.schoolId === school.id).length} staff</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Staff Members ({people.length})</h3>
                    <div className="space-y-2">
                      {people.map((person) => (
                        <div key={person.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{person.fullName}</div>
                            <div className="text-xs text-gray-500">{person.roleKey} • {getSchoolName(person.schoolId)}</div>
                          </div>
                        </div>
                      ))}
                      {people.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No staff members yet. Add some to test the data flow!</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Staff Management - Test Data Entry</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {showAddForm ? 'Cancel' : 'Add Staff Member'}
                  </button>
                </div>
              </div>
              
              {showAddForm && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newStaff.fullName}
                        onChange={(e) => setNewStaff(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={newStaff.email}
                        onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="john.smith@school.edu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        required
                        value={newStaff.roleKey}
                        onChange={(e) => setNewStaff(prev => ({ ...prev, roleKey: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                      <select
                        required
                        value={newStaff.schoolId}
                        onChange={(e) => setNewStaff(prev => ({ ...prev, schoolId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a school</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                      >
                        💾 Save to Azure Cosmos DB
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="px-6 py-4">
                <div className="space-y-4">
                  {people.map((person) => (
                    <div key={person.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{person.fullName}</div>
                        <div className="text-sm text-gray-500">{person.email} • {person.roleKey} • {getSchoolName(person.schoolId)}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Saved in Azure
                        </span>
                      </div>
                    </div>
                  ))}
                  {people.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No staff members yet. Use the form above to test adding staff to Azure!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Schools from Azure Cosmos DB</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {schools.map((school) => (
                  <div key={school.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <SchoolIcon className="h-6 w-6 text-purple-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{school.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Staff: {people.filter(p => p.schoolId === school.id).length}</div>
                      <div>Certifications: {certs.filter(c => c.schoolId === school.id).length}</div>
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Loaded from Azure
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'certifications' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Certification Types</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certTypes.map((certType) => (
                  <div key={certType.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Award className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{certType.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Valid for: {certType.defaultValidMonths} months</div>
                      <div>Active certificates: {certs.filter(c => c.certTypeKey === certType.id).length}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LiveDashboard() {
  return (
    <MockAuthProvider>
      <LiveDashboardContent />
    </MockAuthProvider>
  );
}
