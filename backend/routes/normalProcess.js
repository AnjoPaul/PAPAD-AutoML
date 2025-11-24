// routes/normalProcess.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { upload } = require("../middleware/upload");

const rootDir = path.join(__dirname, "..");

// --- 1. HELPER: Load JSON ---
const loadJsonSafe = (filePath) => {
  try {
    const fullPath = path.join(rootDir, filePath);
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

// --- 2. HELPER: Generate Graph Data (Restored) ---
// This builds the node/edge structure so the frontend knows what to render
// for default runs or processed branches.
const generateGraphData = (pList, mList, oList) => {
  const nodes = [];
  const edges = [];
  let lastNodeId = "dataset-node";
  let xPos = 50; // Start X position
  
  // 1. Dataset Node
  nodes.push({
    id: "dataset-node",
    type: "datasetNode",
    position: { x: xPos, y: 100 },
    data: { label: "Dataset" },
  });
  xPos += 250;

  const allPreproc = loadJsonSafe("preprocessing/Normal_preprocessing/normal_preprocessing_modules.json");
  const allModels = loadJsonSafe("model_selectionAndTraining/model_names.json");
  const allOutputs = loadJsonSafe("output_section/output_options.json");

  // 2. Preprocessing Nodes
  pList.forEach((id) => {
    const module = allPreproc.find(m => m.id === id);
    if (!module) return;
    
    const newNodeId = `p_${id}_${Date.now()}`;
    nodes.push({
      id: newNodeId,
      type: "preprocessingNode",
      position: { x: xPos, y: 100 },
      data: { label: module.label, baseId: id }
    });
    edges.push({ id: `e-${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId, animated: true });
    lastNodeId = newNodeId;
    xPos += 250;
  });

  // 3. Model Nodes
  mList.forEach((id) => {
    const module = allModels.find(m => m.id === id);
    if (!module) return;

    const newNodeId = `m_${id}_${Date.now()}`;
    nodes.push({
      id: newNodeId,
      type: "modelNode",
      position: { x: xPos, y: 100 },
      data: { label: module.label, baseId: id }
    });
    edges.push({ id: `e-${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId, animated: true });
    lastNodeId = newNodeId;
    xPos += 250;
  });

  // 4. Output Nodes
  oList.forEach((id) => {
    const module = allOutputs.find(m => m.id === id);
    if (!module) return;

    const newNodeId = `o_${id}_${Date.now()}`;
    nodes.push({
      id: newNodeId,
      type: "outputNode",
      position: { x: xPos, y: 85 },
      data: { label: module.label, baseId: id }
    });
    edges.push({ id: `e-${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId, animated: true });
    lastNodeId = newNodeId;
    xPos += 250;
  });

  return { nodes, edges };
};

// --- 3. HELPER: Promisified Spawn ---
// Runs python scripts asynchronously
const runPythonScript = (scriptPath, args) => {
  return new Promise((resolve, reject) => {
    const python = spawn("python", [scriptPath, ...args]);
    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => { output += data.toString(); });
    python.stderr.on("data", (data) => { errorOutput += data.toString(); });

    python.on("close", (code) => {
      if (errorOutput) console.error(`[Py-Err] ${scriptPath}:`, errorOutput);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Script exited with code ${code}: ${errorOutput}`));
      }
    });
  });
};

/**
 * CORE FUNCTION: Process a Single Branch
 * 1. Preprocess (with logging)
 * 2. Train Model
 * 3. Generate Output
 * 4. Generate Graph JSON
 * Returns: { outputs, trainingResults, graph }
 */
const processBranch = async (branchName, datasetPath, pList, mList, oList) => {
  console.log(`\n🌿 Processing Branch: ${branchName}`);
  console.log(`   Nodes -> P:${pList.length} | M:${mList.length} | O:${oList.length}`);

  // Setup Paths
  const logDirName = `${branchName}_logging`;
  const logDirPath = path.join(rootDir, "preprocessing", "Normal_preprocessing", logDirName);
  
  if (!fs.existsSync(logDirPath)){
      fs.mkdirSync(logDirPath, { recursive: true });
  }

  const outputCsvName = `${branchName}_processed.csv`;
  const preprocessedPath = path.join(rootDir, outputCsvName);

  // Prepare Modules
  const allModules = loadJsonSafe("preprocessing/Normal_preprocessing/normal_preprocessing_modules.json");
  const modulesToUse = pList.map(id => allModules.find(m => m.id === id)).filter(Boolean);

  // A. RUN PREPROCESSING
  try {
    await runPythonScript(
      "preprocessing/Normal_preprocessing/normal_preprocessing_handler.py",
      [
        datasetPath,
        JSON.stringify(modulesToUse),
        preprocessedPath,
        logDirPath // Pass log folder to Python
      ]
    );
    console.log(`   ✅ Preprocessing Complete. Logs in: ${logDirName}`);
  } catch (err) {
    console.error(`   ❌ Preprocessing Failed for ${branchName}:`, err.message);
    throw err;
  }

  // B. RUN MODEL TRAINING
  let trainingResults = [];
  let trainedModelPath = null;

  if (mList.length > 0) {
    try {
      const allModels = loadJsonSafe("model_selectionAndTraining/model_names.json");
      const selectedModels = allModels.filter(m => mList.includes(m.id) || mList.includes(m.baseId));
      
      if (selectedModels.length > 0) {
        const output = await runPythonScript(
          "model_selectionAndTraining/model_handler.py",
          [preprocessedPath, JSON.stringify(selectedModels)]
        );

        const jsonStart = output.indexOf("__JSON_START__");
        const jsonEnd = output.indexOf("__JSON_END__");
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = output.substring(jsonStart + 14, jsonEnd);
            trainingResults = JSON.parse(jsonStr);
            if (trainingResults.length > 0) {
                trainedModelPath = trainingResults[0].path;
            }
        }
        console.log(`   ✅ Model Training Complete.`);
      }
    } catch (err) {
      console.error(`   ❌ Model Training Failed for ${branchName}:`, err.message);
    }
  }

  // C. RUN OUTPUT GENERATION
  let visualizationData = {};
  if (oList.length > 0 && trainedModelPath) {
    try {
      const output = await runPythonScript(
        "output_section/output_handler.py",
        [preprocessedPath, trainedModelPath, JSON.stringify(oList)]
      );

      const jsonStart = output.indexOf("__JSON_START__");
      const jsonEnd = output.indexOf("__JSON_END__");
      if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = output.substring(jsonStart + 14, jsonEnd);
          visualizationData = JSON.parse(jsonStr);
      }
      console.log(`   ✅ Output Generation Complete.`);
    } catch (err) {
       console.error(`   ❌ Output Generation Failed for ${branchName}:`, err.message);
    }
  }

  // D. GENERATE GRAPH DATA (FIX ADDED HERE)
  const graphData = generateGraphData(pList, mList, oList);

  return {
    outputs: visualizationData,
    trainingResults: trainingResults,
    graph: graphData // <--- Returns the graph structure for frontend rendering
  };
};

// --- ROUTE: Main Branch / Single Run (/preprocess-normal) ---
router.post("/preprocess-normal", upload.single("dataset"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dataset file missing" });

  const isCustom = req.body.isCustom === "true";
  let customIds = req.body.ids ? JSON.parse(req.body.ids) : [];
  let modelIds = req.body.modelIds ? JSON.parse(req.body.modelIds) : [];
  let outputIds = req.body.outputIds ? JSON.parse(req.body.outputIds) : [];

  // Default setup if not custom
  if (!isCustom) {
     console.log("DEFAULT RUN: Adding default model (m1) and output (o1)");
     modelIds = ['m1'];
     outputIds = ['o1'];
     // Fetch all modules for pList if empty
     const allModules = loadJsonSafe("preprocessing/Normal_preprocessing/normal_preprocessing_modules.json");
     if (customIds.length === 0) customIds = allModules.map(m => m.id);
  }

  try {
    // Process as "main_branch" or "default"
    const result = await processBranch("main_branch", req.file.path, customIds, modelIds, outputIds);
    
    // Response includes result.graph automatically now
    res.json({
        message: "Pipeline Completed Successfully",
        ...result 
    });
  } catch (err) {
    res.status(500).json({ message: "Pipeline Processing Failed", error: err.message });
  }
});

module.exports = { router, processBranch };