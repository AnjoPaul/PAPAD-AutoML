import React, { useState } from 'react'; 
import Sidebar from './Sidebar';
import FlowCanvas from './flowCanvas/FlowCanvas';
import LoadingOverlay from './LoadingOverlay'; // 1. Import Overlay

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // 2. Add Global Loading State

  const handleFileChange = (newFile) => {
    setFile(newFile);
    setDomain(null); 
  };
  
  const handleDomainDetected = (detectedDomain) => {
    setDomain(detectedDomain);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* 3. Render Overlay if loading */}
      {isLoading && <LoadingOverlay message="Processing..." />}

      <header
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '12px 20px',
          fontSize: '20px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        PAPAD AutoML
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        <Sidebar 
          file={file}
          onFileChange={handleFileChange}
          onDomainDetected={handleDomainDetected}
          domain={domain}
          setGlobalLoading={setIsLoading} // 4. Pass setter down
        />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <FlowCanvas 
            file={file} 
            domain={domain} 
            style={{ flex: 1, minHeight: 0 }}
            setGlobalLoading={setIsLoading} // 4. Pass setter down
          />
          <footer
            style={{
              backgroundColor: '#f1f1f1',
              padding: '10px 20px',
              textAlign: 'center',
              borderTop: '1px solid #ccc',
              flexShrink: 0,
            }}
          >
            Drap and Drop components
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;