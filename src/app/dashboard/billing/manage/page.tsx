'use client';

import React from 'react';

export default function ManageSubscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Manage subscription</h1>
        <p className="mt-2 text-gray-600">
          A customer portal link will appear here once Stripe is connected. You’ll be able to update payment methods, view invoices, and cancel.
        </p>
        <div className="mt-6">
          <button
            onClick={() => alert('Stripe customer portal will open here once configured.')}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-gray-800 font-medium hover:bg-gray-50"
          >
            Open customer portal
          </button>
          <a href="/dashboard/billing" className="ml-3 text-gray-700 hover:text-gray-900">Back to billing</a>
        </div>
      </div>
    </div>
  );
}

