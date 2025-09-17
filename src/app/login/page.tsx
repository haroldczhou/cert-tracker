'use client';

import React from 'react';
import Link from 'next/link';

// Kept as a simple chooser directing to role-specific pages.

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-gray-600 mb-6 text-sm">Choose the sign‑in path that fits your role.</p>

        <div className="space-y-3">
          <Link href="/login/admin" className="block w-full text-center text-white rounded-md py-2 transition-colors bg-[#2F2F2F] hover:bg-black">Admin sign in (Microsoft/Google)</Link>
          <Link href="/login/staff" className="block w-full text-center text-white rounded-md py-2 transition-colors bg-blue-600 hover:bg-blue-700">Staff sign in (Email)</Link>
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
