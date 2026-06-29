/**
 * @cleriocode/auth
 *
 * BetterAuth server instance and typed helpers for session management.
 * Re-exports the configured auth instance and utility functions.
 */
export { auth, type Auth } from "./auth.js";

/**
 * Typed helper to get the current session from request headers.
 * Use this in API middleware to extract the authenticated user.
 *
 * @example
 * ```ts
 * import { auth } from "@cleriocode/auth";
 *
 * const session = await auth.api.getSession({
 *   headers: req.headers,
 * });
 * ```
 */
export type Session = Awaited<ReturnType<typeof import("./auth.js").auth.api.getSession>>;
