"use client";

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md p-8 text-center space-y-4 bg-white rounded-lg shadow-lg">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-600">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        {error.message && (
          <p className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button 
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            onClick={() => reset()}
          >
            Try Again
          </button>
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </button>
        </div>
      </div>
    </main>
  );
}


