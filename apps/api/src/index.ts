import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@cleriocode/auth";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@cleriocode/trpc";
import { createUserSchema } from "@cleriocode/utils";
import { githubWebhookHandler } from "./webhooks/github.js";

const app = express();

// Mount BetterAuth BEFORE body parsing middleware.
// BetterAuth needs access to the raw request body for its own parsing.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Standard middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// tRPC adapter with session-aware context
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// GitHub webhook handler
app.post("/webhooks/github", githubWebhookHandler);

app.get("/", (req, res) => {
  return res.json({
    message: "Hello Spiderman",
  });
});

app.post("/users", (req, res) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join(", ");

    return res.status(400).json({
      success: false,
      message: "Invalid input",
    });
  }

  console.log("Created user:", result.data);

  return res.status(201).json({
    success: true,
    message: "User created",
    user: result.data,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`);
});
