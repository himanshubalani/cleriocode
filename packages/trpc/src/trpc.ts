import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { auth } from '@cleriocode/auth';

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

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 2. Create Protected Procedure
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

export const protectedProcedure = t.procedure.use(isAuthed);