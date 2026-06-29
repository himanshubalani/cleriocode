import { router, protectedProcedure } from "../trpc.js";

/**
 * GitHub Router
 * 
 * TODO: Full implementation pending GitHub integration task.
 * Requires: githubInstallation Prisma model, @cleriocode/utils getGithubApp, triggerRepoSync function.
 */
export const githubRouter = router({
  // Placeholder — full implementation in a later task
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return {
      connected: false,
      accountLogin: null,
    };
  }),
});
