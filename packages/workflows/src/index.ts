export { inngest, type InngestEvents } from "./client.js";

export { prdGenerationWorkflow } from "./functions/prd-generation.js";
export { taskGenerationWorkflow } from "./functions/task-generation.js";
export { aiReviewWorkflow } from "./functions/ai-review.js";
export { reReviewWorkflow } from "./functions/re-review.js";
export { releaseCheckWorkflow } from "./functions/release-check.js";
export { repoSyncWorkflow } from "./functions/repo-sync.js";

import { prdGenerationWorkflow } from "./functions/prd-generation.js";
import { taskGenerationWorkflow } from "./functions/task-generation.js";
import { aiReviewWorkflow } from "./functions/ai-review.js";
import { reReviewWorkflow } from "./functions/re-review.js";
import { releaseCheckWorkflow } from "./functions/release-check.js";
import { repoSyncWorkflow } from "./functions/repo-sync.js";

export const functions = [
  prdGenerationWorkflow,
  taskGenerationWorkflow,
  aiReviewWorkflow,
  reReviewWorkflow,
  releaseCheckWorkflow,
  repoSyncWorkflow,
];
