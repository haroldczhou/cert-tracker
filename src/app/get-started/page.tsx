'use client';

import React from 'react';

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Get started as a district admin</h1>
          <p className="mt-3 text-gray-600">
            Create your workspace, pick a plan, and invite school staff by email.
          </p>

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">1. Create your admin account</h2>
            <p className="mt-2 text-sm text-gray-600">Use your organization account for SSO.</p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <a
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
                href="/.auth/login/aad?post_login_redirect_uri=%2Fdashboard"
              >
                Continue with Microsoft
              </a>
              <a
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700"
                href="/.auth/login/google?post_login_redirect_uri=%2Fdashboard"
              >
                Continue with Google
              </a>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-medium text-gray-900">2. Subscribe</h2>
            <p className="mt-2 text-sm text-gray-600">
              After signing in, you’ll be prompted to select a plan. Billing is handled securely. If you don’t see the subscription step yet, a member of our team will enable it on your account.
            </p>
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-medium text-gray-900">3. Invite staff</h2>
            <p className="mt-2 text-sm text-gray-600">
              Add staff emails in the dashboard. Only those emails will be able to register using email + password. SSO sign‑in (Microsoft/Google) remains available if enabled.
            </p>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-800">Back to Home</a>
            <a href="/login" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">Already have an account? Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

