'use client';

import React from 'react';
import Dashboard from '@/components/Dashboard';
import PdfUpload from '@/components/PdfUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PDF Upload Section */}
        <div className="mb-8">
          <PdfUpload onUploadSuccess={() => window.location.reload()} />
        </div>
        
        {/* Dashboard */}
        <Dashboard />
      </div>
    </div>
  );
}
