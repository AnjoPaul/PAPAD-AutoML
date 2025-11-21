import { useEffect, useCallback } from 'react';

const DATASET_NODE_ID = "dataset-node";

/**
 * A helper function to create the onDelete callback for nodes.
 * This is a "curried" function: (setNodes, setEdges) => (nodeId) => { ... }
 */
const createOnDelete = (setNodes, setEdges) => (nodeId) => {
  setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  setEdges((eds) =>
    eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
  );
};

/**
 * Manages all global event listeners and initial graph loading.
 */
export const useGraphEvents = ({ setNodes, setEdges, setLocalFile, setResults, setError, fitView }) => {

  // 1. Create a stable function to add/update the dataset node
  const addOrUpdateDatasetNode = useCallback((uploadedFile) => {
    setLocalFile(uploadedFile); 
    setResults(null);
    setError(null); 
    
    const datasetNode = {
      id: DATASET_NODE_ID,
      type: "datasetNode",
      position: { x: 100, y: 100 },
      data: { label: `Dataset: ${uploadedFile.name}`, file: uploadedFile, isLocked: true },
    };

    setNodes((nds) => {
      const exists = nds.some((n) => n.id === DATASET_NODE_ID);
      return exists
        ? nds.map((n) => (n.id === DATASET_NODE_ID ? datasetNode : n))
        : [datasetNode, ...nds];
    });

    setTimeout(() => fitView(), 300);
  }, [fitView, setLocalFile, setResults, setError, setNodes]);

  // 2. Listener for when a file is selected in the sidebar
  useEffect(() => {
    const handler = (ev) => addOrUpdateDatasetNode(ev.detail);
    window.addEventListener("dataset-selected", handler);
    return () => window.removeEventListener("dataset-selected", handler);
  }, [addOrUpdateDatasetNode]);

  // 3. Listener for when the "Normal Run" button is clicked
  useEffect(() => {
    const handleNormalRun = (event) => {
      console.log("📊 [FlowCanvas] Received 'normal-run-complete' event!");
      
      // --- FIX IS HERE: Destructure ALL needed data ---
      const { outputs, graph, trainingResults } = event.detail;

      // Save the COMPLETE object to state so ResultsPanel has access to metrics
      if (outputs) {
        setResults({ outputs, trainingResults }); 
      }
      
      if (graph && graph.nodes && graph.edges) {
        // Use the helper to create the delete function
        const onDelete = createOnDelete(setNodes, setEdges);
        
        const nodesWithDelete = graph.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onDelete: () => onDelete(n.id), // Assign it here
          },
        }));
        
        setNodes(nodesWithDelete);
        setEdges(graph.edges);
        setTimeout(() => fitView(), 100);
      }
    };
    
    window.addEventListener("normal-run-complete", handleNormalRun);
    return () => window.removeEventListener("normal-run-complete", handleNormalRun);
  }, [fitView, setNodes, setEdges, setResults]);

  // 4. Loader for the initial placeholder graph
  useEffect(() => {
    fetch("http://localhost:5000/preprocessing-graph")
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.nodes) return;
        
        const onDelete = createOnDelete(setNodes, setEdges);

        const loadedNodes = data.nodes.map((n, idx) => ({
          id: n.id,
          type: n.type === "model" ? "modelNode" : "normalpreprocessingNode",
          position: { x: idx * 350, y: 200 },
          data: {
            label: n.label,
            baseId: n.baseId || n.id,
            onDelete: () => onDelete(n.id),
          },
        }));

        const loadedEdges = data.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            markerEnd: { type: "arrowclosed" },
            style: { stroke: "#000", strokeWidth: 3 },
        }));

        setNodes((cur) => {
          const dataset = cur.find((n) => n.id === DATASET_NODE_ID);
          return dataset ? [dataset, ...loadedNodes] : loadedNodes;
        });

        setEdges(loadedEdges);
        setTimeout(() => fitView(), 300);
      })
      .catch(err => console.error("Error loading graph:", err));
  }, [fitView, setNodes, setEdges]);
};