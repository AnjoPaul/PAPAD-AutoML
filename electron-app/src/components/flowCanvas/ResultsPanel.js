import React, { useState, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

export const ResultsPanel = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState("main");
  const [showScatter, setShowScatter] = useState(false);

  const branches = Object.keys(data || {}).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  useEffect(() => {
    if (branches.includes("main") && !branches.includes(activeTab)) {
        setActiveTab("main");
    } else if (branches.length > 0 && !branches.includes(activeTab)) {
        setActiveTab(branches[0]);
    }
  }, [data, branches, activeTab]);

  if (!data || branches.length === 0) return null;

  const currentBranchData = data[activeTab];

  // --- HELPER: GET STATUS/MODEL NAME ---
  const getBranchStatus = (branchKey) => {
      const branch = data[branchKey];
      
      // 1. Check for Explicit Failure
      if (branch.status === 'failed' || branch.error) {
          return { label: "Failed", icon: "⚠️", color: "#dc3545" };
      }

      // 2. Check for Model Name
      if (branch.trainingResults && branch.trainingResults.length > 0) {
          const name = branch.trainingResults[0].model || branch.trainingResults[0].algorithm || "Model";
          return { label: name, icon: "🤖", color: "#666" };
      }

      return { label: "No Model", icon: "❓", color: "#999" };
  };

  if (!currentBranchData) return <div style={{padding: 20}}>Loading...</div>;

  const { outputs, trainingResults, error } = currentBranchData;
  const metrics = trainingResults && trainingResults.length > 0 ? trainingResults[0].metrics : null;
  const scatterOutput = outputs?.o1; 

  return (
    <div style={{ 
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', 
      background: '#f8f9fa', borderTop: '3px solid #007bff', 
      display: 'flex', zIndex: 20,
      boxShadow: '0 -4px 15px rgba(0,0,0,0.15)'
    }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{ width: '250px', background: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', padding: '10px 0' }}>
          <div style={{ padding: '0 20px 10px', borderBottom: '1px solid #eee', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Results</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {branches.map(branch => {
                const status = getBranchStatus(branch);
                const isActive = activeTab === branch;
                return (
                    <div
                        key={branch}
                        onClick={() => { setActiveTab(branch); setShowScatter(false); }}
                        style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                            borderLeft: isActive ? '4px solid #007bff' : '4px solid transparent',
                            background: isActive ? '#f0f7ff' : 'transparent',
                            transition: 'background 0.2s'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: isActive ? '#007bff' : '#333', textTransform: 'uppercase', fontSize: '12px' }}>
                            {branch.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '13px', color: status.color, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <span>{status.icon}</span> {status.label}
                        </div>
                    </div>
                );
            })}
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div style={{ flex: 1, padding: '10px', overflowY: 'auto', background: '#f8f9fa' }}>
        
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{activeTab.replace('_', ' ')}</h2>
        </div>

        {/* --- ERROR DISPLAY --- */}
        {error ? (
            <div style={{ 
                background: '#fff3f3', 
                border: '1px solid #dc3545', 
                borderRadius: '8px', 
                padding: '20px', 
                color: '#dc3545' 
            }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ⚠️ Processing Failed
                </h3>
                <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '4px' }}>
                    {error}
                </p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                    <strong>Tip:</strong> Ensure all columns are numeric before they reach the model. Use "Encoding" or "Drop Columns" for text data.
                </p>
            </div>
        ) : (
            /* --- NORMAL RESULTS --- */
            <>
                {metrics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '10px' }}>
                        {Object.entries(metrics).map(([key, val]) => (
                            <div key={key} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>{key.replace(/_/g, ' ')}</div>
                                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#333' }}>{typeof val === 'number' ? val.toFixed(4) : val}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No metrics available. Preprocessing might not be properly done or selected ML model might not be suitable for this dataset.</div>
                )}

                {scatterOutput && (
                    <div style={{ height: '400px', background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '10px' }}>
                         <div style={{marginBottom: 10, fontWeight: 'bold'}}>Cluster Visualization</div>
                        <ResponsiveContainer width="100%" height="90%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="x" name="PC1" />
                                <YAxis type="number" dataKey="y" name="PC2" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Clusters" data={scatterOutput.data} fill="#8884d8">
                                    {scatterOutput.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};