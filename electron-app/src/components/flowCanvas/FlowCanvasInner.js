import React, { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";
import nodeTypes from "./nodeTypes";
import { ResultsPanel } from "./ResultsPanel";
import ErrorPopup from '../ErrorPopup';

// Import the hooks
import { useGraphEvents } from "./hooks/useGraphEvents";
import { useGraphInteractions } from "./hooks/useGraphInteractions";
import { usePipelineRunner } from "./hooks/usePipelineRunner";
import { validatePipeline } from './graphValidation';

const DATASET_NODE_ID = "dataset-node";

const FlowCanvasInner = ({ file, domain, setGlobalLoading }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [localFile, setLocalFile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // --- NEW STATE: Control Results Visibility ---
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const { fitView, project } = useReactFlow();

  // --- EFFECT: Auto-open panel when new results arrive ---
  useEffect(() => {
    if (results) {
      setIsResultsOpen(true);
    }
  }, [results]);

  useGraphEvents({
    setNodes, setEdges, setLocalFile, setResults, setError, fitView
  });

  const { onDrop, onDragOver, onConnect } = useGraphInteractions({
    file, domain, nodes, edges, project, setNodes, setEdges, setError
  });

  const { handleRunConfig } = usePipelineRunner({
    localFile,
    nodes,
    edges,
    setResults,
    setError,
    setLoading: setGlobalLoading,
    onValidate: () => validatePipeline(nodes, edges)
  });

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);

  const handleClearCanvas = useCallback(() => {
    const datasetNode = nodes.find(n => n.id === DATASET_NODE_ID);
    setNodes(datasetNode ? [datasetNode] : []);
    setEdges([]);
    
    // Clear results and close panel
    setResults(null);
    setIsResultsOpen(false);
    setError(null);
  }, [nodes]);

  return (
    <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>

      {error && <ErrorPopup message={error} onClose={() => setError(null)} />}

      <div style={{ flex: 1, position: "relative" }} onDrop={onDrop} onDragOver={onDragOver}>
        
        {/* --- NEW: View Results Button (Visible only if results exist) --- */}
        {results && !isResultsOpen && (
            <button 
                onClick={() => setIsResultsOpen(true)}
                style={{
                    position: "absolute", top: 10, right: 330, zIndex: 10, padding: "8px 16px",
                    background: "#17a2b8", color: "white", border: "none", borderRadius: 6, cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)", fontWeight: "bold"
                }}
            >
                View Results 📊
            </button>
        )}

        <button onClick={handleClearCanvas} style={{
          position: "absolute", top: 10, right: 190, zIndex: 10, padding: "8px 16px",
          background: "#6c757d", color: "white", border: "none", borderRadius: 6, cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
        }}>Clear Canvas</button>

        <button onClick={handleRunConfig} style={{
          position: "absolute", top: 10, right: 10, zIndex: 10, padding: "8px 16px",
          background: "#e20606ff", color: "white", border: "none", borderRadius: 6, cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
        }}>Run Configuration</button>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Background />
          <Controls />
        </ReactFlow>

        {/* Render Panel only if Open AND Results exist */}
        {isResultsOpen && results && (
            <ResultsPanel 
                data={results} 
                onClose={() => setIsResultsOpen(false)} // Just hide, don't delete data
            />
        )}
      </div>
    </div>
  );
};

export default FlowCanvasInner;