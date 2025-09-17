'use client';

import React from 'react';
import Link from 'next/link';

const providers = [
  { key: 'b2c', name: 'Email + Password', style: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'aad', name: 'Sign in with Microsoft', style: 'bg-[#2F2F2F] hover:bg-black' },
  { key: 'google', name: 'Sign in with Google', style: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' },
  { key: 'github', name: 'Sign in with GitHub', style: 'bg-gray-800 hover:bg-gray-900' },
  // Add more if enabled in SWA: { key: 'twitter', name: 'Twitter' }
];

export default function LoginPage() {
  const postLogin = '/onboarding';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-semibold mb-1">Welcome</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Choose a sign-in method. After signing in, we verify your email against the pre‑approved staff list.
        </p>

        <div className="space-y-3">
          {providers.map((p) => (
            <a
              key={p.key}
              className={`block w-full text-center text-white rounded-md py-2 transition-colors ${p.style}`}
              href={`/.auth/login/${p.key}?post_login_redirect_uri=${encodeURIComponent(postLogin)}`}
            >
              {p.name}
            </a>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          District admin? <Link href="/get-started" className="text-blue-600 hover:underline">Get started</Link> or <Link href="/get-started/create-workspace" className="text-blue-600 hover:underline">create a workspace</Link>.
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
