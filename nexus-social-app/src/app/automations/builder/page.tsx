'use client';

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import { automationTemplates } from '@/lib/automations/templates';
import { cloneTemplate } from '@/actions/clone-template';
import { useWorkspaceStore } from '@/store/workspace';
import { toast } from 'react-hot-toast';

export default function AutomationsBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [showGallery, setShowGallery] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const handleCloneTemplate = async (templateId: string) => {
    if (!workspaceId) {
      toast.error('Workspace not selected');
      return;
    }
    setIsCloning(true);
    try {
      const data = await cloneTemplate(templateId, workspaceId);
      setNodes(data.flow_json.nodes);
      setEdges(data.flow_json.edges);
      setShowGallery(false);
      toast.success(
        data.persisted ? 'Template loaded and saved!' : 'Template loaded (save on Deploy Flow)',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load template');
    } finally {
      setIsCloning(false);
    }
  };

  if (showGallery) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Automation Templates</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Start with a pre-built flow or create from scratch.</p>
            </div>
            <button 
              onClick={() => setShowGallery(false)}
              className="bg-indigo-600 px-6 py-2 rounded-lg font-medium text-white hover:bg-indigo-700 transition"
            >
              Blank Canvas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationTemplates.map(template => (
              <div key={template.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex flex-col">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">{template.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 mb-6">{template.description}</p>
                <button
                  onClick={() => handleCloneTemplate(template.id)}
                  disabled={isCloning}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition"
                >
                  {isCloning ? 'Loading...' : 'Use Template'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white">
      <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f172a] z-10">
        <div>
          <h1 className="text-2xl font-bold">Visual Automations</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Design your social engagement flows.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowGallery(true)}
            className="px-4 py-2 rounded font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Templates
          </button>
          <button className="bg-indigo-600 px-6 py-2 rounded font-medium text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-200 dark:shadow-none">
            Deploy Flow
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background color="#94a3b8" gap={16} size={1} />
          <Controls className="bg-white text-black fill-black" />
        </ReactFlow>
      </div>
    </div>
  );
}
