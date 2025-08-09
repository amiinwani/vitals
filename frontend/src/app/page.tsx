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
import { Upload, Search } from 'lucide-react';
import { 
  searchProducts, 
  getRandomProducts, 
  getProductImageUrl, 
  getProductName,
  OpenFoodFactsProduct,
  formatNutritionInfo
} from '../lib/openfoodfacts';

// Types
interface FoodData {
  name: string;
  image?: string;
  product?: OpenFoodFactsProduct;
  [key: string]: any;
}

// Custom Food Node Component
const FoodNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
      <div className="w-24 h-24 rounded-lg overflow-hidden mb-2">
        <img 
          src={data.image || '/placeholder-food.svg'} 
          alt={data.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-food.svg';
          }}
        />
      </div>
      <div className="text-xs text-center font-medium text-gray-800 truncate">
        {data.name}
      </div>
    </div>
  );
};

// Node types
const nodeTypes = {
  foodNode: FoodNode,
};

// Helper function to create food nodes from products
function createFoodNodes(products: OpenFoodFactsProduct[], startIndex: number = 0, offsetX: number = 0, offsetY: number = 0): Node[] {
  return products.map((product, index) => ({
    id: `food-${startIndex + index}-${Date.now()}`,
    type: 'foodNode',
    position: { 
      x: offsetX + 100 + (index % 5) * 200, 
      y: offsetY + 100 + Math.floor(index / 5) * 200 
    },
    data: {
      name: getProductName(product),
      image: getProductImageUrl(product),
      product: product
    }
  }));
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Main component with dynamic loading
function FoodCanvas() {
  const reactFlowInstance = useReactFlow();
  const loadedAreas = useRef(new Set<string>());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic loading based on viewport
  const loadFoodItemsForArea = useCallback(async (areaKey: string, offsetX: number, offsetY: number) => {
    if (loadedAreas.current.has(areaKey)) return;
    
    loadedAreas.current.add(areaKey);
    
    try {
      const randomProducts = await getRandomProducts(10);
      const newNodes = createFoodNodes(randomProducts, nodes.length, offsetX, offsetY);
      setNodes((prevNodes) => [...prevNodes, ...newNodes]);
    } catch (error) {
      console.error('Error loading food items for area:', error);
    }
  }, [nodes.length, setNodes]);

  // Handle viewport change for dynamic loading
  const onMove = useCallback(() => {
    if (!reactFlowInstance) return;
    
    const { x, y, zoom } = reactFlowInstance.getViewport();
    
    // Calculate which area we're viewing
    const areaSize = 1000; // Size of each area in pixels
    const areaX = Math.floor(-x / areaSize);
    const areaY = Math.floor(-y / areaSize);
    
    // Load content for current and adjacent areas
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const currentAreaX = areaX + dx;
        const currentAreaY = areaY + dy;
        const areaKey = `${currentAreaX}-${currentAreaY}`;
        
        loadFoodItemsForArea(areaKey, currentAreaX * areaSize, currentAreaY * areaSize);
      }
    }
  }, [reactFlowInstance, loadFoodItemsForArea]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const randomProducts = await getRandomProducts(20);
        const newNodes = createFoodNodes(randomProducts);
        setNodes(newNodes);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [setNodes]);

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
    
    setLoading(true);
    try {
      const searchResults = await searchProducts(searchQuery, 1, 25);
      const newNodes = createFoodNodes(searchResults.products);
      setNodes(newNodes);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // For now, just log the uploaded file
        console.log('File uploaded:', file.name);
        
        // TODO: Implement actual image recognition
        // This would typically involve:
        // 1. Upload image to a service
        // 2. Use image recognition API to identify food
        // 3. Search OpenFoodFacts with identified food name
        // 4. Add results to canvas
        
        // For demo purposes, let's search for "pizza" when an image is uploaded
        setSearchQuery('pizza');
        handleSearchWithQuery('pizza');
      }
    };
    
    input.click();
  };

  const handleSearchWithQuery = async (query: string) => {
    setLoading(true);
    try {
      const searchResults = await searchProducts(query, 1, 25);
      const newNodes = createFoodNodes(searchResults.products);
      setNodes(newNodes);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen relative">
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
        className="bg-gray-50"
      >
        <Background />
        
        {/* Upload Button - Top Right */}
        <Panel position="top-right" className="m-4">
          <button
            onClick={handleUpload}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-colors"
          >
            <Upload size={20} />
            Upload Image
          </button>
        </Panel>

        {/* Search Bar - Bottom Center */}
        <Panel position="bottom-center" className="m-4">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3 min-w-[400px]">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search for food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-gray-700"
              />
            </div>
          </form>
        </Panel>
      </ReactFlow>

      {/* Food Details Side Panel */}
      {showDetailsPanel && selectedFood && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Food Details</h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={selectedFood.image || '/placeholder-food.svg'}
                  alt={selectedFood.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{selectedFood.name}</h3>
                
                {selectedFood.product && (
                  <div className="mt-4 space-y-3">
                    {selectedFood.product.brands && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Brand</p>
                        <p className="text-sm text-gray-800">{selectedFood.product.brands}</p>
                      </div>
                    )}
                    
                    {selectedFood.product.categories && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Categories</p>
                        <p className="text-sm text-gray-800">{selectedFood.product.categories.split(',').slice(0, 3).join(', ')}</p>
                      </div>
                    )}
                    
                    {selectedFood.product.nutrition_grades && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Nutri-Score</p>
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
                        <p className="text-sm font-medium text-gray-600 mb-2">Nutrition (per 100g)</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(formatNutritionInfo(selectedFood.product)).map(([key, value]) => 
                            value ? (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize text-gray-600">{key}:</span>
                                <span className="text-gray-800">{value}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedFood.product.ingredients_text && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ingredients</p>
                        <p className="text-xs text-gray-800 leading-relaxed">
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

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">Loading food items...</span>
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