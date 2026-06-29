import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@cleriocode/db";
import { getGithubApp } from "@cleriocode/utils"; // Move octokit logic to utils

export const githubRouter = router({
  // Replaces getInstallationStatus action
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId: ctx.user.id }
    });
    
    if (!installation) return { connected: false, accountLogin: null };
    
    return {
      connected: true,
      accountLogin: installation.accountLogin,
    };
  }),

  // Replaces syncRepoCodebase action
  syncRepo: protectedProcedure
    .input(z.object({ repoFullName: z.string(), branch: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const installation = await prisma.githubInstallation.findUnique({
        where: { userId: ctx.user.id }
      });

      if (!installation) throw new Error("GitHub not connected");

      // Note: triggerRepoSync will fire the Inngest event
      await triggerRepoSync(installation.installationId, input.repoFullName, input.branch);
      return { success: true };
    })
});