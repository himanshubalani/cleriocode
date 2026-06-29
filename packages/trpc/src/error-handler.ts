import { TRPCError } from "@trpc/server";
import { DomainError } from "@cleriocode/services";

const codeMap: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  EXTERNAL_SERVICE_ERROR: "INTERNAL_SERVER_ERROR",
};

/**
 * Maps a DomainError (or unknown error) into a TRPCError and throws it.
 * Use inside router procedures to translate service-layer errors into
 * proper tRPC error responses.
 */
export function mapDomainError(error: unknown): never {
  if (error instanceof DomainError) {
    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
