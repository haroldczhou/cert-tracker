'use client';

import { useEffect, useState } from 'react';
import { MockAuthProvider, useMockAuth } from '@/contexts/MockAuthContext';
import { Person, School, CertType, Cert } from '@/types/entities';
import { ShieldCheck, AlertTriangle, XCircle, Users, Plus, School as SchoolIcon, Award } from 'lucide-react';

function DashboardContent() {
  const { user, districtId, userRole } = useMockAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'schools' | 'certifications'>('overview');

  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    // Sample schools
    const sampleSchools: School[] = [
      {
        id: 'school-001',
        type: 'school',
        districtId: 'district-001',
        name: 'Lincoln Elementary School',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'school-002', 
        type: 'school',
        districtId: 'district-001',
        name: 'Washington Middle School',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'school-003',
        type: 'school', 
        districtId: 'district-001',
        name: 'Roosevelt High School',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample certification types
    const sampleCertTypes: CertType[] = [
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
    ];

    // Sample staff 
    const samplePeople: Person[] = [
      {
        id: 'person-001',
        type: 'person',
        districtId: 'district-001',
        schoolId: 'school-001',
        roleKey: 'teacher',
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@school.edu',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'person-002',
        type: 'person',
        districtId: 'district-001', 
        schoolId: 'school-001',
        roleKey: 'teacher',
        fullName: 'Michael Chen',
        email: 'michael.chen@school.edu',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'person-003',
        type: 'person',
        districtId: 'district-001',
        schoolId: 'school-002',
        roleKey: 'nurse',
        fullName: 'Emily Rodriguez',
        email: 'emily.rodriguez@school.edu', 
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'person-004',
        type: 'person',
        districtId: 'district-001',
        schoolId: 'school-003',
        roleKey: 'food_service',
        fullName: 'David Park',
        email: 'david.park@school.edu',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample certifications with various statuses
    const sampleCerts: Cert[] = [
      {
        id: 'cert-001',
        type: 'cert',
        districtId: 'district-001',
        schoolId: 'school-001',
        personId: 'person-001',
        certTypeKey: 'cert-teaching-license',
        issueDate: new Date('2020-06-15'),
        expiryDate: new Date('2025-06-15'), // Valid
        status: 'valid',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cert-002', 
        type: 'cert',
        districtId: 'district-001',
        schoolId: 'school-001',
        personId: 'person-001',
        certTypeKey: 'cert-cpr',
        issueDate: new Date('2023-03-20'),
        expiryDate: new Date('2025-03-20'), // Expiring soon
        status: 'expiring',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cert-003',
        type: 'cert',
        districtId: 'district-001',
        schoolId: 'school-002',
        personId: 'person-003',
        certTypeKey: 'cert-background-check',
        issueDate: new Date('2023-01-10'),
        expiryDate: new Date('2024-01-10'), // Expired
        status: 'expired',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cert-004',
        type: 'cert',
        districtId: 'district-001',
        schoolId: 'school-003',
        personId: 'person-004',
        certTypeKey: 'cert-food-handler',
        issueDate: new Date('2022-09-15'),
        expiryDate: new Date('2025-09-15'), // Valid
        status: 'valid',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    setSchools(sampleSchools);
    setCertTypes(sampleCertTypes);
    setPeople(samplePeople);
    setCerts(sampleCerts);
    setLoading(false);
  };

  const getPersonName = (personId: string) => {
    const person = people.find(p => p.id === personId);
    return person?.fullName || 'Unknown';
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.name || 'Unknown School';
  };

  const getCertTypeName = (certTypeKey: string) => {
    const certType = certTypes.find(ct => ct.id === certTypeKey);
    return certType?.name || 'Unknown Certification';
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
        <div className="text-lg">Loading sample data...</div>
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
                Development Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.userDetails} ({userRole}) - District: {districtId}
              </p>
            </div>
            <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              Mock Auth Active
            </div>
          </div>
        </div>
      </header>

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

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Certification Status Overview</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {certs.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getPersonName(cert.personId)} - {getCertTypeName(cert.certTypeKey)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getSchoolName(cert.schoolId)} • Expires: {cert.expiryDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {cert.status === 'valid' && <ShieldCheck className="h-5 w-5 text-green-500" />}
                        {cert.status === 'expiring' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {cert.status === 'expired' && <XCircle className="h-5 w-5 text-red-500" />}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          cert.status === 'valid' ? 'bg-green-100 text-green-800' :
                          cert.status === 'expiring' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Staff Management</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Staff Member
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {people.map((person) => (
                  <div key={person.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{person.fullName}</div>
                      <div className="text-sm text-gray-500">{person.email} • {person.roleKey} • {getSchoolName(person.schoolId)}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {certs.filter(c => c.personId === person.id).length} certifications
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">School Management</h2>
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
                      <div>Active Issues: {certs.filter(c => c.schoolId === school.id && c.status !== 'valid').length}</div>
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
              <h2 className="text-lg font-medium text-gray-900">Certification Types & Requirements</h2>
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
                      <div>Expiring soon: {certs.filter(c => c.certTypeKey === certType.id && c.status === 'expiring').length}</div>
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

export default function DevDashboard() {
  return (
    <MockAuthProvider>
      <DashboardContent />
    </MockAuthProvider>
  );
}