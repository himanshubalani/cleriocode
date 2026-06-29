import { generateObject } from "ai";
import { openrouter, DEFAULT_MODEL } from "../config.js";
import { codeReviewSchema, type CodeReview } from "../schemas/review.schema.js";
import type { ReviewComment } from "../schemas/review.schema.js";

export async function generateReReview(
  diff: string,
  previousComments: ReviewComment[]
): Promise<CodeReview> {
  const result = await generateObject({
    model: openrouter(DEFAULT_MODEL),
    schema: codeReviewSchema,
    prompt: `You are an expert code reviewer acting as a QA Agent. This is a re-review of code that was previously reviewed. The developer has pushed fixes to address the previous review comments.

Previous review comments that should be addressed:
${previousComments.map(c => `[${c.severity}] ${c.file}${c.line ? `:${c.line}` : ""} — ${c.message}`).join("\n")}

New diff (changes since last review):
${diff}

Check whether the previous issues have been resolved. Look for any new issues introduced by the fixes. If all previous critical/warning issues are resolved and no new ones exist, set overallStatus to "passed".`,
  });
  return result.object;
}
