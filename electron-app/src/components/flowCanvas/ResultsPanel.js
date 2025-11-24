import React, { useState, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

export const ResultsPanel = ({ data, onClose }) => {
  // data structure: { "main": { outputs: {...}, trainingResults: [...] }, "branch_1": ... }
  const [activeTab, setActiveTab] = useState("main");
  const [showScatter, setShowScatter] = useState(false);

  // Sort: Main first, then branch_1, branch_2...
  const branches = Object.keys(data || {}).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  // Auto-select tab logic
  useEffect(() => {
    if (branches.includes("main") && !branches.includes(activeTab)) {
        setActiveTab("main");
    } else if (branches.length > 0 && !branches.includes(activeTab)) {
        setActiveTab(branches[0]);
    }
  }, [data, branches, activeTab]);

  if (!data || branches.length === 0) return null;

  const currentBranchData = data[activeTab];

  // Helper to get Model Name safely
  const getModelName = (branchKey) => {
      const branch = data[branchKey];
      if (!branch || !branch.trainingResults || branch.trainingResults.length === 0) return "No Model";
      // Assuming backend returns { model: "K-Means", ... } inside trainingResults[0]
      // Adjust property name 'model' or 'algorithm' based on your exact python output
      return branch.trainingResults[0].model || branch.trainingResults[0].algorithm || "Model";
  };

  if (!currentBranchData) return <div style={{padding: 20}}>Loading results...</div>;

  const { outputs, trainingResults } = currentBranchData;
  const metrics = trainingResults && trainingResults.length > 0 ? trainingResults[0].metrics : null;
  const scatterOutput = outputs?.o1; // Adjust based on your output node ID (e.g. o1)
  const labeledOutput = outputs?.o4; // Adjust based on output node ID

  return (
    <div style={{ 
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '600px', 
      background: '#f8f9fa', borderTop: '3px solid #007bff', 
      display: 'flex', zIndex: 20,
      boxShadow: '0 -4px 15px rgba(0,0,0,0.15)'
    }}>
      
      {/* --- LEFT SIDEBAR: BRANCH LIST --- */}
      <div style={{ 
          width: '250px', 
          background: '#fff', 
          borderRight: '1px solid #ddd', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '10px 0'
      }}>
          <div style={{ padding: '0 20px 10px', borderBottom: '1px solid #eee', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Results</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {branches.map(branch => {
                const modelName = getModelName(branch);
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
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '2px' }}>
                           🤖 {modelName}
                        </div>
                    </div>
                );
            })}
          </div>
      </div>

      {/* --- RIGHT CONTENT AREA --- */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8f9fa' }}>
        
        {/* Header for Content */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, textTransform: 'capitalize' }}>
                {activeTab.replace('_', ' ')} <span style={{fontWeight:'normal', fontSize:'0.8em', color:'#666'}}>({getModelName(activeTab)})</span>
            </h2>
            
            {scatterOutput && (
                <button 
                    onClick={() => setShowScatter(!showScatter)}
                    style={{ background: showScatter ? '#6c757d' : '#6610f2', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', display:'flex', alignItems:'center', gap:'8px' }}
                >
                   {showScatter ? "Hide Plot" : "View Scatter Plot 📊"}
                </button>
            )}
        </div>

        {/* Metrics Cards */}
        {metrics ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                {Object.entries(metrics).map(([key, val]) => (
                    typeof val === 'number' && (
                        <div key={key} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{key.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#333' }}>{val.toFixed(4)}</div>
                        </div>
                    )
                ))}
            </div>
        ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#999', background: '#fff', borderRadius: 8 }}>No metrics available for this branch.</div>
        )}

        {/* Scatter Plot */}
        {showScatter && scatterOutput && (
            <div style={{ height: '400px', background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Component 1" unit="" />
                        <YAxis type="number" dataKey="y" name="Component 2" unit="" />
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

        {/* Other Tables / Downloads */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {outputs?.o3 && (
                <div style={{ flex: 1, minWidth: '400px', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ marginTop: 0, marginBottom: 15 }}>Cluster Statistics</h4>
                    <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                                    {Object.keys(outputs.o3.data[0] || {}).map(k => <th key={k} style={{padding: '10px', textAlign:'left', color:'#555'}}>{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {outputs.o3.data.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        {Object.values(row).map((v, j) => <td key={j} style={{padding: '10px'}}>{typeof v === 'number' ? v.toFixed(3) : v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};