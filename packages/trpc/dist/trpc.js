import { initTRPC } from '@trpc/server';
const t = initTRPC.create();
export const router = t.router; //router --> declare functions
export const publicProcedure = t.procedure; //functions
//# sourceMappingURL=trpc.js.map