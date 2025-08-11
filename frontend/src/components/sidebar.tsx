"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, History } from "lucide-react";

interface SidebarProps {
  onStoreFilterChange?: (stores: string[]) => void;
  onProcessedRankingChange?: (value: number) => void;
  onMaxPriceChange?: (value: number) => void;
  onUploadReport?: (file?: File) => void;
  onShowHistory?: () => void;
  reportJson?: any | null;
  processing?: boolean;
}

export function Sidebar({ 
  onStoreFilterChange,
  onProcessedRankingChange,
  onMaxPriceChange,
  onUploadReport,
  onShowHistory,
  reportJson,
  processing
}: SidebarProps) {
  const [activeStores, setActiveStores] = useState<string[]>(['walmart', 'target', 'wholefoods']);
  const [processedRanking, setProcessedRanking] = useState([100]);
  const [maxPrice, setMaxPrice] = useState([100]);
  const [localProcessing, setLocalProcessing] = useState<boolean>(false);
  const isProcessing = (typeof processing === 'boolean') ? processing : localProcessing;



  const toggleStore = (store: string) => {
    const newStores = activeStores.includes(store) 
      ? activeStores.filter(s => s !== store)
      : [...activeStores, store];
    setActiveStores(newStores);
    onStoreFilterChange?.(newStores);
  };

  const handleProcessedRankingChange = (value: number[]) => {
    setProcessedRanking(value);
    onProcessedRankingChange?.(value[0]);
  };

  const handleMaxPriceChange = (value: number[]) => {
    setMaxPrice(value);
    onMaxPriceChange?.(value[0]);
  };

  const getProcessedRankingColor = (value: number) => {
    if (value <= 30) return "text-status-good";
    if (value <= 70) return "text-status-neutral";
    return "text-status-avoid";
  };

  const stores = [
    { 
      id: 'walmart', 
      name: 'Walmart', 
      logo: 'https://www.citypng.com/public/uploads/preview/hd-walmart-logo-transparent-background-701751694772120qyv216qgwf.png',
      color: 'border-blue-500'
    },
    { 
      id: 'target', 
      name: 'Target', 
      logo: 'https://logos-world.net/wp-content/uploads/2020/10/Target-Logo.png',
      color: 'border-red-500'
    },
    { 
      id: 'wholefoods', 
      name: 'Whole Foods', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Whole_Foods_Market_201x_logo.svg',
      color: 'border-green-500'
    }
  ];

  return (
    <div className="w-80 h-screen bg-gray-50 border-r-2 border-gray-200 flex flex-col fixed left-0 top-0 shadow-lg">
      
      {/* Logo Section */}
      <div className="p-6 border-b-2 border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border-4 border-black rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-black">V</span>
          </div>
          <h2 className="text-xl font-bold text-black">vitals</h2>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Store Filters */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Store Filters</h3>
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex">
              {stores.map((store, index) => {
                const isFirst = index === 0;
                const isLast = index === stores.length - 1;
                const isActive = activeStores.includes(store.id);
                
                return (
                  <Button
                    key={store.id}
                    variant="ghost"
                    className={`
                      flex-1 flex flex-col items-center justify-center p-3 h-20 border-0 transition-all duration-200
                      ${!isFirst ? 'border-l-2 border-gray-200' : ''}
                      ${isFirst ? 'rounded-l-lg' : ''}
                      ${isLast ? 'rounded-r-lg' : ''}
                      ${!isFirst && !isLast ? 'rounded-none' : ''}
                      ${isActive 
                        ? 'bg-emerald text-black shadow-sm hover:bg-emerald/90 z-10' 
                        : 'text-black hover:bg-gray-50'
                      }
                    `}
                    onClick={() => toggleStore(store.id)}
                  >
                    <img 
                      src={store.logo} 
                      alt={`${store.name} logo`}
                      className="w-8 h-6 object-contain mb-1"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('span');
                          fallback.className = 'text-lg mb-1';
                          fallback.textContent = store.id === 'walmart' ? '🏪' : store.id === 'target' ? '🎯' : '🥬';
                          parent.insertBefore(fallback, target);
                        }
                      }}
                    />
                    <span className="text-xs font-medium text-center">{store.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <Separator className="bg-border-gray" />

        {/* Processed Ranking Filter */}
        <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Processed Ranking</h3>
            <Badge 
              variant="secondary" 
              className={`${getProcessedRankingColor(processedRanking[0])} bg-white border-2 border-gray-300 font-mono px-2 py-1 text-black`}
            >
              {processedRanking[0]}/100
            </Badge>
          </div>
          <div className="px-2">
            <Slider
              value={processedRanking}
              onValueChange={handleProcessedRankingChange}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 font-medium mt-2">
              <span className="text-green-600">Less Processed</span>
              <span className="text-red-600">More Processed</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border-gray" />

        {/* Maximum Price Filter */}
        <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Maximum Price</h3>
            <Badge variant="secondary" className="text-emerald bg-white border-2 border-gray-300 font-mono px-2 py-1 text-black">
              ${maxPrice[0]}
            </Badge>
          </div>
          <div className="px-2">
            <Slider
              value={maxPrice}
              onValueChange={handleMaxPriceChange}
              max={200}
              min={5}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 font-medium mt-2">
              <span>$5</span>
              <span>$200+</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border-gray" />

        {/* Upload Section */}
        <div>
          {reportJson ? (
            <Card className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm text-left">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Report Overview</h3>
                {reportJson?.pdf?.url && (
                  <a href={reportJson.pdf.url} target="_blank" rel="noreferrer" className="text-xs text-emerald underline">View uploaded PDF</a>
                )}
                <div className="border rounded bg-gray-50 p-2 max-h-48 overflow-auto">
                  <pre className="text-[11px] leading-snug whitespace-pre-wrap break-words">{JSON.stringify(reportJson.data ?? reportJson, null, 2)}</pre>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
              <div className="text-center space-y-3">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold text-gray-800 text-base mb-2">Upload report for full details</p>
                  <p className="text-gray-600">Get personalized insights from your PDF lab report. We will extract key fields dynamically and show them here.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Buttons Section */}
      <div className="p-6 border-t-2 border-gray-200 bg-white space-y-3">
        <Button 
          onClick={() => {
            const input = document.getElementById('hidden-report-input') as HTMLInputElement | null;
            input?.click();
          }}
          className="w-full bg-emerald hover:bg-emerald/90 text-black border-2 border-emerald h-12 text-base font-semibold shadow-sm"
          size="lg"
        >
          <Upload className="mr-2 h-5 w-5" />
          {isProcessing ? 'Processing…' : 'Upload Blood Report'}
        </Button>
        <input
          id="hidden-report-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLocalProcessing(true);
              Promise.resolve(onUploadReport?.(file)).finally(() => setLocalProcessing(false));
            }
            // reset so selecting the same file again re-triggers
            e.currentTarget.value = '';
          }}
        />
        
        <Button 
          onClick={onShowHistory}
          variant="outline"
          className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-2 border-gray-300 text-sm h-8 font-medium"
          size="sm"
        >
          <History className="mr-2 h-4 w-4" />
          Show History
        </Button>
      </div>
    </div>
  );
}
