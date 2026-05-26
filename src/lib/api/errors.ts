export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('Forbidden', 403)
  }
}
