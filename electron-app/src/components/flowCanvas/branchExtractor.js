// branchExtractor.js
import { buildAdjacency, mapNodes } from "./graphValidation";

const DATASET_NODE_ID = "dataset-node";

/**
 * Extract chains as FULL NODE OBJECTS
 * Example return:
 * [
 *   [ {id, baseId, label, type}, ...],
 *   [ {id, baseId, label, type}, ...]
 * ]
 */
export const extractChains = (nodes, edges) => {
  const adjacency = buildAdjacency(edges);
  const nodeMap = mapNodes(nodes);

  const chains = [];

  const dfs = (nodeId, path) => {
    const node = nodeMap.get(nodeId);

    // Push only non-dataset nodes
    if (nodeId !== DATASET_NODE_ID) {
      path = [
        ...path,
        {
          id: node.id,
          baseId: node.data.baseId,
          label: node.data.label,
          type: node.type
        },
      ];
    }

    const children = adjacency.get(nodeId) || [];

    if (children.length === 0) {
      if (path.length > 0) chains.push(path);
      return;
    }

    for (const child of children) {
      dfs(child, path);
    }
  };

  if (nodeMap.has(DATASET_NODE_ID)) {
    dfs(DATASET_NODE_ID, []);
  }

  return chains;
};
