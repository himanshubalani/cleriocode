import { generateObject } from "ai";
import { openrouter, DEFAULT_MODEL } from "../config.js";
import { codeReviewSchema, type CodeReview } from "../schemas/review.schema.js";

export async function generateCodeReview(diff: string): Promise<CodeReview> {
  const result = await generateObject({
    model: openrouter(DEFAULT_MODEL),
    schema: codeReviewSchema,
    prompt: `You are an expert code reviewer acting as a QA Agent. Review the following pull request diff and provide detailed feedback.

Evaluate:
- Code correctness and potential bugs
- Security vulnerabilities
- Performance concerns
- Code quality and maintainability
- Edge cases and error handling

Categorize each issue as:
- critical: Must fix before merge (bugs, security issues, data loss)
- warning: Should fix (performance issues, potential problems)
- suggestion: Nice to have improvements

Diff:
${diff}

If the code looks good with no critical or warning issues, set overallStatus to "passed". Otherwise set it to "needs_changes".`,
  });
  return result.object;
}
