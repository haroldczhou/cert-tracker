'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                Keep staff certifications compliant and current
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Cert Tracker helps K–12 school districts track educator credentials, automate reminders, and stay audit‑ready.
              </p>
              <div className="mt-8 flex gap-4">
                <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-white text-base font-semibold shadow hover:bg-blue-700">
                  Sign in
                </Link>
                <Link href="/get-started" className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-gray-800 text-base font-semibold hover:bg-gray-50">
                  Get started (Admins)
                </Link>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                No account yet? District admins can create a workspace and invite staff.
              </div>
            </div>
            <div className="lg:justify-self-end">
              <div className="rounded-xl border border-gray-200 p-6 shadow-sm bg-white">
                <div className="text-sm text-gray-500 mb-3">At a glance</div>
                <ul className="space-y-3 text-gray-700">
                  <li>• Single dashboard for all expiring certifications</li>
                  <li>• Automated email reminders and evidence uploads</li>
                  <li>• School- and district‑level roles and permissions</li>
                  <li>• Secure sign‑in via Microsoft or Google</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Why Cert Tracker</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="font-medium text-gray-900">Reduce manual chase‑downs</div>
              <p className="mt-2 text-sm text-gray-600">Automated reminders keep staff on track—no more spreadsheets and email threads.</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="font-medium text-gray-900">Audit‑ready exports</div>
              <p className="mt-2 text-sm text-gray-600">Export certification status for compliance checks in seconds.</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="font-medium text-gray-900">District‑grade security</div>
              <p className="mt-2 text-sm text-gray-600">SSO, role‑based access, and data residency on Azure.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
