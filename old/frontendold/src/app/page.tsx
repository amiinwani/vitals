'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { 
  getRandomProducts, 
  getProductImageUrl, 
  getProductName,
  OpenFoodFactsProduct
} from '../lib/openfoodfacts';
import { 
  trueFoodDataManager, 
  TrueFoodProduct, 
  FilterOptions
} from '../lib/truefood-data';
import { Sidebar } from '@/components/ui/sidebar';
import { FoodDetailsDialog } from '@/components/ui/food-details-dialog';
import { cn } from '@/lib/utils';

// Types
interface FoodData {
  name: string;
  image?: string;
  product?: OpenFoodFactsProduct | TrueFoodProduct;
  width?: number;
  height?: number;
  darkMode?: boolean;
}

// Grid constants
const CARD_WIDTH = 270;
const CARD_HEIGHT = 315;
const GRID_CELL_WIDTH = CARD_WIDTH + 40;
const GRID_CELL_HEIGHT = CARD_HEIGHT + 50;
const GRID_BUFFER_CELLS = 1;

function getNutriScoreStyle(grade?: string): { border: string; bar: string; startHex: string } {
  const g = (grade || '').toLowerCase();
  switch (g) {
    case 'a':
      return { border: 'border-green-400', bar: 'bg-green-100', startHex: '#22c55e' };
    case 'b':
      return { border: 'border-green-300', bar: 'bg-green-100', startHex: '#86efac' };
    case 'c':
      return { border: 'border-rose-200', bar: 'bg-rose-100', startHex: '#fecaca' };
    case 'd':
      return { border: 'border-rose-300', bar: 'bg-rose-100', startHex: '#fda4af' };
    case 'e':
      return { border: 'border-red-400', bar: 'bg-rose-100', startHex: '#ef4444' };
    default:
      return { border: 'border-gray-200', bar: 'bg-gray-100', startHex: '#f3f4f6' };
  }
}

// Custom Food Node Component
const FoodNode = ({ data }: { data: FoodData }) => {
  const isTrueFoodProduct = 'original_ID' in (data?.product || {});
  const nutriScore = isTrueFoodProduct ? 
    (data?.product as TrueFoodProduct)?.f_FPro_class : 
    (data?.product as OpenFoodFactsProduct)?.nutrition_grades;
  
  const nutri = getNutriScoreStyle(nutriScore);
  const borderClass = data?.darkMode ? `${nutri.border}` : `${nutri.border}`;
  
  return (
    <div
      className={cn(
        "relative rounded-xl p-3 border cursor-pointer select-none shadow-2xl",
        data?.darkMode ? 'bg-white/90' : 'bg-white',
        borderClass
      )}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        boxShadow: '0 20px 40px rgba(0,0,0,0.35)'
      }}
    >
      {/* Nutri-score sticker (top-left) */}
      <div className="absolute top-2 left-2 z-20">
        <div
          className="w-7 h-7 rounded-full ring-2 ring-white shadow-md flex items-center justify-center"
          style={{ backgroundColor: nutri.startHex }}
        >
          <span className="text-[10px] font-bold text-white">
            {(nutriScore || '').toString().toUpperCase().slice(0,1)}
          </span>
        </div>
      </div>
      
      <div className={cn(
        "rounded-md overflow-hidden mb-2 flex items-center justify-center bg-transparent"
      )} style={{ width: CARD_WIDTH - 12, height: CARD_HEIGHT - 72 }}>
        <img
          src={data.image || '/placeholder-food.svg'}
          alt={data.name}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-food.svg';
          }}
        />
      </div>
      
      <div
        className={cn(
          "text-lg text-center font-semibold leading-tight",
          data?.darkMode ? 'text-gray-200' : 'text-gray-800'
        )}
        style={{ 
          width: CARD_WIDTH - 12, 
          height: 54, 
          overflow: 'hidden', 
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical' 
        }}
      >
        {data.name}
      </div>
    </div>
  );
};

// Skeleton Node for loading
const SkeletonNode = () => (
  <div className="rounded-xl p-3 border border-gray-200 bg-white shadow-xl animate-pulse" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
    <div className="rounded-md mb-2 bg-gray-200" style={{ width: CARD_WIDTH - 12, height: CARD_HEIGHT - 58 }} />
    <div className="h-4 bg-gray-200 rounded w-2/3 mx-1" />
  </div>
);

// Node types
const nodeTypes = {
  foodNode: FoodNode,
  skeletonNode: SkeletonNode,
};

// Grid helpers
const cellKey = (col: number, row: number) => `${col}:${row}`;

function getVisibleGridRange(viewport: { x: number; y: number; zoom: number }) {
  const { x, y, zoom } = viewport;
  const vw = window.innerWidth / zoom;
  const vh = window.innerHeight / zoom;
  const left = -x;
  const top = -y;
  const right = left + vw;
  const bottom = top + vh;

  const startCol = Math.floor(left / GRID_CELL_WIDTH) - GRID_BUFFER_CELLS;
  const endCol = Math.ceil(right / GRID_CELL_WIDTH) + GRID_BUFFER_CELLS;
  const startRow = Math.floor(top / GRID_CELL_HEIGHT) - GRID_BUFFER_CELLS;
  const endRow = Math.ceil(bottom / GRID_CELL_HEIGHT) + GRID_BUFFER_CELLS;

  return { startCol, endCol, startRow, endRow };
}

function cellToPosition(col: number, row: number) {
  return {
    x: col * GRID_CELL_WIDTH + Math.round((GRID_CELL_WIDTH - CARD_WIDTH) / 2),
    y: row * GRID_CELL_HEIGHT + Math.round((GRID_CELL_HEIGHT - CARD_HEIGHT) / 2),
  };
}

// Create nodes for specific cells
function createFoodNodesForCells(
  products: (OpenFoodFactsProduct | TrueFoodProduct)[],
  cells: Array<{ col: number; row: number }>,
  darkModeFlag?: boolean
): Node[] {
  return products.slice(0, cells.length).map((product, index) => {
    const { col, row } = cells[index];
    const { x, y } = cellToPosition(col, row);
    const key = cellKey(col, row);
    
    const isTrueFoodProduct = 'original_ID' in product;
    const name = isTrueFoodProduct ? product.name : getProductName(product as OpenFoodFactsProduct);
    const image = isTrueFoodProduct ? product.image_url : getProductImageUrl(product as OpenFoodFactsProduct);
    
    return {
      id: `food-${key}`,
      type: 'foodNode',
      position: { x, y },
      data: {
        name,
        image,
        product,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        darkMode: darkModeFlag,
      },
      draggable: true,
      selectable: true,
    } as Node;
  });
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Main component
function FoodCanvas() {
  const reactFlowInstance = useReactFlow();
  const filledCellsRef = useRef<Set<string>>(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentMode, setCurrentMode] = useState<'explore' | 'popular'>('explore');
  const [showSkeletonLoading, setShowSkeletonLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [dataLoaded, setDataLoaded] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
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

  // Load TrueFood data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await trueFoodDataManager.loadData();
        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to load TrueFood data:', error);
      }
    };
    loadData();
  }, []);

  // Viewport-based loading for Explore mode
  const loadFoodItemsInViewport = useCallback(async () => {
    if (!reactFlowInstance || loading || currentMode !== 'explore') return;

    const range = getVisibleGridRange(reactFlowInstance.getViewport());
    const cellsToFill: Array<{ col: number; row: number }> = [];
    
    for (let col = range.startCol; col <= range.endCol; col++) {
      for (let row = range.startRow; row <= range.endRow; row++) {
        const key = cellKey(col, row);
        if (!filledCellsRef.current.has(key)) {
          cellsToFill.push({ col, row });
        }
      }
    }

    if (cellsToFill.length === 0) return;

    setShowSkeletonLoading(true);
    try {
      const batch = Math.min(cellsToFill.length, 24);
      
      // Add skeletons immediately
      const skeletons: Node[] = cellsToFill.slice(0, batch).map(({ col, row }) => {
        const { x, y } = cellToPosition(col, row);
        return {
          id: `skeleton-${cellKey(col, row)}`,
          type: 'skeletonNode',
          position: { x, y },
          data: {},
          draggable: false,
          selectable: false,
        } as Node;
      });
      setNodes((prev) => [...prev, ...skeletons]);

      // Fetch data and replace skeletons
      let products: (OpenFoodFactsProduct | TrueFoodProduct)[] = [];
      
      if (selectedCategory) {
        // Load products from selected category
        products = trueFoodDataManager.getProductsByCategory(selectedCategory);
      } else {
        // Load random products for initial view
        products = await getRandomProducts(batch);
      }
      
      const realNodes = createFoodNodesForCells(products, cellsToFill.slice(0, batch), darkMode);

      setNodes((prev) => {
        const skeletonIds = new Set(skeletons.map((s) => s.id));
        const realIds = new Set(realNodes.map((n) => n.id));
        const filtered = prev.filter((n) => !skeletonIds.has(n.id) && !realIds.has(n.id));
        return [...filtered, ...realNodes];
      });

      // Mark cells as filled
      cellsToFill.slice(0, batch).forEach(({ col, row }) => filledCellsRef.current.add(cellKey(col, row)));
    } catch (err) {
      console.error('Error loading grid cells:', err);
    } finally {
      setShowSkeletonLoading(false);
    }
  }, [reactFlowInstance, loading, setNodes, darkMode, currentMode, selectedCategory]);

  // Load Popular mode data
  const loadPopularModeData = useCallback(async () => {
    if (!dataLoaded || currentMode !== 'popular') return;
    
    setLoading(true);
    try {
      const filteredProducts = trueFoodDataManager.getProducts(filters);
      
      if (!reactFlowInstance) return;
      const range = getVisibleGridRange(reactFlowInstance.getViewport());
      const cells: Array<{ col: number; row: number }> = [];
      
      for (let c = range.startCol; c <= range.endCol; c++) {
        for (let r = range.startRow; r <= range.endRow; r++) {
          cells.push({ col: c, row: r });
        }
      }

      // Repeat products if needed to fill all cells
      const repeated: (OpenFoodFactsProduct | TrueFoodProduct)[] = [];
      let i = 0;
      while (repeated.length < cells.length && filteredProducts.length > 0) {
        repeated.push(filteredProducts[i % filteredProducts.length]);
        i++;
      }
      
      const newNodes = createFoodNodesForCells(repeated, cells, darkMode);
      setNodes(newNodes);
      cells.forEach(({ col, row }) => filledCellsRef.current.add(cellKey(col, row)));
    } catch (error) {
      console.error('Error loading popular mode data:', error);
    } finally {
      setLoading(false);
    }
  }, [dataLoaded, currentMode, filters, reactFlowInstance, darkMode, setNodes]);

  // Debounced viewport loading
  const debouncedTimeoutRef = useRef<number | null>(null);
  const debouncedLoad = useCallback(() => {
    if (debouncedTimeoutRef.current !== null) {
      window.clearTimeout(debouncedTimeoutRef.current);
    }
    debouncedTimeoutRef.current = window.setTimeout(() => {
      if (currentMode === 'explore') {
        loadFoodItemsInViewport();
      } else {
        loadPopularModeData();
      }
    }, 200);
  }, [loadFoodItemsInViewport, loadPopularModeData, currentMode]);

  // Handle viewport change
  const onMove = useCallback(() => {
    debouncedLoad();
  }, [debouncedLoad]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      if (!reactFlowInstance) return;
      
      setLoading(true);
      try {
        if (currentMode === 'explore') {
          const range = getVisibleGridRange(reactFlowInstance.getViewport());
          const cells: Array<{ col: number; row: number }> = [];
          
          for (let c = range.startCol; c <= range.endCol; c++) {
            for (let r = range.startRow; r <= range.endRow; r++) {
              cells.push({ col: c, row: r });
            }
          }

          let products: (OpenFoodFactsProduct | TrueFoodProduct)[] = [];
          if (selectedCategory) {
            products = trueFoodDataManager.getProductsByCategory(selectedCategory);
          } else {
            products = await getRandomProducts(cells.length);
          }
          
          const newNodes = createFoodNodesForCells(products, cells, darkMode);
          setNodes(newNodes);
          cells.forEach(({ col, row }) => filledCellsRef.current.add(cellKey(col, row)));
        } else {
          await loadPopularModeData();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (dataLoaded) {
      loadInitialData();
    }
  }, [setNodes, currentMode, reactFlowInstance, darkMode, selectedCategory, dataLoaded, loadPopularModeData]);

  // Handle mode switching
  const toggleMode = () => {
    const newMode = currentMode === 'explore' ? 'popular' : 'explore';
    setCurrentMode(newMode);
    setSelectedCategory(undefined);
    setNodes([]);
    filledCellsRef.current.clear();
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setNodes([]);
    filledCellsRef.current.clear();
  };

  const handleBackToCategories = () => {
    setSelectedCategory(undefined);
    setNodes([]);
    filledCellsRef.current.clear();
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    if (currentMode === 'popular') {
      setNodes([]);
      filledCellsRef.current.clear();
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedFood(node.data as FoodData);
    setShowDetailsPanel(true);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={cn("w-screen h-screen relative", darkMode ? 'dark' : '')}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleMode}
        currentMode={currentMode}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        onBackToCategories={handleBackToCategories}
      />

      {/* Main Canvas */}
      <div className={cn(
        "h-full transition-all duration-300",
        sidebarOpen ? "ml-80" : "ml-0"
      )}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onMove={onMove}
          nodeTypes={nodeTypes}
          fitView
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          className={darkMode ? 'bg-black' : 'bg-gray-50'}
        >
          <Background color={darkMode ? "#0a0a0a" : "#e5e7eb"} size={3} gap={40} />
          
          {/* Top Right - Controls */}
          <Panel position="top-right" className="m-4 z-[60]">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className={cn(
                  "p-2 rounded-lg shadow-lg transition-colors",
                  darkMode 
                    ? "bg-gray-800 text-gray-300 hover:text-white" 
                    : "bg-white text-gray-600 hover:text-gray-900 border border-gray-300"
                )}
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              <button
                onClick={toggleDarkMode}
                className={cn(
                  "p-2 rounded-lg shadow-lg transition-colors",
                  darkMode 
                    ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" 
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-300"
                )}
                title="Toggle dark mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </Panel>

          {/* Bottom Center - Mode Info */}
          <Panel position="bottom-center" className="m-4 z-[60]">
            <div className={cn(
              "px-4 py-2 rounded-full shadow-lg",
              darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700 border border-gray-300"
            )}>
              <span className="text-sm font-medium">
                {currentMode === 'explore' 
                  ? (selectedCategory ? `Exploring: ${selectedCategory}` : 'Explore Mode - Select a category')
                  : 'Popular Mode - Browse TrueFood products'
                }
              </span>
            </div>
          </Panel>
        </ReactFlow>

        {/* Loading Overlay - Only for canvas, not full screen */}
        {loading && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center z-40",
            darkMode ? "bg-gray-900/50" : "bg-white/50"
          )}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className={cn(
                "text-lg font-medium",
                darkMode ? "text-gray-200" : "text-gray-700"
              )}>
                Loading {currentMode === 'explore' ? 'foods' : 'products'}...
              </p>
            </div>
          </div>
        )}

        {/* Skeleton Loading Indicator */}
        {showSkeletonLoading && !loading && (
          <div className="absolute bottom-24 right-4 z-40">
            <div className={cn(
              "rounded-lg p-3 shadow-lg flex items-center gap-2",
              darkMode ? "bg-gray-800" : "bg-white"
            )}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className={cn(
                "text-sm",
                darkMode ? "text-gray-300" : "text-gray-700"
              )}>
                Loading more foods...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Food Details Dialog */}
      <FoodDetailsDialog
        isOpen={showDetailsPanel}
        onClose={() => setShowDetailsPanel(false)}
        foodData={selectedFood}
      />
    </div>
  );
}

// Export wrapper with ReactFlowProvider
export default function Home() {
  return (
    <ReactFlowProvider>
      <FoodCanvas />
    </ReactFlowProvider>
  );
}