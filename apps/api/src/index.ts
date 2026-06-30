import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@cleriocode/auth";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@cleriocode/trpc";
import { createUserSchema } from "@cleriocode/utils";
import { inngest, functions } from "@cleriocode/workflows";
import { githubWebhookHandler } from "./webhooks/github.js";
import { razorpayWebhookHandler } from "./webhooks/razorpay.js";

const app = express();

// CORS must be first — applies to ALL routes including BetterAuth
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Mount BetterAuth BEFORE body parsing middleware.
// BetterAuth needs access to the raw request body for its own parsing.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Webhook routes — parse as raw text so HMAC signature verification
// uses the original bytes, not a re-serialized JSON object.
app.post(
  "/webhooks/github",
  express.text({ type: "application/json" }),
  githubWebhookHandler
);
app.post(
  "/webhooks/razorpay",
  express.text({ type: "application/json" }),
  razorpayWebhookHandler
);

// Standard middleware for all other routes
app.use(express.json());

// tRPC adapter with session-aware context
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Inngest serve endpoint for workflow function registration
app.use("/api/inngest", serve({ client: inngest, functions }));

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

  console.log("Created user");

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
