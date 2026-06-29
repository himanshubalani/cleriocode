// Config
export { openrouter, DEFAULT_MODEL } from "./config.js";

// Schemas
export { prdSchema, type PRDContent } from "./schemas/prd.schema.js";
export { taskSchema, taskBreakdownSchema, type TaskBreakdown, type TaskItem } from "./schemas/task.schema.js";
export { reviewCommentSchema, codeReviewSchema, type CodeReview, type ReviewComment } from "./schemas/review.schema.js";

// Prompts
export { generatePRD } from "./prompts/prd-generation.js";
export { generateTaskBreakdown } from "./prompts/task-breakdown.js";
export { generateCodeReview } from "./prompts/code-review.js";
export { generateReReview } from "./prompts/re-review.js";
export { generateContextReview, type ContextReviewInput } from "./prompts/context-review.js";

// Pinecone
export {
  getPineconeIndex,
  buildPrNamespace,
  buildRepoNamespace,
  saveChunksToPinecone,
  searchPrContext,
  deleteNamespace,
} from "./pinecone/index.js";

// Utils
export { chunkPrFiles, chunkRepoFiles } from "./utils/index.js";

// Types
export type { CodeChunk, PrFile, RepoFile } from "./types/index.js";
