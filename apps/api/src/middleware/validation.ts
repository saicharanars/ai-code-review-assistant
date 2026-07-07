import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodObject, ZodRawShape, ZodIssue } from 'zod';

type ValidationSchemas = {
  body?: ZodObject<ZodRawShape>;
  query?: ZodObject<ZodRawShape>;
  params?: ZodObject<ZodRawShape>;
};

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) schemas.body.parse(req.body);
      if (schemas.query) schemas.query.parse(req.query);
      if (schemas.params) schemas.params.parse(req.params);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const simplifiedErrors = error.issues.map((issue: ZodIssue) => ({
          message: issue.message,
          path: issue.path.join('.'),
        }));

        return res.status(400).json({ errors: simplifiedErrors });
      }

      return next(error);
    }
  };
};
