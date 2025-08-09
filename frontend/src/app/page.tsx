'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
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
import { Upload, Search, FileText, Plus, Sun, Moon, ToggleLeft, ToggleRight } from 'lucide-react';
import { 
  searchProducts, 
  getRandomProducts, 
  getProductImageUrl, 
  getProductName,
  OpenFoodFactsProduct,
  formatNutritionInfo
} from '../lib/openfoodfacts';

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

// Types
interface FoodData {
  name: string;
  image?: string;
  product?: OpenFoodFactsProduct;
  [key: string]: any;
}

// Custom Food Node Component with dynamic sizing
const FoodNode = ({ data }: { data: any }) => {
  const [imageDimensions, setImageDimensions] = useState({ width: 120, height: 120 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Calculate size based on image aspect ratio, with constraints
    const maxWidth = 150;
    const maxHeight = 150;
    const minWidth = 80;
    const minHeight = 80;
    
    let width = naturalWidth;
    let height = naturalHeight;
    
    // Scale down if too large
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      if (aspectRatio > 1) {
        width = Math.min(maxWidth, width);
        height = width / aspectRatio;
      } else {
        height = Math.min(maxHeight, height);
        width = height * aspectRatio;
      }
    }
    
    // Scale up if too small
    if (width < minWidth && height < minHeight) {
      const aspectRatio = width / height;
      if (aspectRatio > 1) {
        width = minWidth;
        height = width / aspectRatio;
      } else {
        height = minHeight;
        width = height * aspectRatio;
      }
    }
    
    setImageDimensions({ width: Math.round(width), height: Math.round(height) });
    setImageLoaded(true);
  };

  // Update node data with actual dimensions
  useEffect(() => {
    if (imageLoaded && data) {
      data.width = imageDimensions.width;
      data.height = imageDimensions.height + 40; // Add space for text
    }
  }, [imageDimensions, imageLoaded, data]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer select-none">
      <div 
        className="rounded-lg overflow-hidden mb-2 flex items-center justify-center bg-gray-50"
        style={{ 
          width: `${imageDimensions.width}px`, 
          height: `${imageDimensions.height}px` 
        }}
      >
        <img 
          src={data.image || '/placeholder-food.svg'} 
          alt={data.name}
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-food.svg';
            handleImageLoad(e);
          }}
        />
      </div>
      <div 
        className="text-xs text-center font-medium text-gray-800 truncate"
        style={{ width: `${imageDimensions.width}px` }}
      >
        {data.name}
      </div>
    </div>
  );
};

// Node types
const nodeTypes = {
  foodNode: FoodNode,
};

// Helper function to check if a position is occupied
function isPositionOccupied(x: number, y: number, width: number, height: number, existingNodes: Node[], buffer: number = 20): boolean {
  return existingNodes.some(node => {
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const nodeWidth = node.data.width || 120; // Default width
    const nodeHeight = node.data.height || 140; // Default height
    
    return !(x + width + buffer < nodeX || 
             x - buffer > nodeX + nodeWidth ||
             y + height + buffer < nodeY || 
             y - buffer > nodeY + nodeHeight);
  });
}

// Find empty positions within a viewport area
function findEmptyPositions(
  viewportBounds: { left: number, top: number, right: number, bottom: number },
  existingNodes: Node[], 
  nodeWidth: number = 120, 
  nodeHeight: number = 140,
  spacing: number = 30
): { x: number, y: number }[] {
  const positions: { x: number, y: number }[] = [];
  const step = Math.min(nodeWidth + spacing, 150); // Maximum step size
  
  for (let y = viewportBounds.top; y <= viewportBounds.bottom - nodeHeight; y += step) {
    for (let x = viewportBounds.left; x <= viewportBounds.right - nodeWidth; x += step) {
      if (!isPositionOccupied(x, y, nodeWidth, nodeHeight, existingNodes, spacing)) {
        positions.push({ x, y });
      }
    }
  }
  
  return positions;
}

// Create food nodes in empty positions only
function createFoodNodesInEmptySpaces(
  products: OpenFoodFactsProduct[], 
  emptyPositions: { x: number, y: number }[], 
  startIndex: number = 0
): Node[] {
  return products.slice(0, emptyPositions.length).map((product, index) => {
    const position = emptyPositions[index];
    const imageUrl = getProductImageUrl(product);
    
    return {
      id: `food-${startIndex + index}-${Date.now()}`,
      type: 'foodNode',
      position,
      data: {
        name: getProductName(product),
        image: imageUrl,
        product: product,
        width: 120, // Will be updated dynamically
        height: 140 // Will be updated dynamically
      },
      draggable: false, // Make nodes unmovable
      selectable: true
    };
  });
}

// Skeleton loading component
function FoodNodeSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-gray-100 animate-pulse">
      <div className="w-24 h-24 rounded-lg bg-gray-200 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
    </div>
  );
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Main component with dynamic loading
function FoodCanvas() {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentMode, setCurrentMode] = useState<'explore' | 'popular'>('explore');
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);
  const [showSkeletonLoading, setShowSkeletonLoading] = useState(false);

  // Viewport-based loading that only fills empty spaces
  const loadFoodItemsInViewport = useCallback(async () => {
    if (!reactFlowInstance || loading) return;
    
    const { x, y, zoom } = reactFlowInstance.getViewport();
    
    // Get visible area bounds with buffer
    const buffer = 300; // Pixels
    const viewportWidth = window.innerWidth / zoom;
    const viewportHeight = window.innerHeight / zoom;
    const visibleLeft = -x - buffer;
    const visibleTop = -y - buffer;
    const visibleRight = visibleLeft + viewportWidth + (buffer * 2);
    const visibleBottom = visibleTop + viewportHeight + (buffer * 2);
    
    // Find empty positions in the viewport
    const emptyPositions = findEmptyPositions(
      { left: visibleLeft, top: visibleTop, right: visibleRight, bottom: visibleBottom },
      nodes,
      120, // default node width
      140, // default node height
      30   // spacing
    );
    
    // Only load if we found empty spaces
    if (emptyPositions.length > 0) {
      setShowSkeletonLoading(true);
      
      try {
        const itemsToLoad = Math.min(emptyPositions.length, 20); // Limit batch size
        const randomProducts = await getRandomProducts(itemsToLoad);
        const newNodes = createFoodNodesInEmptySpaces(randomProducts, emptyPositions, nodes.length);
        
        if (newNodes.length > 0) {
          setNodes((prevNodes) => [...prevNodes, ...newNodes]);
        }
      } catch (error) {
        console.error('Error loading food items:', error);
      } finally {
        setShowSkeletonLoading(false);
      }
    }
  }, [reactFlowInstance, nodes, loading, setNodes]);

  // Throttled viewport loading to prevent excessive API calls
  const throttledViewportLoading = useCallback(
    throttle(loadFoodItemsInViewport, 1000), // 1 second throttle
    [loadFoodItemsInViewport]
  );

  // Handle viewport change
  const onMove = useCallback(() => {
    throttledViewportLoading();
  }, [throttledViewportLoading]);

  // Initial data loading - populate screen with no overlaps
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Calculate visible screen area
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const buffer = 100;
        
        // Find empty positions for initial load
        const viewportBounds = {
          left: -buffer,
          top: -buffer,
          right: screenWidth + buffer,
          bottom: screenHeight + buffer
        };
        
        const emptyPositions = findEmptyPositions(viewportBounds, [], 120, 140, 30);
        const itemsToLoad = Math.min(emptyPositions.length, 30); // Initial batch
        
        const randomProducts = await getRandomProducts(itemsToLoad);
        const newNodes = createFoodNodesInEmptySpaces(randomProducts, emptyPositions, 0);
        setNodes(newNodes);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentMode === 'explore') {
      loadInitialData();
    }
  }, [setNodes, currentMode]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedFood(node.data);
    setShowDetailsPanel(true);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    handleSearchWithQuery(searchQuery);
  };

  const handleUploadReport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Report uploaded:', file.name);
        // TODO: Implement report processing
        // For demo, search for uploaded content
        setSearchQuery('uploaded foods');
        handleSearchWithQuery('uploaded foods');
      }
    };
    
    input.click();
  };

  const handleCreateReport = () => {
    setShowCreateReportDialog(true);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleMode = () => {
    const newMode = currentMode === 'explore' ? 'popular' : 'explore';
    setCurrentMode(newMode);
    
    // Clear canvas when switching to popular mode
    if (newMode === 'popular') {
      setNodes([]);
      console.log('Switched to popular foods mode - canvas cleared');
      // TODO: Load popular foods when ready
    }
  };

  const handleSearchWithQuery = async (query: string) => {
    setLoading(true);
    try {
      const searchResults = await searchProducts(query, 1, 40);
      
      // Find positions for search results
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const viewportBounds = {
        left: -100,
        top: -100,
        right: screenWidth + 100,
        bottom: screenHeight + 100
      };
      
      const emptyPositions = findEmptyPositions(viewportBounds, [], 120, 140, 30);
      const newNodes = createFoodNodesInEmptySpaces(searchResults.products, emptyPositions, 0);
      setNodes(newNodes); // Replace existing nodes with search results
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-screen h-screen relative ${darkMode ? 'dark' : ''}`}>
      {/* Main React Flow Canvas */}
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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
      >
        <Background 
          color={darkMode ? "#374151" : "#e5e7eb"} 
          size={3} 
          gap={40}
        />
        
        {/* Simplified Search Bar - Bottom Center */}
        <Panel position="bottom-center" className="m-4">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-full shadow-xl border-2 px-6 py-4 flex items-center gap-4 min-w-[600px] h-[80px]`}>
              
              {/* Search Input */}
              <Search size={24} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search for food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 outline-none text-lg ${darkMode ? 'bg-transparent text-gray-200 placeholder-gray-400' : 'bg-transparent text-gray-700 placeholder-gray-500'}`}
              />

              {/* Switch Mode Button */}
              <button
                type="button"
                onClick={toggleMode}
                className={`${currentMode === 'popular' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')} px-4 py-2 rounded-full flex items-center gap-2 transition-colors text-sm font-medium`}
              >
                {currentMode === 'popular' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {currentMode === 'explore' ? 'Popular' : 'Explore'}
              </button>
            </div>
          </form>
        </Panel>

        {/* Upper Right Corner - Report Buttons */}
        <Panel position="top-right" className="m-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUploadReport}
              className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors text-sm font-medium`}
            >
              <FileText size={16} />
              Upload Report
            </button>
            
            <button
              onClick={handleCreateReport}
              className={`${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors text-sm font-medium`}
            >
              <Plus size={16} />
              Create Report
            </button>
          </div>
        </Panel>

        {/* Bottom Left Corner - Theme Toggle */}
        <Panel position="bottom-left" className="m-4">
          <button
            onClick={toggleDarkMode}
            className={`${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'} p-3 rounded-full shadow-lg transition-colors`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </Panel>
      </ReactFlow>

      {/* Food Details Side Panel */}
      {showDetailsPanel && selectedFood && (
        <div className={`absolute top-0 right-0 w-80 h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl z-50 overflow-y-auto`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Food Details</h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-xl`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`w-full h-48 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <img
                  src={selectedFood.image || '/placeholder-food.svg'}
                  alt={selectedFood.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFood.name}</h3>
                
                {selectedFood.product && (
                  <div className="mt-4 space-y-3">
                    {selectedFood.product.brands && (
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Brand</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFood.product.brands}</p>
                      </div>
                    )}
                    
                    {selectedFood.product.categories && (
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Categories</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFood.product.categories.split(',').slice(0, 3).join(', ')}</p>
                      </div>
                    )}
                    
                    {selectedFood.product.nutrition_grades && (
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Nutri-Score</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${
                          selectedFood.product.nutrition_grades === 'a' ? 'bg-green-500' :
                          selectedFood.product.nutrition_grades === 'b' ? 'bg-lime-500' :
                          selectedFood.product.nutrition_grades === 'c' ? 'bg-yellow-500' :
                          selectedFood.product.nutrition_grades === 'd' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}>
                          {selectedFood.product.nutrition_grades.toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    {selectedFood.product.nutriments && (
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Nutrition (per 100g)</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(formatNutritionInfo(selectedFood.product)).map(([key, value]) => 
                            value ? (
                              <div key={key} className="flex justify-between">
                                <span className={`capitalize ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{key}:</span>
                                <span className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{value}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedFood.product.ingredients_text && (
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ingredients</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-800'} leading-relaxed`}>
                          {selectedFood.product.ingredients_text.slice(0, 200)}
                          {selectedFood.product.ingredients_text.length > 200 ? '...' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved Loading Skeleton */}
      {loading && (
        <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900 bg-opacity-80' : 'bg-white bg-opacity-80'} flex items-center justify-center z-40`}>
          <div className="grid grid-cols-6 gap-4 p-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <FoodNodeSkeleton key={index} />
            ))}
          </div>
        </div>
      )}

      {/* Skeleton Loading for Dynamic Content */}
      {showSkeletonLoading && !loading && (
        <div className="absolute bottom-24 right-4 z-40">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-3 shadow-lg flex items-center gap-2`}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading more foods...</span>
          </div>
        </div>
      )}

      {/* Create Report Dialog */}
      {showCreateReportDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'} rounded-xl p-8 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Food Report</h2>
              <button
                onClick={() => setShowCreateReportDialog(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Report Type</label>
                  <select className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <option>Dietary Analysis</option>
                    <option>Nutrition Report</option>
                    <option>Allergen Assessment</option>
                    <option>Custom Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time Period</label>
                  <select className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                    <option>Custom range</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">What foods have you been eating?</label>
                <textarea
                  placeholder="Describe your recent meals and dietary patterns..."
                  rows={4}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Any dietary restrictions or goals?</label>
                <textarea
                  placeholder="Allergies, preferences, health goals, etc..."
                  rows={3}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Additional notes</label>
                <textarea
                  placeholder="Any other information you'd like to include..."
                  rows={2}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateReportDialog(false)}
                  className={`px-6 py-2 rounded-lg border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Creating report...');
                    setShowCreateReportDialog(false);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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