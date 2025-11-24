import { useCallback } from 'react';
import axios from 'axios';
import { extractChains } from '../branchExtractor';

export const usePipelineRunner = ({ localFile, nodes, edges, setResults, setError, setLoading, onValidate }) => {
  
  const handleRunConfig = useCallback(async () => {
    if (!localFile) { 
      setError("Please upload a dataset file first.");
      return;
    }

    // 1. Run Validation
    if (onValidate) {
      const validationError = onValidate();
      if (validationError) {
        return setError(validationError); 
      }
    }

    setResults(null); 
    setError(null); 
    
    // 2. Extract Chains
    const allChains = extractChains(nodes, edges);

    // 3. FILTERING: Separate 'main' from custom branches
    // We destructure 'main' out, and keep the rest in 'customBranches'
    const { main, ...customBranches } = allChains;

    console.log("🚀 [RunConfig] Main Branch (Excluded):", main);
    console.log("🚀 [RunConfig] Sending Custom Branches:", customBranches);

    // Check if user actually created a custom branch
    if (Object.keys(customBranches).length === 0) {
        setError("No custom branches found! Please create a new branch before running configuration.");
        return;
    }

    const formData = new FormData();
    formData.append("dataset", localFile); 
    // Only send the custom branches
    formData.append("chains", JSON.stringify(customBranches));

    try {
      setLoading(true); 
      
      const res = await axios.post("http://localhost:5000/run-config", formData);

      console.log("📦 [RunConfig] Backend raw response:", res);

      if (res.status === 200) {
        const { outputs, trainingResults, graph } = res.data;
        
        if (outputs) {
          // Merge new results with existing main results if needed, 
          // or just set the new results.
          setResults({ outputs, trainingResults });
          console.log("✅ Pipeline Finished!");
        } else {
          setError("Pipeline finished, but no visualization data was returned.");
        }
      }
    } catch (err) {
      console.error("❌ [RunConfig] Error sending config:", err);
      setError("Something went wrong while sending the configuration.");
    } finally {
      setLoading(false); 
    }
  }, [localFile, nodes, edges, setResults, setError, setLoading, onValidate]);

  return { handleRunConfig };
};