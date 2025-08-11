"use client"

import React, { useCallback } from 'react';
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

// Food categories data with 41 placeholder nodes
const FOOD_CATEGORIES = [
  'Fruits', 'Vegetables', 'Grains', 'Proteins', 'Dairy', 'Nuts & Seeds', 
  'Legumes', 'Herbs & Spices', 'Oils & Fats', 'Beverages', 'Seafood', 
  'Poultry', 'Red Meat', 'Eggs', 'Bread & Bakery', 'Cereals', 'Pasta',
  'Rice & Grains', 'Root Vegetables', 'Leafy Greens', 'Berries', 'Citrus',
  'Tropical Fruits', 'Processed Snacks', 'Frozen Foods', 'Canned Goods',
  'Condiments', 'Sweeteners', 'Tea & Coffee', 'Juices', 'Alcohol',
  'Fermented Foods', 'Probiotics', 'Supplements', 'Baby Food', 'Pet Food',
  'Organic Products', 'Gluten-Free', 'Vegan Products', 'Keto Foods', 'Low-Carb'
];

// Generate initial nodes in a circular/scattered layout
const generateInitialNodes = (): Node[] => {
  const nodes: Node[] = [];
  const centerX = 400;
  const centerY = 300;
  const radius = 250;
  
  FOOD_CATEGORIES.forEach((category, index) => {
    const angle = (index / FOOD_CATEGORIES.length) * 2 * Math.PI;
    const x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
    const y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100;
    
    // Assign colors based on category type
    const getNodeColor = (category: string) => {
      if (category.includes('Fruit') || category.includes('Berries') || category.includes('Citrus') || category.includes('Tropical')) {
        return '#F39C12'; // Warm orange for fruits
      }
      if (category.includes('Vegetable') || category.includes('Greens') || category.includes('Root')) {
        return '#27AE60'; // Good green for vegetables
      }
      if (category.includes('Protein') || category.includes('Meat') || category.includes('Seafood') || category.includes('Poultry') || category.includes('Eggs')) {
        return '#2ECC71'; // Emerald green for proteins
      }
      if (category.includes('Processed') || category.includes('Snacks') || category.includes('Alcohol')) {
        return '#E74C3C'; // Avoid red for processed foods
      }
      if (category.includes('Organic') || category.includes('Vegan') || category.includes('Gluten-Free')) {
        return '#27AE60'; // Good green for healthy options
      }
      return '#F1C40F'; // Neutral yellow for others
    };

    nodes.push({
      id: `food-${index}`,
      position: { x, y },
      data: { 
        label: category,
        category: category,
        color: getNodeColor(category)
      },
      type: 'default',
      style: {
        background: getNodeColor(category),
        color: 'white',
        border: `2px solid ${getNodeColor(category)}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '500',
        minWidth: '100px',
        textAlign: 'center'
      }
    });
  });
  
  return nodes;
};

const initialNodes = generateInitialNodes();
const initialEdges: Edge[] = [];

interface FoodFlowCanvasProps {
  searchQuery?: string;
  activeStores?: string[];
  processedRanking?: number;
  maxPrice?: number;
}

export function FoodFlowCanvas({ 
  searchQuery = '',
  activeStores = [],
  processedRanking = 5,
  maxPrice = 100 
}: FoodFlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Filter nodes based on search query
  const filteredNodes = nodes.map(node => ({
    ...node,
    hidden: Boolean(searchQuery) && !String((node.data as { category?: string } | undefined)?.category || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  }));

  return (
    <div className="w-full h-screen bg-white">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false
        }}
      >
        <Background 
          color="#E0E0E0" 
          gap={20} 
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls 
          className="bg-white border border-border-gray shadow-lg"
          showInteractive={false}
        />
        <MiniMap 
          className="bg-light-gray border border-border-gray"
          nodeColor={(node) => node.style?.background as string || '#F1C40F'}
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
