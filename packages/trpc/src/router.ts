import { workspaceRouter } from "./routers/workspace.js";
import { projectRouter } from "./routers/project.js";
import { featureRequestRouter } from "./routers/featureRequest.js";
import { prdRouter } from "./routers/prd.js";
import { taskRouter } from "./routers/task.js";
import { githubRouter } from "./routers/github.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ message: "ok" })),
  workspace: workspaceRouter,
  project: projectRouter,
  featureRequest: featureRequestRouter,
  prd: prdRouter,
  task: taskRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
