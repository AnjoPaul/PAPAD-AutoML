import React, { useEffect, useState } from "react";
import FileUploader from "./sidebar_components/Preprocessing/FileUploader";
import DomainDetector from "./sidebar_components/Preprocessing/DomainDetector";
import Preprocessor from "./sidebar_components/Preprocessing/Preprocessor";
import PreprocessingModule from "./sidebar_components/Preprocessing/PreprocessingModule";
import ModelSelectionModule from "./sidebar_components/ModelSelection/ModelSelectionModule";
import OutputOptionModule from "./sidebar_components/OutputOptions/OutputOptionModule";

const Sidebar = ({
  file,
  onFileChange,
  onDomainDetected,
  domain,
  setGlobalLoading,
}) => {
  const [NormalprocessingModules, setNormalProcessingModules] = useState([]);
  const [DomainprocessingModules, setDomainProcessingModules] = useState([]);
  const [models, setModels] = useState([]);
  const [outputModules, setOutput] = useState([]);

  const [activeTab, setActiveTab] = useState("normal"); // 'normal' or 'domain'

  // --- COLOR CONSTANTS ---
  const NORMAL_COLOR = "#e87e0eff"; // Orange
  const DOMAIN_COLOR = "#b730cfff"; // Purple

  useEffect(() => {
    // 1. Fetch Normal Modules
    fetch("http://localhost:5000/normal-preprocessing-modules")
      .then((res) => res.json())
      .then(setNormalProcessingModules)
      .catch((err) => console.error("Failed to fetch normal modules:", err));

    // 2. Fetch Domain Modules
    fetch("http://localhost:5000/domain-based-preprocessing-modules")
      .then((res) => res.json())
      .then(setDomainProcessingModules)
      .catch((err) => console.error("Failed to fetch domain modules:", err));

    // 3. Fetch Models
    fetch("http://localhost:5000/model-list")
      .then((res) => res.json())
      .then(setModels)
      .catch((err) => console.error("Failed to fetch models:", err));

    // 4. Fetch Outputs
    fetch("http://localhost:5000/output-options")
      .then((res) => res.json())
      .then(setOutput)
      .catch((err) => console.error("Failed to fetch outputs:", err));
  }, []);

  return (
    <aside
      style={{
        width: 300,
        height: "100vh",
        backgroundColor: "#f0f2f5",
        borderRight: "1px solid #ccc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: 12,
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        {/* 1. Upload Section */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <FileUploader
            onFileSelect={(selectedFile) => {
              onFileChange(selectedFile);
            }}
            onDatasetUpload={(file) =>
              window.dispatchEvent(
                new CustomEvent("dataset-selected", { detail: file })
              )
            }
          />

          {file && (
            <DomainDetector
              file={file}
              onDomainDetected={onDomainDetected}
              setLoading={setGlobalLoading}
            />
          )}

          {file && domain && (
            <Preprocessor
              file={file}
              detectedDomain={domain}
              autoStart={true}
              setLoading={setGlobalLoading}
            />
          )}
        </div>

        {/* 2. Preprocessing Options with Toggle */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h4 style={{ marginBottom: "10px" }}>Preprocessing Options</h4>

          {/* --- TOGGLE SWITCH UI --- */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f1f3f5",
              borderRadius: "6px",
              padding: "4px",
              marginBottom: "15px",
            }}
          >
            {/* Normal Tab Button */}
            <div
              onClick={() => setActiveTab("normal")}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                fontSize: "13px",
                fontWeight: activeTab === "normal" ? "600" : "400",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: activeTab === "normal" ? "#fff" : "transparent",
                color: activeTab === "normal" ? NORMAL_COLOR : "#777",
                boxShadow: activeTab === "normal" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                border: activeTab === "normal" ? `1px solid ${NORMAL_COLOR}20` : "1px solid transparent"
              }}
            >
              Normal
            </div>

            {/* Domain Tab Button */}
            <div
              onClick={() => setActiveTab("domain")}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                fontSize: "13px",
                fontWeight: activeTab === "domain" ? "600" : "400",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: activeTab === "domain" ? "#fff" : "transparent",
                color: activeTab === "domain" ? DOMAIN_COLOR : "#777",
                boxShadow: activeTab === "domain" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                border: activeTab === "domain" ? `1px solid ${DOMAIN_COLOR}20` : "1px solid transparent"
              }}
            >
              Domain Based
            </div>
          </div>

          {/* --- CONDITIONAL LIST RENDERING --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* NORMAL MODULES */}
            {activeTab === "normal" && (
              <>
                {NormalprocessingModules.length > 0 ? (
                  NormalprocessingModules.map((module) => (
                    <PreprocessingModule 
                        key={module.id} 
                        module={module} 
                        type="normal" 
                        color={NORMAL_COLOR}
                    />
                  ))
                ) : (
                  <p style={{ fontSize: 14, color: "#666" }}>Loading normal modules...</p>
                )}
              </>
            )}

            {/* DOMAIN MODULES */}
            {activeTab === "domain" && (
              <>
                 {domain ? (
                    DomainprocessingModules.length > 0 ? (
                      DomainprocessingModules.map((module) => (
                        <PreprocessingModule 
                            key={module.id} 
                            module={module} 
                            type="domain"
                            color={DOMAIN_COLOR} 
                        />
                      ))
                    ) : (
                        <p style={{ fontSize: 14, color: "#666" }}>
                            Fetching modules for {domain}...
                        </p>
                    )
                 ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#888', fontSize: '13px', fontStyle: 'italic' }}>
                        No domain detected yet. <br /> Upload a file to unlock domain modules.
                    </div>
                 )}
              </>
            )}
          </div>
        </div>

        {/* 3. Model Selection */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h4>Model Selection</h4>
          {models.length > 0 ? (
            models.map((model) => (
              <ModelSelectionModule key={model.id} model={model} />
            ))
          ) : (
            <p style={{ fontSize: 14, color: "#666" }}>Loading models...</p>
          )}
        </div>

        {/* 4. Output Options - FIXED */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: 90,
          }}
        >
          <h4>Output Options</h4>
          {outputModules.length > 0 ? (
            outputModules.map((module) => (
              // --- CHANGED: Now using OutputOptionModule ---
              <OutputOptionModule key={module.id} output={module} />
            ))
          ) : (
            <p style={{ fontSize: 14, color: "#666" }}>
              Loading output options...
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;