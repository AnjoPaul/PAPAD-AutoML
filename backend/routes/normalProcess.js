// routes/normalProcess.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { upload } = require("../middleware/upload");

const rootDir = path.join(__dirname, "..");

// --- HELPER FUNCTION TO READ JSON FILES ---
const loadJsonSafe = (filePath) => {
  try {
    const fullPath = path.join(rootDir, filePath);
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading JSON from ${filePath}:`, err);
    return [];
  }
};

// --- NEW HELPER: BUILDS GRAPH FOR FRONTEND ---
const generateGraphData = (pList, mList, oList) => {
  const nodes = [];
  const edges = [];
  let lastNodeId = "dataset-node";
  let xPos = 50;
  
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

  pList.forEach((id) => {
    const module = allPreproc.find(m => m.id === id); // Find by ID
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

  mList.forEach((id) => {
    const module = allModels.find(m => m.id === id); // Find by ID
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

  oList.forEach((id) => {
    const module = allOutputs.find(m => m.id === id); // Find by ID
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


/**
 * 3. UPDATED: Function to Run Output Generation
 */
const handleOutputGeneration = (
  preprocessedFilePath,
  modelPath,
  outputIds,
  trainingResults,
  customIds, // pList
  modelIds,  // mList
  res
) => {
  console.log("📊 [Output Handler] Generating outputs for:", outputIds);

  if (!outputIds || outputIds.length === 0) {
    const graph = generateGraphData(customIds, modelIds, outputIds);
    return res.json({
      message: "Process completed (No outputs requested)",
      trainingResults: trainingResults,
      graph: graph,
      outputs: {}
    });
  }

  const python = spawn("python", [
    "output_section/output_handler.py",
    preprocessedFilePath,
    modelPath,
    JSON.stringify(outputIds)
  ]);

  let scriptOutput = "";
  python.stdout.on("data", (data) => scriptOutput += data.toString());
  python.stderr.on("data", (data) => console.error("Output ERR:", data.toString()));

  python.on("close", (code) => {
    console.log(`🔚 Output Python exited with code ${code}`);
    let visualizationData = {};
    try {
      const jsonStart = scriptOutput.indexOf("__JSON_START__");
      const jsonEnd = scriptOutput.indexOf("__JSON_END__");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = scriptOutput.substring(jsonStart + 14, jsonEnd);
        visualizationData = JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error("Error parsing output JSON:", e);
    }

    const graph = generateGraphData(customIds, modelIds, outputIds);

    // FINAL RESPONSE TO UI
    res.json({
      message: "Pipeline Completed Successfully",
      trainingResults: trainingResults,
      outputs: visualizationData,
      graph: graph 
    });
  });
};

/**
 * 2. UPDATED: Model Training Handler
 */
const handleModelTraining = (
  preprocessedFilePath,
  modelIds,
  outputIds,
  customIds, // pList
  res
) => {
  console.log("🧠 [Model Handler] Starting training for:", modelIds);

  const modelNamesPath = path.join(rootDir, "model_selectionAndTraining", "model_names.json");
  let selectedModels = [];

  try {
    const raw = fs.readFileSync(modelNamesPath, "utf8");
    const allModels = JSON.parse(raw);
    selectedModels = allModels.filter(m => modelIds.includes(m.id) || modelIds.includes(m.baseId));
  } catch (err) {
    return res.status(500).json({ error: "Failed to load model definitions" });
  }
  
  if (selectedModels.length === 0) {
    const graph = generateGraphData(customIds, modelIds, outputIds);
    return res.json({ 
      message: "Preprocessing done. No model trained.",
      graph: graph,
      outputs: {}
    });
  }

  const python = spawn("python", [
    "model_selectionAndTraining/model_handler.py",
    preprocessedFilePath,
    JSON.stringify(selectedModels)
  ]);

  let scriptOutput = "";
  python.stdout.on("data", (data) => scriptOutput += data.toString());
  python.stderr.on("data", (data) => console.error("Model ERR:", data.toString()));

  python.on("close", (code) => {
    let trainingResults = [];
    try {
        const jsonStart = scriptOutput.indexOf("__JSON_START__");
        const jsonEnd = scriptOutput.indexOf("__JSON_END__");
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = scriptOutput.substring(jsonStart + 14, jsonEnd);
            trainingResults = JSON.parse(jsonStr);
        }
    } catch (e) {
      console.error("Error parsing training results:", e);
    }

    if (trainingResults.length > 0) {
      const trainedModelPath = trainingResults[0].path; 
      
      handleOutputGeneration(
        preprocessedFilePath,
        trainedModelPath,
        outputIds,
        trainingResults,
        customIds, // Pass pList
        modelIds,  // Pass mList
        res
      );
    } else {
      res.status(500).json({ message: "Training failed, no results returned." });
    }
  });
};


/**
 * 1. UPDATED: Preprocessing Handler
 */
const handlePreprocessing = (filePath, isCustom, customIds, modelIds, outputIds, res) => {
  let modulesToUse = [];
  const moduleFilePath = path.join(rootDir, "preprocessing","Normal_preprocessing", "normal_preprocessing_modules.json");

  try {
    const raw = fs.readFileSync(moduleFilePath, "utf8");
    const allModules = JSON.parse(raw);

    if (!isCustom) {
      modulesToUse = allModules;
      // --- Populating customIds (pList) with ALL module IDs ---
      customIds = allModules.map(m => m.id);
      console.log("Not custom. Populating customIds with all modules:", customIds);
    } else {
      // Find modules based on the pList from the frontend
      modulesToUse = customIds.map(id => {
        return allModules.find(m => m.id === id); 
      }).filter(m => m !== undefined);
    }
  } catch (err) {
    return res.status(500).json({ error: "Could not load preprocessing modules" });
  }

  const outputPath = path.join(rootDir, "normal_preprocessed_dataset.csv");

  const python = spawn("python", [
    "preprocessing/Normal_preprocessing/normal_preprocessing_handler.py",
    filePath,
    JSON.stringify(modulesToUse),
    outputPath,
  ]);

  python.stdout.on("data", (data) => console.log("Preproc STDOUT:", data.toString()));
  python.stderr.on("data", (data) => console.error("Preproc ERR:", data.toString()));

  python.on("close", (code) => {
    if (code === 0) {
      handleModelTraining(
        outputPath,
        modelIds,
        outputIds,
        customIds, // Pass the populated pList
        res
      );
    } else {
      res.status(500).json({ message: "Preprocessing failed." });
    }
  });
};

// --- THIS IS THE ROUTE WITH THE FIX ---
router.post("/preprocess-normal", upload.single("dataset"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dataset file missing" });
  
  const isCustom = req.body.isCustom === "true";
  
  // Get lists from body (will be empty if not provided)
  let customIds = req.body.ids ? JSON.parse(req.body.ids) : [];
  let modelIds = req.body.modelIds ? JSON.parse(req.body.modelIds) : [];
  let outputIds = req.body.outputIds ? JSON.parse(req.body.outputIds) : [];

  // --- FIX: Add default model and output if NOT custom ---
  if (isCustom === false) {
    console.log("DEFAULT RUN: Adding default model (m1) and output (o1)");
    modelIds = ['m1'];
    outputIds = ['o1'];
    // customIds will be populated by handlePreprocessing
  }

  handlePreprocessing(req.file.path, isCustom, customIds, modelIds, outputIds, res);
});

module.exports = { router, handlePreprocessing };