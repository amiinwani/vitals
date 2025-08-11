"use client"

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { FoodCardGrid } from '@/components/food-card-grid';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const BACKEND_BASE = 'http://localhost:5002';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStores, setActiveStores] = useState<string[]>(['walmart', 'target', 'wholefoods']);
  // Processed ranking now 1..100 scale
  const [processedRanking, setProcessedRanking] = useState(100);
  const [maxPrice, setMaxPrice] = useState(100);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [reportJson, setReportJson] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadReport = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setReportJson(null);
    const toastId = toast.loading('Processing your report…');
    try {
      const form = new FormData();
      form.append('pdf', file);
      const res = await fetch(`${BACKEND_BASE}/upload-report`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const json = await res.json();
      setReportJson(json);
      toast.success('Report processed');
      toast.dismiss(toastId);
    } catch (e: any) {
      toast.error('Failed to process report', { description: e.message });
      toast.dismiss(toastId);
    } finally {
      setUploading(false);
    }
  };

  const handleShowHistory = () => {
    toast.info('History feature coming soon!', {
      description: 'View your previous uploads and analysis results here.'
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStoreFilterChange = (stores: string[]) => {
    setActiveStores(stores);
  };

  const handleProcessedRankingChange = (value: number) => {
    setProcessedRanking(value);
  };

  const handleMaxPriceChange = (value: number) => {
    setMaxPrice(value);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="h-full overflow-hidden bg-white flex flex-col">
      {/* Fixed Header */}
      <Header 
        onSearchChange={handleSearchChange} 
        selectedCategory={selectedCategory}
        onBackToCategories={handleBackToCategories}
      />
      
      <div className="flex flex-1 min-h-0">
        {/* Fixed Sidebar */}
        <Sidebar
          onStoreFilterChange={handleStoreFilterChange}
          onProcessedRankingChange={handleProcessedRankingChange}
          onMaxPriceChange={handleMaxPriceChange}
          onUploadReport={handleUploadReport}
          onShowHistory={handleShowHistory}
          reportJson={reportJson}
          processing={uploading}
        />
        
        {/* Main Content Area - Offset by sidebar width */}
        <div className="ml-80 flex-1 h-full min-h-0">
          {uploading && <div className="p-4 text-sm text-gray-600">Processing report…</div>}
          {reportJson && <div className="p-4" />}
          <FoodCardGrid
            searchQuery={searchQuery}
            activeStores={activeStores}
            processedRanking={processedRanking}
            maxPrice={maxPrice}
            onCategorySelect={handleCategorySelect}
            selectedCategory={selectedCategory}
            onBackToCategories={handleBackToCategories}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
