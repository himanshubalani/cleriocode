import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { auth } from '@cleriocode/auth';
import { assertWorkspaceRole } from '@cleriocode/services';

// 1. Create Context
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // BetterAuth can read the headers from Express to find the session
  const session = await auth.api.getSession({ headers: req.headers as any });
  
  return {
    req,
    res,
    session: session?.session,
    user: session?.user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 2. Auth middleware — validates ctx.user exists or throws UNAUTHORIZED
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

export const authedProcedure = t.procedure.use(isAuthed);

// Backward compatibility alias
export const protectedProcedure = authedProcedure;

// 3. Workspace middleware — validates user membership in the target workspace or throws FORBIDDEN
const hasWorkspace = t.middleware(async ({ ctx, next, rawInput }) => {
  // Extract workspaceId from input — workspace-scoped procedures receive workspaceId as part of the input
  const input = rawInput as { workspaceId?: string } | undefined;
  const workspaceId = input?.workspaceId;

  if (!workspaceId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'workspaceId is required' });
  }

  // ctx.user is guaranteed to exist because isAuthed runs first
  const user = ctx.user as NonNullable<typeof ctx.user>;

  try {
    // Verify user has at least 'member' role in this workspace
    await assertWorkspaceRole(workspaceId, user.id, 'member');
  } catch {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this workspace' });
  }

  return next({
    ctx: {
      ...ctx,
      workspaceId,
    },
  });
});

export const workspaceProcedure = t.procedure.use(isAuthed).use(hasWorkspace);
