import { extractChains } from './branchExtractor';

const DATASET_NODE_ID = "dataset-node";

// --- Core Graph Utilities (from graphUtils.js) ---

/**
 * Builds a Map for fast child lookup: Map { 'nodeA' => ['nodeB', 'nodeC'] }
 */
export const buildAdjacency = (edgeList) => {
  const map = new Map();
  for (const e of edgeList) {
    if (!map.has(e.source)) map.set(e.source, []);
    map.get(e.source).push(e.target);
  }
  return map;
};

/**
 * Builds a Map for fast node lookup: Map { 'nodeA' => { ...nodeObject } }
 */
export const mapNodes = (nodesList) =>
  new Map(nodesList.map((n) => [n.id, n]));

// --- Validation Helpers (from validation.js) ---

/**
 * Checks if a node is connected to the dataset (recursively)
 */
export const isConnectedToDataset = (nodeId, edges) => {
  if (nodeId === DATASET_NODE_ID) return true;
  const incoming = edges.filter((e) => e.target === nodeId);
  if (incoming.length === 0) return false;
  return incoming.some((e) => isConnectedToDataset(e.source, edges));
};

/**
 * Checks for duplicate modules in a single path
 */
export const hasDuplicateBaseIdInAnyPath = (nodes, edges) => {
  const adjacency = buildAdjacency(edges);
  const nodeMap = mapNodes(nodes);
  let duplicateFound = false;

  const dfs = (nodeId, used) => {
    if (duplicateFound) return;
    const node = nodeMap.get(nodeId);
    const baseId = node?.data?.baseId || null;

    if (baseId && used.has(baseId)) {
      duplicateFound = true;
      return;
    }
    const nextUsed = new Set(used);
    if (baseId) nextUsed.add(baseId);

    const children = adjacency.get(nodeId) || [];
    for (const child of children) {
      dfs(child, nextUsed);
    }
  };
  if (nodeMap.has(DATASET_NODE_ID)) dfs(DATASET_NODE_ID, new Set());
  return duplicateFound;
};

/**
 * Helper to build a "reverse" adjacency map for crawling upstream.
 * Map { 'nodeB' => 'nodeA' }
 */
const buildReverseAdjacency = (edgeList) => {
  const map = new Map();
  for (const e of edgeList) {
    map.set(e.target, e.source); // Assumes one parent per node
  }
  return map;
};

/**
 * Crawls UP the graph from a start node to see if a node of a specific type
 * (e.g., 'modelNode') exists anywhere in its history.
 */
function hasUpstreamNodeOfType(startNodeId, edges, nodeMap, targetType) {
  const revAdjacency = buildReverseAdjacency(edges);
  let currentNodeId = startNodeId;

  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (node && node.type === targetType) {
      return true;
    }
    // Stop if we hit the dataset node
    if (currentNodeId === DATASET_NODE_ID) {
      return false;
    }
    // Move to the parent node
    currentNodeId = revAdjacency.get(currentNodeId);
  }
  return false;
}

// --- Main Validator 1: Real-time Connection Rules ---

/**
 * This is the new, powerful validator for the onConnect action.
 * It checks Rules 1 & 2 *before* a connection is made.
 */
export const validateConnection = (nodes, edges, connection) => {
  const nodeMap = mapNodes(nodes);
  const sourceNode = nodeMap.get(connection.source);
  const targetNode = nodeMap.get(connection.target);

  if (!sourceNode || !targetNode) return "Node not found.";
  
  // Rule 0: Basic connection validation
  if (connection.target === DATASET_NODE_ID)
    return "❌ Cannot connect INTO the Dataset node.";

  if (!isConnectedToDataset(connection.source, edges))
    return "❌ Source must be connected to the Dataset first.";

  // Rule 1: No preprocessing after a model.
  // Check 1.a: Connecting *from* a model *to* preprocessing
  if (sourceNode.type === 'modelNode' && targetNode.type === 'normalpreprocessingNode') {
    return `Rule Error: Cannot connect a Model node ("${sourceNode.data.label}") to a Preprocessing node ("${targetNode.data.label}").`;
  }
  // Check 1.b: Connecting *to* a preprocessing node when a model is already upstream
  if (targetNode.type === 'normalpreprocessingNode' && hasUpstreamNodeOfType(connection.source, edges, nodeMap, 'modelNode')) {
    return `Rule Error: Cannot add Preprocessing node ("${targetNode.data.label}") after a Model node.`;
  }

  // Rule 2: Only one model per branch.
  // Check 2.a: Connecting *from* a model *to* another model
  if (sourceNode.type === 'modelNode' && targetNode.type === 'modelNode') {
    return `Rule Error: Cannot connect a Model node to another Model node. Only one model per branch.`;
  }
  // Check 2.b: Connecting *to* a model when a model is already upstream
  if (targetNode.type === 'modelNode' && hasUpstreamNodeOfType(connection.source, edges, nodeMap, 'modelNode')) {
    return `Rule Error: Cannot add a second Model node ("${targetNode.data.label}") to this branch. Only one model per branch.`;
  }
  
  // Rule 3 (Partial): Output must be the end.
  // Check 3.a: Cannot connect *from* an output node
  if (sourceNode.type === 'outputNode') {
      return `Rule Error: Output nodes ("${sourceNode.data.label}") must be the end of a pipeline.`;
  }
  
  // Check for simple duplicates (already in your old code)
  const simulatedEdges = [...edges, { ...connection, id: `sim_${Date.now()}` }];
  if (hasDuplicateBaseIdInAnyPath(nodes, simulatedEdges)) {
    return "❌ Same module cannot appear twice in the same branch!";
  }

  // All rules passed
  return null;
};

// --- Main Validator 2: Final Pipeline "Run" Rules ---

/**
 * Rule 4: Checks for any nodes that aren't connected to the main graph.
 */
function findStandaloneNodes(nodes, edges) {
  for (const node of nodes) {
    if (node.id === DATASET_NODE_ID) continue;
    
    // Check if it's connected back to the dataset
    if (!isConnectedToDataset(node.id, edges)) {
       return `Error: Node "${node.data.label}" is not part of a chain from the Dataset node.`;
    }
  }
  return null;
}

/**
 * Rule 3: Checks the logic of each branch for completeness.
 */
function validateBranchLogic(chains) {
  if (chains.length === 0) {
    return "Error: No complete pipeline found. Connect your nodes from the Dataset to an Output.";
  }

  for (const chain of chains) {
    const lastNode = chain[chain.length - 1];
    if (lastNode.type !== 'outputNode') {
      return `Error: Branch ending in "${lastNode.label}" must end with an Output node.`;
    }
    
    const hasModel = chain.some(step => step.type === 'modelNode');
    if (!hasModel) {
      return `Error: Branch ending in "${lastNode.label}" does not contain a Model node.`;
    }
  }
  
  return null;
}

/**
 * Main validator function for the "Run Config" button.
 */
export function validatePipeline(nodes, edges) {
  
  // Run Rule 4 (Standalone Nodes)
  const standaloneError = findStandaloneNodes(nodes, edges);
  if (standaloneError) return standaloneError;

  // Extract all branches
  const chains = extractChains(nodes, edges);

  // Run Rule 3 (Branch Logic)
  const branchError = validateBranchLogic(chains);
  if (branchError) return branchError;
  
  return null;
}