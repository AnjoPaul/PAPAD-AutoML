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

    // DON'T clear results here. We want to keep 'main' if it exists.
    setError(null); 
    
    // 2. Extract Chains
    const allChains = extractChains(nodes, edges);

    // 3. FILTERING: Separate 'main' from custom branches
    const { main, ...customBranches } = allChains;

    console.log("🚀 [RunConfig] Sending Custom Branches:", customBranches);

    if (Object.keys(customBranches).length === 0) {
        setError("No custom branches found! Please create a new branch before running configuration.");
        return;
    }

    const formData = new FormData();
    formData.append("dataset", localFile); 
    formData.append("chains", JSON.stringify(customBranches));

    try {
      setLoading(true); 
      
      const res = await axios.post("http://localhost:5000/run-config", formData);

      if (res.status === 200) {
        const { outputs } = res.data; // 'outputs' contains { branch_1: {...}, branch_2: {...} }
        
        if (outputs) {
          // --- FIX: MERGE WITH EXISTING MAIN BRANCH ---
          setResults((prevResults) => ({
            ...prevResults, // Keep 'main'
            ...outputs      // Add 'branch_1', 'branch_2', etc.
          }));
          
          console.log("✅ Pipeline Finished! Results merged.");
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