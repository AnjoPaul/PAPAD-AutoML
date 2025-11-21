import React, { useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

// FIX: Changed prop name to 'data' to match FlowCanvasInner usage
export const ResultsPanel = ({ data, onClose }) => {
  const [showScatter, setShowScatter] = useState(false);

  // FIX: Check 'data' instead of 'outputs'
  if (!data || !data.outputs) return null;

  // FIX: Destructure from 'data'
  const { outputs, trainingResults } = data;

  // Helper to extract metrics safely
  const metrics = trainingResults && trainingResults.length > 0 ? trainingResults[0].metrics : null;

  const scatterOutput = outputs.o1;
  const labeledOutput = outputs.o4;

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      height: '500px', 
      background: 'white', 
      borderTop: '3px solid #007bff', 
      padding: '20px',
      paddingTop: '50px', 
      overflowY: 'auto',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column', 
      gap: '20px',
      boxShadow: '0 -4px 15px rgba(0,0,0,0.15)',
      transition: 'transform 0.3s ease-in-out'
    }}>
      
      {/* Global Close Button */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '20px',
          background: '#ff4d4f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '5px 12px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          zIndex: 30
        }}
      >
        ✕ Close Results
      </button>

      {/* --- METRICS SECTION --- */}
      {metrics && (
        <div style={{ 
            display: 'flex', 
            gap: '20px', 
            padding: '15px', 
            background: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            alignItems: 'center'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h5 style={{ margin: '0 0 5px 0', color: '#6c757d' }}>Silhouette Score</h5>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {metrics.silhouette_score && typeof metrics.silhouette_score === 'number' 
                        ? metrics.silhouette_score.toFixed(4) 
                        : (metrics.silhouette_score || 'N/A')}
                </span>
            </div>
            <div style={{ textAlign: 'center' }}>
                <h5 style={{ margin: '0 0 5px 0', color: '#6c757d' }}>Davies-Bouldin</h5>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {metrics.davies_bouldin_score && typeof metrics.davies_bouldin_score === 'number' 
                        ? metrics.davies_bouldin_score.toFixed(4) 
                        : (metrics.davies_bouldin_score || 'N/A')}
                </span>
            </div>
            <div style={{ textAlign: 'center' }}>
                <h5 style={{ margin: '0 0 5px 0', color: '#6c757d' }}>Calinski-Harabasz</h5>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                    {metrics.calinski_harabasz_score && typeof metrics.calinski_harabasz_score === 'number' 
                        ? metrics.calinski_harabasz_score.toFixed(2) 
                        : (metrics.calinski_harabasz_score || 'N/A')}
                </span>
            </div>
             {/* View Scatter Plot Button */}
             {scatterOutput && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                        onClick={() => setShowScatter(!showScatter)}
                        style={{
                            padding: '10px 20px',
                            background: showScatter ? '#6c757d' : '#6610f2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        {showScatter ? "Hide Scatter Plot" : "View Scatter Plot 📊"}
                    </button>
                </div>
            )}
        </div>
      )}

      {/* --- SCATTER PLOT (Conditional) --- */}
      {showScatter && scatterOutput && (
        <div style={{ 
            flex: 1, 
            border: '1px solid #eee', 
            padding: '15px', 
            borderRadius: '8px', 
            background: '#fff',
            animation: 'fadeIn 0.3s ease-in',
            minHeight: '350px' // Ensure height
        }}>
          <h4 style={{margin: '0 0 15px 0', textAlign: 'center', color: '#333'}}>Cluster Visualization (PCA)</h4>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="PCA 1" unit="" tick={{fontSize: 12}} />
              <YAxis type="number" dataKey="y" name="PCA 2" unit="" tick={{fontSize: 12}} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: 8}} />
              <Scatter name="Clusters" data={scatterOutput.data} fill="#8884d8">
                {scatterOutput.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}

      {/* --- MAIN CONTENT ROW (Summary Table & Charts) --- */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* --- O3: SUMMARY TABLE --- */}
        {outputs.o3 && (
            <div style={{ flex: 1, minWidth: '400px', border: '1px solid #eee', padding: '15px', borderRadius: '8px', overflow: 'auto', background: '#fff', maxHeight: '300px' }}>
            <h4 style={{margin: '0 0 15px 0', textAlign: 'center', color: '#333'}}>Cluster Statistics</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'sans-serif' }}>
                <thead>
                <tr style={{ background: '#f0f2f5', textAlign: 'left', borderBottom: '2px solid #d9d9d9' }}>
                    {Object.keys(outputs.o3.data[0] || {}).map(key => (
                    <th key={key} style={{ padding: '10px', fontWeight: '600', color: '#555', whiteSpace: 'nowrap' }}>
                        {key.replace(/_/g, ' ')}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {outputs.o3.data.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    {Object.values(row).map((val, i) => (
                        <td key={i} style={{ padding: '10px', color: '#444' }}>{val}</td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}

        {/* --- O2: PERFORMANCE CHART --- */}
        {outputs.o2 && outputs.o2.type === 'chart' && (
            <div style={{ flex: 1, minWidth: '350px', border: '1px solid #eee', padding: '15px', borderRadius: '8px', background: '#fff', maxHeight: '300px' }}>
            <h4 style={{margin: '0 0 15px 0', textAlign: 'center', color: '#333'}}>{outputs.o2.title}</h4>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={outputs.o2.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={outputs.o2.xAxis} />
                <YAxis />
                <Tooltip contentStyle={{borderRadius: 8}} />
                <Legend verticalAlign="top" height={36}/>
                <Line type="monotone" dataKey={outputs.o2.yAxis} stroke="#82ca9d" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                </LineChart>
            </ResponsiveContainer>
            </div>
        )}
      </div>

      {/* --- O4: DOWNLOAD LINK --- */}
      {labeledOutput && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert(`File saved at: ${labeledOutput.path}`); }}
            style={{ 
              padding: '12px 30px', 
              background: '#28a745', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '30px',
              fontWeight: 'bold',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.1s'
            }}
          >
            ⬇ Download Labeled Dataset
          </a>
        </div>
      )}
    </div>
  );
};