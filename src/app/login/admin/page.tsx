'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const postLogin = '/onboarding';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-semibold mb-1">Admin sign in</h1>
        <p className="text-gray-600 mb-6 text-sm">Use your organization account (Microsoft or Google).</p>
        <div className="space-y-3">
          <a
            className="block w-full text-center text-white rounded-md py-2 transition-colors bg-[#2F2F2F] hover:bg-black"
            href={`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(postLogin)}`}
          >
            Sign in with Microsoft
          </a>
          <a
            className="block w-full text-center rounded-md py-2 transition-colors bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
            href={`/.auth/login/google?post_login_redirect_uri=${encodeURIComponent(postLogin)}`}
          >
            Sign in with Google
          </a>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">
          Staff? <Link href="/login/staff" className="text-blue-600 hover:underline">Use email sign-in</Link>.
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

