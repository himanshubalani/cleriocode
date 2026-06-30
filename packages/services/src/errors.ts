export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id ${id} not found`, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, message: string) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502);
  }
}
