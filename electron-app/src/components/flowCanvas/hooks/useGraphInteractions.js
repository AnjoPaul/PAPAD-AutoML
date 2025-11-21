import { useCallback } from 'react';
import { addEdge } from 'reactflow';
// --- 1. Import from new validation file ---
import { validateConnection } from "../graphValidation";

/**
 * Manages user interactions with the graph (Drag/Drop, Connect).
 */
export const useGraphInteractions = ({ file, domain, nodes, edges, project, setNodes, setEdges, setError }) => {

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!file) return setError("Please upload a dataset first.");
      if (!domain) return setError("Please find the domain before adding modules.");

      const container = document.querySelector(".react-flow__renderer")?.parentElement;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      const dragged = JSON.parse(raw);
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const nodeType =
        dragged.type === "model" ? "modelNode"
        : dragged.type === "preprocessing" ? "preprocessingNode"
        : dragged.type === "output" ? "outputNode"
        : dragged.type;
      const newNodeId = `${dragged.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newNode = {
        id: newNodeId,
        type: nodeType,
        position,
        data: {
          label: dragged.label,
          baseId: dragged.id,
          onDelete: () => {
            setNodes((nds) => nds.filter((n) => n.id !== newNodeId));
            setEdges((eds) =>
              eds.filter((e) => e.source !== newNodeId && e.target !== newNodeId)
            );
          },
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [project, file, domain, setNodes, setEdges, setError]
  );

  const onDragOver = useCallback((e) => e.preventDefault(), []);

  // --- 2. Update onConnect to use new validator ---
  const onConnect = useCallback(
    (params) => {
      // Run all real-time validation rules
      const errorMessage = validateConnection(nodes, edges, params);
      
      if (errorMessage) {
        return setError(errorMessage); // Show the error and STOP
      }

      // If no error, add the edge
      setEdges((eds) =>
        addEdge({ ...params, animated: true, markerEnd: { type: "arrowclosed" }, style: { stroke: "#000", strokeWidth: 3 } }, eds)
      );
    },
    [edges, nodes, setEdges, setError] // 'nodes' is required for validation
  );
  
  return { onDrop, onDragOver, onConnect };
};