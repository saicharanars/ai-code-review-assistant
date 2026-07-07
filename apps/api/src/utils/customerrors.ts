import {ApiError} from './apierrorclass.js'
// 400 Bad Request
export class ValidationError extends ApiError {
  constructor(message = 'Invalid input data') {
    super(400, message, 'VALIDATION_ERROR');
  }
}

// 401 Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

// 403 Forbidden
export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

// 404 Not Found
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

// 409 Conflict
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message, 'CONFLICT');
  }
}

// 500 Internal Server Error
export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}

