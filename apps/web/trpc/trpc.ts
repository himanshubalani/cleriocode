import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@cleriocode/trpc";

export const trpc = createTRPCReact<AppRouter>();