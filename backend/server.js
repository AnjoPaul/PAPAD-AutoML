const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");

const { upload, uploadDir } = require("./middleware/upload");
const resourceRoutes = require("./routes/resources");
const { router: normalProcessRoutes, handlePreprocessing, processBranch } = require("./routes/normalProcess");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use(resourceRoutes);
app.use(normalProcessRoutes);

/* ---------------- Remaining Logic (Domain & Medical) ---------------- */

app.post("/find-domain", upload.single("dataset"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("🚀 [Domain Detection] File received:", req.file.filename);
  console.log("⚠️ [DEV MODE] Returning hardcoded domain: Medical");

  setTimeout(() => {
    res.json({ domain: "Medical" });
  }, 1000);
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

app.post("/run-config", upload.single("dataset"), async (req, res) => {
  try {
    if (!req.file) {
        return res.status(400).json({ message: "Dataset file is required" });
    }

    let chainsRaw = req.body.chains;
    if (typeof chainsRaw === "string") {
        chainsRaw = JSON.parse(chainsRaw);
    }

    console.log("🚀 [RunConfig] Received Branches:", Object.keys(chainsRaw));

    // Prepare Promises
    const branchPromises = Object.entries(chainsRaw).map(async ([branchName, nodes]) => {
        console.log(`\n🌿 [Branch: ${branchName}] Processing ${nodes.length} nodes...`);

        const pList = [];
        const mList = [];
        const oList = [];

        nodes.forEach((step) => {
            const baseId = step.baseId || "";
            if (baseId.startsWith('n') || baseId.startsWith('p')) pList.push(baseId);
            else if (baseId.startsWith('m')) mList.push(baseId);
            else if (baseId.startsWith('o')) oList.push(baseId);
        });

        try {
            const result = await processBranch(branchName, req.file.path, pList, mList, oList);
            return { branchName, status: 'success', data: result };
        } catch (error) {
            console.error(`❌ [${branchName} FAILED] ${error.message}`);
            return { branchName, status: 'error', error: error.message };
        }
    });

    const resultsArray = await Promise.all(branchPromises);

    const finalResults = {};

    resultsArray.forEach(item => {
        if (item.status === 'success') {
            finalResults[item.branchName] = item.data;
        } else {
            // --- FIX: Add failed branch to finalResults with Error Info ---
            finalResults[item.branchName] = {
                status: 'failed',
                error: item.error, // Pass the specific error message
                trainingResults: [], // Empty so it doesn't break UI
                outputs: {}
            };
        }
    });

    // Send everything in 'outputs' so the frontend ResultsPanel can render it
    res.json({
        message: "Multi-Branch Pipeline Completed",
        outputs: finalResults, 
        trainingResults: [], 
        graph: {} 
    });

  } catch (err) {
    console.error("❌ [RunConfig] Critical Error:", err);
    if (!res.headersSent) {
        res.status(500).json({ message: "Error processing configuration", details: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});