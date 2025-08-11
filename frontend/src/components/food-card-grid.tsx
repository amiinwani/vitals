"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodItemsFlow } from "./food-items-flow";
import Papa from 'papaparse';

interface ProductRow {
  original_ID: string;
  name: string;
  store: string;
  "harmonized single category": string;
  brand: string;
  f_FPro?: string; // 0..1
  price?: string;
  image_url?: string;
}

interface FoodCardGridProps {
  searchQuery?: string;
  activeStores?: string[]; // lowercase ids: ['walmart','target','wholefoods']
  processedRanking?: number;
  maxPrice?: number;
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string | null;
  onBackToCategories?: () => void;
}

const BACKEND_BASE = 'http://localhost:5002';

function toProxyUrl(trueFoodUrl: string | undefined): string | undefined {
  if (!trueFoodUrl) return undefined;
  // From: https://www.truefood.tech/grocery_image/{store}/{productId}
  // To:   http://localhost:5002/proxy-image/{store}/{productId}
  return trueFoodUrl.replace('https://www.truefood.tech/grocery_image', `${BACKEND_BASE}/proxy-image`);
}

function normalizeStore(store: string): string {
  // dataset uses Target, WholeFoods, Walmart
  // sidebar uses lowercase ids
  const s = store.toLowerCase();
  if (s.includes('whole')) return 'wholefoods';
  if (s.includes('target')) return 'target';
  if (s.includes('walmart')) return 'walmart';
  return s as string;
}

const STORE_LOGOS: Record<string, string> = {
  walmart: 'https://www.citypng.com/public/uploads/preview/hd-walmart-logo-transparent-background-701751694772120qyv216qgwf.png',
  target: 'https://logos-world.net/wp-content/uploads/2020/10/Target-Logo.png',
  wholefoods: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Whole_Foods_Market_201x_logo.svg'
};

interface FlowItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: string;
  store: string;
  fpro?: number; // 0..1
}

export function FoodCardGrid({ 
  searchQuery = '',
  activeStores = [],
  processedRanking = 100,
  maxPrice = 100,
  onCategorySelect,
  selectedCategory,
  onBackToCategories
}: FoodCardGridProps) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Papa.parse<ProductRow>(`/truefood_products_full.csv`, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data || []).filter((r) => r && r.name && r.store) as ProductRow[];
        setRows(parsed);
        setLoading(false);
      },
      error: (err) => {
        setError(err.message);
        setLoading(false);
      }
    });
  }, []);

  // Build categories with richer stats from dataset
  interface CategoryInfo {
    name: string;
    count: number;
    firstImage?: string;
    stores: string[]; // normalized ids
    avgPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    avgFpro?: number; // 0..1
    fproLowPct?: number; // <=0.3
    fproMidPct?: number; // (0.3,0.7)
    fproHighPct?: number; // >=0.7
    imageCoveragePct?: number; // 0..100
  }

  const categories = useMemo<CategoryInfo[]>(() => {
    const map = new Map<string, {
      name: string;
      count: number;
      firstImage?: string;
      storeSet: Set<string>;
      prices: number[];
      fpros: number[];
      imageCount: number;
    }>();

    for (const r of rows) {
      const cat = (r["harmonized single category"] || '').trim();
      if (!cat) continue;
      const entry = map.get(cat) || {
        name: cat,
        count: 0,
        firstImage: undefined,
        storeSet: new Set<string>(),
        prices: [],
        fpros: [],
        imageCount: 0,
      };
      entry.count += 1;
      const storeId = normalizeStore(r.store || '');
      if (storeId) entry.storeSet.add(storeId);
      const priceStr = (r as unknown as { price?: string }).price;
      const p = priceStr ? parseFloat(priceStr) : NaN;
      if (Number.isFinite(p)) entry.prices.push(Number(p.toFixed(2)));
      const fStr = (r as unknown as { f_FPro?: string }).f_FPro;
      const f = fStr ? parseFloat(fStr) : NaN;
      if (Number.isFinite(f)) entry.fpros.push(Math.max(0, Math.min(1, f)));
      if (!entry.firstImage && r.image_url) entry.firstImage = toProxyUrl(r.image_url);
      if (r.image_url) entry.imageCount += 1;
      map.set(cat, entry);
    }

    const computed: CategoryInfo[] = [];
    for (const entry of map.values()) {
      const { name, count, firstImage, storeSet, prices, fpros, imageCount } = entry;
      const stores = Array.from(storeSet);
      const avgPrice = prices.length ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : undefined;
      const minPrice = prices.length ? Math.min(...prices) : undefined;
      const maxPrice = prices.length ? Math.max(...prices) : undefined;
      const avgFpro = fpros.length ? Number((fpros.reduce((a, b) => a + b, 0) / fpros.length).toFixed(3)) : undefined;
      const low = fpros.filter(v => v <= 0.3).length;
      const high = fpros.filter(v => v >= 0.7).length;
      const mid = fpros.length - low - high;
      const denom = Math.max(1, fpros.length);
      const fproLowPct = Math.round((low / denom) * 100);
      const fproMidPct = Math.round((mid / denom) * 100);
      const fproHighPct = Math.round((high / denom) * 100);
      const imageCoveragePct = Math.round((imageCount / Math.max(1, count)) * 100);
      computed.push({
        name,
        count,
        firstImage,
        stores,
        avgPrice,
        minPrice,
        maxPrice,
        avgFpro,
        fproLowPct,
        fproMidPct,
        fproHighPct,
        imageCoveragePct
      });
    }

    // Apply search filter here for category list
    const filtered = computed.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Sort alphabetically for stable UI
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [rows, searchQuery]);

  // Items for a selected category, filtered by sidebar filters
  const flowItems = useMemo<FlowItem[]>(() => {
    if (!selectedCategory) return [];
    const items = rows.filter(r => (r["harmonized single category"] || '') === selectedCategory);

    const filteredByStore = items.filter(r => {
      const storeId = normalizeStore(r.store);
      return activeStores.length === 0 || activeStores.includes(storeId);
    });

    const filteredByPrice = filteredByStore.filter(r => {
      const priceStr = (r as unknown as { price?: string }).price;
      const price = priceStr ? parseFloat(priceStr) : NaN;
      if (Number.isNaN(price)) return true;
      return price <= maxPrice;
    });

    // processedRanking is 1..100 → convert to 0..1 threshold
    const processedThreshold = Math.min(100, Math.max(1, processedRanking)) / 100;

    const filteredByProcessed = filteredByPrice.filter(r => {
      const fproStr = (r as unknown as { f_FPro?: string }).f_FPro;
      const fpro = fproStr ? parseFloat(fproStr) : NaN;
      if (Number.isNaN(fpro)) return true; // keep if unknown
      return fpro <= processedThreshold;
    });

    return filteredByProcessed.map((r, idx) => ({
      id: r.original_ID || `${r.name}-${idx}`,
      name: r.name,
      image: toProxyUrl(r.image_url) || '',
      price: (() => {
        const priceStr = (r as unknown as { price?: string }).price;
        const p = priceStr ? parseFloat(priceStr) : NaN;
        return Number.isFinite(p) ? Number(p.toFixed(2)) : 0;
      })(),
      rating: '',
      store: (r.store || '').replace('Whole Foods', 'WholeFoods'),
      fpro: (() => {
        const fproStr = (r as unknown as { f_FPro?: string }).f_FPro;
        const v = fproStr ? parseFloat(fproStr) : NaN;
        return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined;
      })()
    }));
  }, [rows, selectedCategory, activeStores, maxPrice, processedRanking]);

  if (selectedCategory) {
    return (
      <div className="h-full flex flex-col bg-gray-50 min-h-0">
        <div className="flex items-center justify-between px-6 pt-4">
          <h2 className="text-lg font-semibold">{selectedCategory}</h2>
          {onBackToCategories && (
            <button
              className="text-sm text-emerald hover:underline"
              onClick={() => onBackToCategories()}
            >
              Back to categories
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <FoodItemsFlow 
            items={flowItems} 
            categoryName={selectedCategory} 
            searchQuery={searchQuery}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading dataset…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-600">Failed to load CSV: {error}</div>;
  }

  return (
    <div className="h-full bg-gray-50 overflow-hidden min-h-0">
      <div className="h-full overflow-y-auto overflow-x-hidden min-h-0" style={{ touchAction: 'pan-y' }}>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card 
                key={category.name}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-200 hover:border-emerald bg-white"
                onClick={() => onCategorySelect?.(category.name)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Hero with overlay */}
                    <div className="relative w-full h-28 rounded-lg overflow-hidden">
                      {category.firstImage ? (
                        <img
                          src={category.firstImage}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald/20 to-yellow-200" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-start">
                        <h3 className="font-bold text-lg text-black bg-white/90 rounded px-2 py-0.5">{category.name}</h3>
                      </div>
                    </div>

                    {/* Stores */}
                    <div className="flex items-center gap-2">
                        {category.stores.slice(0,3).map((s) => (
                          <img key={s} src={STORE_LOGOS[s]} alt={s} className="w-6 h-4 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ))}
                        {category.stores.length > 3 && (
                          <span className="text-xs text-gray-500">+{category.stores.length - 3}</span>
                        )}
                    </div>

                    {/* Subtle Processing indicator */}
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-200">
                        <div className="w-full h-full flex">
                          <div className="h-full bg-green-500" style={{ width: `${category.fproLowPct ?? 0}%` }} />
                          <div className="h-full bg-yellow-500" style={{ width: `${category.fproMidPct ?? 0}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${category.fproHighPct ?? 0}%` }} />
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-600">
                        <span>Low {category.fproLowPct ?? 0}%</span>
                        <span>Mid {category.fproMidPct ?? 0}%</span>
                        <span>High {category.fproHighPct ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
