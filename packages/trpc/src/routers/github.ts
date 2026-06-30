import { prisma } from "@cleriocode/db";
import { router, protectedProcedure } from "../trpc.js";

/**
 * GitHub Router
 *
 * Returns the GitHub connection status for the authenticated user by checking
 * if a GitHub OAuth account exists in the accounts table.
 */
export const githubRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const githubAccount = await prisma.account.findFirst({
      where: {
        userId: ctx.user.id,
        providerId: "github",
      },
    });

    return {
      connected: !!githubAccount,
      accountLogin: githubAccount?.accountId ?? null,
    };
  }),
});
