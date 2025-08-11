"use client"

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FoodItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: string;
  store: string;
  fpro?: number; // 0..1
}

interface FoodItemsFlowProps {
  items: FoodItem[];
  categoryName: string;
  searchQuery?: string;
}

// Custom node data type for React Flow nodes
interface FlowNodeData extends Record<string, unknown> {
  label: string;
  item: FoodItem;
  categoryName: string;
}

type FlowNode = Node<FlowNodeData>;

// Store logo mapping
const STORE_LOGOS: Record<string, string> = {
  Walmart: 'https://www.citypng.com/public/uploads/preview/hd-walmart-logo-transparent-background-701751694772120qyv216qgwf.png',
  Target: 'https://logos-world.net/wp-content/uploads/2020/10/Target-Logo.png',
  WholeFoods: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Whole_Foods_Market_201x_logo.svg'
};

export function FoodItemsFlow({ items, categoryName, searchQuery = '' }: FoodItemsFlowProps) {
  // Generate nodes from food items
  const generateNodes = (): FlowNode[] => {
    const nodes: FlowNode[] = [];
    const columns = 5;
    const nodeWidth = 280;
    const nodeHeight = 200;
    const horizontalSpacing = 320;
    const verticalSpacing = 250;
    
    items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = col * horizontalSpacing + 50;
      const y = row * verticalSpacing + 50;

      nodes.push({
        id: item.id,
        position: { x, y },
        data: { 
          label: item.name,
          item: item,
          categoryName: categoryName
        },
        type: 'default',
        style: {
          width: nodeWidth,
          height: nodeHeight,
          background: 'white',
          border: '2px solid #E0E0E0',
          borderRadius: '12px',
          padding: '0px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '14px',
          fontWeight: '500'
        },
        draggable: true
      } as FlowNode);
    });
    
    return nodes;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [offData, setOffData] = useState<any | null>(null);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);
  const lastQueryRef = useRef<string>('');

  // Basic in-memory image cache using browser Cache API fallback to img tag cache
  const [imageBlobUrlBySrc, setImageBlobUrlBySrc] = useState<Map<string, string>>(new Map());
  const getCachedImageSrc = (src: string) => imageBlobUrlBySrc.get(src) || src;

  // Prefetch and cache images as blob URLs so reloads use browser cache
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    const prefetch = async () => {
      const newMap = new Map(imageBlobUrlBySrc);
      for (const it of items) {
        const src = it.image;
        if (!src || newMap.has(src)) continue;
        try {
          const resp = await fetch(src, { signal: controller.signal, cache: 'force-cache' });
          if (!resp.ok) continue;
          const blob = await resp.blob();
          if (isCancelled) return;
          const url = URL.createObjectURL(blob);
          newMap.set(src, url);
        } catch (_) {
          // ignore
        }
      }
      if (!isCancelled) setImageBlobUrlBySrc(newMap);
    };
    prefetch();
    return () => {
      isCancelled = true;
      controller.abort();
      // revoke created blob URLs
      imageBlobUrlBySrc.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Update nodes when items or search change
  useEffect(() => {
    const newNodes = generateNodes();
    setNodes(newNodes.map(n => {
      const item = (n.data as FlowNodeData).item as FoodItem;
      const q = (searchQuery || '').trim().toLowerCase();
      const hidden = q ? !item.name.toLowerCase().includes(q) : false;
      const fproPct = typeof item.fpro === 'number' ? Math.round(item.fpro * 100) : undefined;
      const band = typeof fproPct === 'number' ? (fproPct <= 40 ? 'green' : fproPct <= 60 ? 'yellow' : 'red') : 'gray';
      const containerBg = band === 'green' ? '#dcfce7' : band === 'yellow' ? '#fef9c3' : band === 'red' ? '#fee2e2' : '#f9fafb';
      const borderColor = band === 'green' ? '#86efac' : band === 'yellow' ? '#fde047' : band === 'red' ? '#fca5a5' : '#e5e7eb';
      return { ...n, hidden, style: { ...n.style, background: containerBg, border: `2px solid ${borderColor}` } } as FlowNode;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, categoryName, searchQuery]);

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const getFirstWords = (s: string, count = 3) => normalize(s).split(' ').filter(Boolean).slice(0, count).join(' ');

  const fetchOpenFoodFacts = async (name: string) => {
    try {
      setOffLoading(true);
      setOffError(null);
      setOffData(null);
      const query = (name || '').trim();
      lastQueryRef.current = query;
      const terms = normalize(query);
      console.log('[OFF] click', { name, query, terms });
      const ts = Date.now();
      const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(terms)}&page_size=50&fields=code,product_name,product_name_en,product_name_fr,brands,categories,nutriscore_grade,url&lc=en&sort_by=popularity_key&_=${ts}`;
      console.log('[OFF] request', url);
      const res = await fetch(url, { headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }, cache: 'no-store' });
      console.log('[OFF] response status', res.status, 'ok', res.ok);
      if (!res.ok) throw new Error(`OFF v2 search failed (${res.status})`);
      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error('[OFF] failed to parse JSON');
        throw e;
      }
      const arr = (data && (data.products || data.items || [])) as any[];
      console.log('[OFF] products count', Array.isArray(arr) ? arr.length : 0);
      let picked: any | null = null;
      if (Array.isArray(arr) && arr.length > 0) {
        // As requested: just pick the first result returned by OFF
        picked = arr[0];
        console.log('[OFF] picked first result', { code: picked?.code, name: picked?.product_name });
      }
      if (lastQueryRef.current !== query) return;
      if (picked) {
        setOffData({ product: picked });
        console.log('[OFF] final selection', { code: picked.code, name: picked.product_name, brands: picked.brands });
      } else {
        setOffError('No results found on Open Food Facts');
        console.warn('[OFF] no results for query');
      }
    } catch (e: any) {
      console.error('[OFF] error', e);
      setOffError(e?.message || 'Failed to fetch');
    } finally {
      setOffLoading(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Custom node renderer
  const humanStoreName = (store: string) => {
    if (store === 'WholeFoods') return 'Whole Foods';
    return store;
  };

  const nodeTypes = useMemo(() => ({
    default: ({ data }: { data: FlowNodeData }) => {
      const item = data.item as FoodItem;
      const storeKey = item.store as keyof typeof STORE_LOGOS;
      const storeLogo = STORE_LOGOS[storeKey] || '';
      const formattedPrice = typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0 ? `$${item.price}` : '';
      const ratingText = item.rating ? `${item.rating}⭐` : '';
      const fproPct = typeof item.fpro === 'number' ? Math.round(item.fpro * 100) : undefined;
      const band = typeof fproPct === 'number' ? (fproPct <= 40 ? 'green' : fproPct <= 60 ? 'yellow' : 'red') : 'gray';
      const fproColor = band === 'green' ? 'bg-green-500' : band === 'yellow' ? 'bg-yellow-500' : band === 'red' ? 'bg-red-500' : 'bg-gray-300';
      
      return (
        <div
          className="w-full h-full rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group relative"
          onClick={() => { setSelectedItem(item); fetchOpenFoodFacts(item.name); }}
        >
          {/* Processing score ribbon outside top-left */}
          <div className="absolute -ml-2 -mt-2">
            {typeof fproPct === 'number' && (
              <Badge className={`${fproColor} text-white px-2 py-0.5 text-[10px] rounded-sm`}>{fproPct}/100</Badge>
            )}
          </div>
          <div className="h-24 bg-gray-100 overflow-hidden">
            <img
              src={getCachedImageSrc(item.image)}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <div className="p-3 space-y-2">
            <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight">
              {item.name}
            </h3>
            <div className="flex justify-between items-center">
              {formattedPrice && (
                <span className="text-lg font-bold text-emerald">{formattedPrice}</span>
              )}
              {ratingText && (
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {ratingText}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              {storeLogo && (
                <img
                  src={storeLogo}
                  alt={`${humanStoreName(item.store)} logo`}
                  className="w-4 h-3 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              <span className="text-xs text-gray-600 font-medium">{humanStoreName(item.store)}</span>
            </div>
            {/* External processing bar */}
            {typeof fproPct === 'number' && (
              <div className="pt-1">
                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${fproColor}`}
                    style={{ width: `${fproPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }), []);

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
          maxZoom: 2,
          minZoom: 0.3
        }}
        onInit={(instance) => {
          // After fitView, zoom out 2x relative to current zoom
          setTimeout(() => {
            try {
              const current = typeof (instance as any).getZoom === 'function' ? (instance as any).getZoom() : 1;
              const target = Math.max(0.3, current / 2);
              instance.zoomTo(target);
            } catch {}
          }, 0);
        }}
      >
        <Background 
          color="#E0E0E0" 
          gap={30} 
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls 
          className="bg-white border border-gray-300 shadow-lg rounded-lg"
          showInteractive={false}
        />
        <MiniMap 
          className="bg-white border border-gray-300 rounded-lg"
          nodeColor={() => '#2ECC71'}
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
      </ReactFlow>
      {/* Details Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setSelectedItem(null); setOffData(null); setOffError(null); }}>
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{selectedItem.name}</h3>
              <Button variant="outline" onClick={() => { setSelectedItem(null); setOffData(null); setOffError(null); }}>Close</Button>
            </div>
            <div className="flex gap-4">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-28 h-28 object-cover rounded border" />
              <div className="flex-1 space-y-2">
                <div className="text-sm text-gray-700">Store: {humanStoreName(selectedItem.store)}</div>
                {Number.isFinite(selectedItem.price) && selectedItem.price > 0 && (
                  <div className="text-sm text-gray-700">Price: ${selectedItem.price}</div>
                )}
                {selectedItem.fpro !== undefined && (
                  <div className="text-sm text-gray-700">Processing score: {Math.round(selectedItem.fpro * 100)}/100</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Open Food Facts</h4>
              {offLoading && <div className="text-sm text-gray-600">Loading…</div>}
              {offError && <div className="text-sm text-red-600">{offError}</div>}
              {offData && (
                <div className="text-sm text-gray-800 space-y-1">
                  <div><span className="font-medium">Product:</span> {offData.product?.product_name || '—'}</div>
                  <div><span className="font-medium">Brands:</span> {offData.product?.brands || '—'}</div>
                  <div><span className="font-medium">Categories:</span> {offData.product?.categories || '—'}</div>
                  <div><span className="font-medium">NutriScore:</span> {offData.product?.nutriscore_grade || '—'}</div>
                  <a className="text-emerald underline" href={offData.product?.code ? `https://world.openfoodfacts.org/product/${offData.product.code}` : '#'} target="_blank" rel="noreferrer">View on Open Food Facts</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
