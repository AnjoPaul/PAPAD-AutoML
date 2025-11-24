import React, { useState, useEffect } from "react";
import axios from "axios";
import ErrorPopup from '../../ErrorPopup'; 

// 1. Accept 'setLoading' prop (which is setGlobalLoading from parent)
const Preprocessor = ({ file, detectedDomain, autoStart = false, setLoading }) => {
  // Remove local loading state: const [loading, setLoading] = useState(false); 
  const [systolicBP, setSystolicBP] = useState(null);
  const [diastolicBP, setDiastolicBP] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null); 

  useEffect(() => {
    setSystolicBP(null);
    setDiastolicBP(null);
    setRelated([]);
  }, [file]);

  const handlePreprocess = async (type) => {
    if (!file) {
      setError("Please upload a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("dataset", file);

    const isCustom = type === "domain"; 
    formData.append("isCustom", isCustom.toString());

    const apiUrl =
      type === "domain"
        ? "http://localhost:5000/preprocess-medical"
        : "http://localhost:5000/preprocess-normal";

    try {
      if (setLoading) setLoading(true); // Use global loader
      setError(null); 
      console.log(`⚙️ Starting ${type} preprocessing...`);

      const res = await axios.post(apiUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Preprocessing response:", res.data);

      // --- FIRE EVENT TO UPDATE UI ---
      if (res.data.graph && res.data.outputs) {
        console.log("🚀 Firing 'normal-run-complete' event!");
        window.dispatchEvent(
          new CustomEvent("normal-run-complete", { detail: res.data })
        );
      }

      if (res.data.systolicBPColumn || res.data.relatedAttributes) {
        setSystolicBP(res.data.systolicBPColumn);
        setDiastolicBP(res.data.diastolicBPColumn);
        setRelated(res.data.relatedAttributes);
      } else {
        console.log("Normal preprocessing complete:", res.data.message);
      }

    } catch (err) {
      console.error("❌ Error during preprocessing:", err);
      setError("Something went wrong during preprocessing.");
    } finally {
      if (setLoading) setLoading(false); // Hide global loader
    }
  };

  const normalizedDomain = detectedDomain
    ? detectedDomain.toString().trim().toLowerCase()
    : "";
  const isMedical = normalizedDomain === "medical";

  return (
    <div>
      {error && <ErrorPopup message={error} onClose={() => setError(null)} />}
      <p style={{ marginBottom: 10, fontWeight: "bold" }}>Create Main Branch with:</p>

      {isMedical ? (
        <div style={{ display: "flex", flexDirection: "row", gap: 10 }}> 
          <button
            onClick={() => handlePreprocess("domain")}
            // disabled={loading} // Global overlay blocks interaction anyway
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 6,
              backgroundColor: "#007bff",
              color: "white",
              cursor: "pointer",
              flex: 1,
            }}
          >
            Domain Based Preprocessing
          </button>
          <button
            onClick={() => handlePreprocess("normal")}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 6,
              backgroundColor: "#28a745",
              color: "white",
              cursor: "pointer",
              flex: 1,
            }}
          >
            Normal Preprocessing
          </button>
        </div>
      ) : (
        <button
          onClick={() => handlePreprocess("normal")}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 6,
            backgroundColor: "#28a745",
            color: "white",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Normal Preprocessing
        </button>
      )}

      {/* Local Results Display (Only for Medical/Domain specific info) */}
      {(systolicBP || diastolicBP) && (
        <div style={{ marginTop: 15, padding: 20, backgroundColor: "#e4e4e4ff", borderRadius: 6 }}>
          <h4 style={{ margin: "2px 0" }}>Detected Blood Pressure Columns:</h4>
          Systolic: {systolicBP || "Not detected"} <br />
          Diastolic: {diastolicBP || "Not detected"}
          <h5 style={{ margin: "5px 0" }}>Strongest Predictors:</h5>
          <ul style={{ margin: 0, paddingLeft: 0, listStyleType: "none" }}>
            {related && related.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 2 }}>
                {item.column}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Preprocessor;