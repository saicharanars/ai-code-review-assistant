import { ZodError } from 'zod';
import { ApiError } from './apierrorclass.js';

export class ZodValidationError extends ApiError {
  public readonly zodIssues: ZodError['issues'];

  constructor(zodError: ZodError) {
    super(400, 'Validation failed', 'ZOD_VALIDATION_ERROR');
    this.zodIssues = zodError.issues;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      errors: this.zodIssues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  }
}
