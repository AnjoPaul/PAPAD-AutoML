const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");

// 1. Import Middleware and Routes
const { upload, uploadDir } = require("./middleware/upload");
const resourceRoutes = require("./routes/resources");

// UPDATED IMPORT: We now need the specific function 'handlePreprocessing' as well as the router
const { router: normalProcessRoutes, handlePreprocessing } = require("./routes/normalProcess");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 2. Use the New Routes
app.use(resourceRoutes);       // Adds /model-list, /output-options, etc.
app.use(normalProcessRoutes);  // Adds /preprocess-normal

/* ---------------- Remaining Logic (Domain & Medical) ---------------- */

app.post("/find-domain", upload.single("dataset"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("🚀 [Domain Detection] File received:", req.file.filename);
  console.log("⚠️ [DEV MODE] Returning hardcoded domain: Medical");

  // Simulate a short delay to make it feel real (optional)
  setTimeout(() => {
    res.json({ domain: "Medical" });
  }, 1000);

  /* --- ORIGINAL LOGIC (COMMENTED OUT) ---
  const filePath = path.join(uploadDir, req.file.filename);

  const pythonProcess = spawn("python", [
    "preprocessing/Domain_based_preprocessing/domainDetector.py",
    filePath,
  ]);

  let result = "";
  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      res.json({ domain: result.trim() });
    } else {
      res.status(500).json({ message: "Domain detection failed" });
    }
  });
  ---------------------------------------- */
});

/* Medical preprocessing */
app.post("/preprocess-medical", upload.single("dataset"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = path.join(uploadDir, req.file.filename);

  const pythonProcess = spawn("python", [
    "preprocessing/Domain_based_preprocessing/handle_missing_values/medicalPreprocessor.py",
    filePath,
  ]);

  let result = "";
  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      console.log("🔎 PYTHON OUTPUT:\n", result);

      const lines = result.trim().split("\n");

      const systolicLine = lines.find(l => l.startsWith("SYSTOLIC_BP_COLUMN:"));
      const diastolicLine = lines.find(l => l.startsWith("DIASTOLIC_BP_COLUMN:"));

      const systolicBP = systolicLine
        ? systolicLine.replace("SYSTOLIC_BP_COLUMN:", "").trim()
        : null;
      const diastolicBP = diastolicLine
        ? diastolicLine.replace("DIASTOLIC_BP_COLUMN:", "").trim()
        : null;

      const related = lines
        .filter(l => !l.startsWith("SYSTOLIC_BP_COLUMN:") && !l.startsWith("DIASTOLIC_BP_COLUMN:") && l.includes(":"))
        .map(l => {
          const [col, score] = l.split(":");
          return { column: col.trim(), similarity: parseFloat(score) };
        });

      res.json({
        systolicBPColumn: systolicBP,
        diastolicBPColumn: diastolicBP,
        relatedAttributes: related,
      });
    } else {
      res.status(500).json({ message: "Medical preprocessing failed" });
    }
  });
});


/* ---------------- Run Configuration ---------------- */

app.post("/run-config", upload.single("dataset"), (req, res) => {
  try {
    // 1. Parse Chains
    let chainsRaw = req.body.chains;
    if (typeof chainsRaw === "string") {
        chainsRaw = JSON.parse(chainsRaw);
    }

    console.log(" Raw chains received from frontend:", chainsRaw);

    if (!chainsRaw || !Array.isArray(chainsRaw)) {
      return res.status(400).json({ message: "Invalid chain format received" });
    }

    // 2. Initialize segregated lists
    const pList = []; // Preprocessing
    const mList = []; // Models
    const oList = []; // Output

    // 3. Iterate and Split based on first letter of baseId
    chainsRaw.forEach((chain) => {
        chain.forEach((step) => {
            const baseId = step.baseId || "";
            
            if (baseId.startsWith('n')) {
                pList.push(baseId);
            } else if (baseId.startsWith('m')) {
                mList.push(baseId);
            } else if (baseId.startsWith('o')) {
                oList.push(baseId);
            }
        });
    });

    console.log("Split IDs:");
    console.log("Preprocessing (P):", pList);
    console.log("Models (M):", mList);
    console.log("Outputs (O):", oList);

    // 4. Validate File
    if (!req.file) {
        console.error("Error: No file received! Stopping execution.");
        return res.status(400).json({ message: "Dataset file is required for run-config" });
    }

    // 5. Call the Preprocessing Logic 
   
    console.log(" Triggering Preprocessing & Training...");
    
    handlePreprocessing(req.file.path, true, pList, mList, oList, res);

  } catch (err) {
    console.error(" Error in /run-config:", err);
    if (!res.headersSent) {
        res.status(500).json({ message: "Error processing configuration" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});