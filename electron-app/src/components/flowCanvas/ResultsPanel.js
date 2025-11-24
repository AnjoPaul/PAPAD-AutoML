import React, { useState, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

export const ResultsPanel = ({ data, onClose }) => {
  // data structure: { "main": { outputs: {...}, trainingResults: [...] }, "branch_1": ... }
  const [activeTab, setActiveTab] = useState("main");
  const [showScatter, setShowScatter] = useState(false);

  const branches = Object.keys(data || {}).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b); // branch_1, branch_2...
  });

  // Auto-select main if available, or first branch
  useEffect(() => {
    if (branches.includes("main")) setActiveTab("main");
    else if (branches.length > 0) setActiveTab(branches[0]);
  }, [data]);

  if (!data || branches.length === 0) return null;

  const currentBranchData = data[activeTab];
  if (!currentBranchData) return <div style={{padding: 20}}>No data for this branch</div>;

  const { outputs, trainingResults } = currentBranchData;
  const metrics = trainingResults && trainingResults.length > 0 ? trainingResults[0].metrics : null;
  const scatterOutput = outputs?.o1;
  const labeledOutput = outputs?.o4;

  return (
    <div style={{ 
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '550px', 
      background: '#f8f9fa', borderTop: '3px solid #007bff', 
      display: 'flex', flexDirection: 'column', zIndex: 20,
      boxShadow: '0 -4px 15px rgba(0,0,0,0.15)'
    }}>
      
      {/* --- HEADER / TABS --- */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #ddd', padding: '0 20px' }}>
        <h3 style={{ margin: '0 20px 0 0', color: '#333' }}>Analysis Results</h3>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', flex: 1, padding: '10px 0' }}>
            {branches.map(branch => (
                <button
                    key={branch}
                    onClick={() => { setActiveTab(branch); setShowScatter(false); }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: activeTab === branch ? '#007bff' : '#ddd',
                        background: activeTab === branch ? '#007bff' : '#fff',
                        color: activeTab === branch ? '#fff' : '#555',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                    }}
                >
                    {branch.replace('_', ' ')}
                </button>
            ))}
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
      </div>

      {/* --- CONTENT --- */}
      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        
        {/* Metrics Row */}
        {metrics && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {Object.entries(metrics).map(([key, val]) => (
                    typeof val === 'number' && (
                        <div key={key} style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{val.toFixed(4)}</div>
                        </div>
                    )
                ))}
                {scatterOutput && (
                    <button 
                        onClick={() => setShowScatter(!showScatter)}
                        style={{ background: showScatter ? '#6c757d' : '#6610f2', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 15px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        {showScatter ? "Hide Scatter" : "View Scatter 📊"}
                    </button>
                )}
            </div>
        )}

        {/* Scatter Plot Area */}
        {showScatter && scatterOutput && (
            <div style={{ height: '400px', background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name="PCA 1" />
                        <YAxis type="number" dataKey="y" name="PCA 2" />
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

        {/* Other Outputs */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Summary Table (O3) */}
            {outputs?.o3 && (
                <div style={{ flex: 1, minWidth: '400px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h4 style={{ marginTop: 0 }}>Cluster Statistics</h4>
                    <div style={{ maxHeight: '250px', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f1f1f1' }}>
                                    {Object.keys(outputs.o3.data[0] || {}).map(k => <th key={k} style={{padding: 8, textAlign:'left'}}>{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {outputs.o3.data.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                        {Object.values(row).map((v, j) => <td key={j} style={{padding: 8}}>{v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             
            {/* Download (O4) */}
            {labeledOutput && (
                <div style={{ width: '100%', textAlign: 'center', marginTop: 20 }}>
                    <button onClick={() => alert(`File at: ${labeledOutput.path}`)} style={{ padding: '10px 30px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '16px', cursor: 'pointer' }}>
                        ⬇ Download Labeled Data
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};