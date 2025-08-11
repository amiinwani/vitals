"use client"

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface HeaderProps {
  onSearchChange?: (query: string) => void;
  selectedCategory?: string | null;
  onBackToCategories?: () => void;
}

export function Header({ onSearchChange, selectedCategory, onBackToCategories }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Keep search persistent across views

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
          <div className="w-full bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Categories/Back Button Section - Right after sidebar */}
          <div className="flex items-center ml-80">
            {selectedCategory ? (
              // Category View - Show back button and category name with spacing
              <div className="flex items-center gap-4">
                <button
                  onClick={onBackToCategories}
                  className="flex items-center gap-2 text-emerald hover:text-emerald/80 font-semibold text-lg px-4 py-2 rounded-lg hover:bg-emerald/10 transition-all duration-200"
                >
                  ← Back to Categories
                </button>
                <div className="h-8 w-px bg-gray-300"></div>
                <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap ml-4">{selectedCategory}</h2>
              </div>
            ) : (
              // Main View - Show Categories heading right after sidebar
              <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">Categories</h2>
            )}
          </div>
          
          {/* Search Bar - Complete right end */}
          <div className="w-96">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
              <Input
                placeholder="Search food by name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 border-2 border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white h-12 text-base rounded-xl shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
  );
}
