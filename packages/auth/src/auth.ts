/**
 * BetterAuth Server Configuration
 *
 * Required environment variables:
 * - BETTER_AUTH_SECRET: Secret key for session encryption and token signing
 * - BETTER_AUTH_URL: Base URL of the auth server (e.g., http://localhost:5000)
 * - GITHUB_CLIENT_ID: GitHub OAuth App client ID
 * - GITHUB_CLIENT_SECRET: GitHub OAuth App client secret
 * - DATABASE_URL: PostgreSQL connection string (used by @cleriocode/db)
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@cleriocode/db";

export const auth = betterAuth({
  /**
   * Secret used for signing tokens and encrypting sessions.
   * Must be set via BETTER_AUTH_SECRET env var.
   */
  secret: process.env.BETTER_AUTH_SECRET,

  /**
   * Base URL where the auth server is accessible.
   * Used for OAuth callbacks and email verification links.
   */
  baseURL: process.env.BETTER_AUTH_URL,

  /**
   * Trusted origins for session validation.
   * FRONTEND_URL covers both local dev and ngrok tunnel origins.
   */
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
  ].filter(Boolean) as string[],

  /**
   * Advanced configuration for cross-origin cookie handling.
   * Required when frontend and API are on different domains (e.g., ngrok tunnels).
   */
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: "none" as const,
      secure: true,
    },
  },

  /**
   * Prisma adapter connecting to User, Session, Account, Verification tables.
   */
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  /**
   * Email and password authentication provider.
   */
  emailAndPassword: {
    enabled: true,
  },

  /**
   * Social OAuth providers.
   */
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,

      mapProfileToUser:async(profile)=>({
        email: profile.email ?? `${profile.id}@users.noreply.github.com`,
        name: profile.name ?? profile.login,
      })
    },
  },
});

export type Auth = typeof auth;
