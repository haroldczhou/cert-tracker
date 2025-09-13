'use client';

import Link from 'next/link';

export default function LocalTest() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Local Development Test
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-blue-900 mb-2">
              Authentication Status
            </h2>
            <p className="text-blue-700 text-sm">
              Authentication is disabled for local testing. In production, all pages require Azure AD login.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Available Pages</h3>
              
              <div className="space-y-2">
                <Link 
                  href="/demo" 
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">File Upload Demo</div>
                  <div className="text-sm text-gray-600">Test file upload with 5MB validation</div>
                </Link>

                <Link 
                  href="/dashboard" 
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">Dashboard (Auth Required)</div>
                  <div className="text-sm text-gray-600">Will redirect to Azure AD login</div>
                </Link>

                <Link 
                  href="/dashboard/staff/add" 
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">Add Staff (Auth Required)</div>
                  <div className="text-sm text-gray-600">Will redirect to Azure AD login</div>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">API Endpoints</h3>
              
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">/.auth/me</div>
                  <div className="text-sm text-gray-600">Check authentication status</div>
                  <a 
                    href="/.auth/me" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Test →
                  </a>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">/api/getSchools</div>
                  <div className="text-sm text-gray-600">List schools (requires auth + DB)</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">/api/getPeople</div>
                  <div className="text-sm text-gray-600">List people (requires auth + DB)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              Next Steps for Full Functionality
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Set up Azure AD App Registration</li>
              <li>• Configure Azure Cosmos DB</li>
              <li>• Configure Azure Storage Account</li>
              <li>• Add environment variables</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}