import DatasetNode from "./nodes/DatasetNode";
import NormalPreprocessingNode from "./nodes/NormalPreprocessingNode";
import DomainPreprocessingNode from "./nodes/DomainPreprocessingNode";
import ModelNode from "./nodes/ModelNode";
import OutputNode from "./nodes/OutputNode";

const nodeTypes = {
  // 1. Fix: Map the types exactly as Sidebar sends them ("normal", "domain")
  normal: NormalPreprocessingNode, 
  domain: DomainPreprocessingNode, 

  // 2. Keep these if your Model/Output logic sends these specific strings
  model: ModelNode,   // or 'modelNode' if that's what is being sent
  output: OutputNode, // or 'outputNode'
  
  // Legacy fallbacks (optional, just in case)
  datasetNode: DatasetNode,
  modelNode: ModelNode,
  outputNode: OutputNode,
};

export default nodeTypes;