import { useCallback } from 'react';
import axios from 'axios';
import { extractChains } from '../branchExtractor';

export const usePipelineRunner = ({ localFile, nodes, edges, setResults, setError, setLoading, onValidate }) => {
  
  // REMOVED local state. We use the global 'setLoading' passed in props.

  const handleRunConfig = useCallback(async () => {
    if (!localFile) { 
      setError("Please upload a dataset file first.");
      return;
    }

    if (onValidate) {
      const validationError = onValidate();
      if (validationError) {
        return setError(validationError); 
      }
    }

    setResults(null); 
    setError(null); 
    const chains = extractChains(nodes, edges);
    console.log("🚀 [RunConfig] Chains extracted:", chains);

    const formData = new FormData();
    formData.append("dataset", localFile); 
    formData.append("chains", JSON.stringify(chains));

    try {
      setLoading(true); // Triggers Global Overlay
      
      const res = await axios.post("http://localhost:5000/run-config", formData);

      console.log("📦 [RunConfig] Backend raw response:", res);

      if (res.status === 200) {
        const { outputs, trainingResults, graph } = res.data;
        
        if (outputs) {
          setResults({ outputs, trainingResults });
          console.log("✅ Pipeline Finished!");
        } else {
          setError("Pipeline finished, but no visualization data was returned.");
        }
        
        if (graph && graph.nodes && graph.edges) {
           // Graph loading logic handles in FlowCanvasInner via state or event if needed, 
           // but usually Run Config just updates results.
           // If you want to update graph here, you need setNodes/setEdges passed to this hook.
        }
      }
    } catch (err) {
      console.error("❌ [RunConfig] Error sending config:", err);
      setError("Something went wrong while sending the configuration.");
    } finally {
      setLoading(false); // Hides Global Overlay
    }
  }, [localFile, nodes, edges, setResults, setError, setLoading, onValidate]);

  return { handleRunConfig };
};