'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Filter, 
  Search, 
  Store, 
  Tag, 
  DollarSign, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  X,
  Sliders
} from 'lucide-react';
import { 
  FilterOptions, 
  EXPLORE_CATEGORIES, 
  AVAILABLE_STORES, 
  NUTRITION_RANGES,
  trueFoodDataManager 
} from '@/lib/truefood-data';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentMode: 'explore' | 'popular';
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  onBackToCategories?: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  currentMode,
  filters,
  onFiltersChange,
  selectedCategory,
  onCategorySelect,
  onBackToCategories
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'nutrition' | 'stores'>('filters');

  const updateFilters = (updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStore = (store: string) => {
    const newStores = filters.stores.includes(store)
      ? filters.stores.filter(s => s !== store)
      : [...filters.stores, store];
    updateFilters({ stores: newStores });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      stores: [],
      categories: [],
      priceRange: [0, 100],
      nutritionFilters: {
        protein: [0, 50],
        fat: [0, 100],
        carbs: [0, 100],
        sugar: [0, 100],
        fiber: [0, 50],
        sodium: [0, 5000]
      },
      searchQuery: ''
    });
  };

  const hasActiveFilters = filters.stores.length > 0 || 
                          filters.categories.length > 0 || 
                          filters.searchQuery || 
                          filters.priceRange[0] > 0 || 
                          filters.priceRange[1] < 100;

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-50",
      isOpen ? "w-80" : "w-0",
      isCollapsed && "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-gray-600" />
          {!isCollapsed && (
            <span className="font-semibold text-gray-800">
              {currentMode === 'popular' ? 'Popular Foods' : 'Explore Foods'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCollapsed && hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col h-full">
          {/* Mode Toggle */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onToggle()}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  currentMode === 'explore' 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Explore
              </button>
              <button
                onClick={() => onToggle()}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  currentMode === 'popular' 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Popular
              </button>
            </div>
          </div>

          {/* Explore Mode - Category Navigation */}
          {currentMode === 'explore' && (
            <div className="flex-1 overflow-y-auto">
              {!selectedCategory ? (
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Categories ({EXPLORE_CATEGORIES.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {EXPLORE_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => onCategorySelect?.(category)}
                        className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <span className="font-medium text-gray-800">{category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <button
                    onClick={onBackToCategories}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Categories
                  </button>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {selectedCategory}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Browse products in this category
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Popular Mode - Filters */}
          {currentMode === 'popular' && (
            <div className="flex-1 overflow-y-auto">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search foods..."
                    value={filters.searchQuery}
                    onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('filters')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'filters' 
                      ? "border-blue-500 text-blue-600" 
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  )}
                >
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filters
                </button>
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'nutrition' 
                      ? "border-blue-500 text-blue-600" 
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  )}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  Nutrition
                </button>
                <button
                  onClick={() => setActiveTab('stores')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'stores' 
                      ? "border-blue-500 text-blue-600" 
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  )}
                >
                  <Store className="w-4 h-4 inline mr-2" />
                  Stores
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'filters' && (
                  <div className="p-4 space-y-6">
                    {/* Categories */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Categories</h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {trueFoodDataManager.getCategories().map((category) => (
                          <label key={category} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.categories.includes(category)}
                              onChange={() => toggleCategory(category)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Price Range
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>${filters.priceRange[0]}</span>
                          <span>${filters.priceRange[1]}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={filters.priceRange[1]}
                          onChange={(e) => updateFilters({ 
                            priceRange: [filters.priceRange[0], parseInt(e.target.value)] 
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'nutrition' && (
                  <div className="p-4 space-y-6">
                    {/* Protein */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Protein (g)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.protein[0]}g</span>
                          <span>{filters.nutritionFilters.protein[1]}g</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.protein[0]}
                          max={NUTRITION_RANGES.protein[1]}
                          step="1"
                          value={filters.nutritionFilters.protein[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              protein: [filters.nutritionFilters.protein[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Fat */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Total Fat (g)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.fat[0]}g</span>
                          <span>{filters.nutritionFilters.fat[1]}g</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.fat[0]}
                          max={NUTRITION_RANGES.fat[1]}
                          step="1"
                          value={filters.nutritionFilters.fat[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              fat: [filters.nutritionFilters.fat[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Carbs */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Carbohydrates (g)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.carbs[0]}g</span>
                          <span>{filters.nutritionFilters.carbs[1]}g</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.carbs[0]}
                          max={NUTRITION_RANGES.carbs[1]}
                          step="1"
                          value={filters.nutritionFilters.carbs[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              carbs: [filters.nutritionFilters.carbs[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Sugar */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Sugar (g)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.sugar[0]}g</span>
                          <span>{filters.nutritionFilters.sugar[1]}g</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.sugar[0]}
                          max={NUTRITION_RANGES.sugar[1]}
                          step="1"
                          value={filters.nutritionFilters.sugar[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              sugar: [filters.nutritionFilters.sugar[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Fiber */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Fiber (g)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.fiber[0]}g</span>
                          <span>{filters.nutritionFilters.fiber[1]}g</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.fiber[0]}
                          max={NUTRITION_RANGES.fiber[1]}
                          step="1"
                          value={filters.nutritionFilters.fiber[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              fiber: [filters.nutritionFilters.fiber[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Sodium */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Sodium (mg)</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{filters.nutritionFilters.sodium[0]}mg</span>
                          <span>{filters.nutritionFilters.sodium[1]}mg</span>
                        </div>
                        <input
                          type="range"
                          min={NUTRITION_RANGES.sodium[0]}
                          max={NUTRITION_RANGES.sodium[1]}
                          step="50"
                          value={filters.nutritionFilters.sodium[1]}
                          onChange={(e) => updateFilters({
                            nutritionFilters: {
                              ...filters.nutritionFilters,
                              sodium: [filters.nutritionFilters.sodium[0], parseInt(e.target.value)]
                            }
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stores' && (
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Available Stores</h3>
                    <div className="space-y-3">
                      {AVAILABLE_STORES.map((store) => (
                        <label key={store} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={filters.stores.includes(store)}
                            onChange={() => toggleStore(store)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{store}</span>
                            <div className="text-sm text-gray-500">
                              {trueFoodDataManager.getProductsByStore(store).length} products
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex flex-col items-center py-4 space-y-4">
          <button
            onClick={() => setActiveTab('filters')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTab === 'filters' ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
            )}
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTab === 'nutrition' ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
            )}
            title="Nutrition"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTab === 'stores' ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
            )}
            title="Stores"
          >
            <Store className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
