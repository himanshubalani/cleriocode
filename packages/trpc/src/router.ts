import { githubRouter } from "./routers/github.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
	health : publicProcedure.query(() => {
		return {
			message: "Hello, I am Working, trpc"
		}
	})
	  github: githubRouter,
});

export type AppRouter = typeof appRouter;