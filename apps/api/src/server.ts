import { json, urlencoded } from "body-parser";
import express, { ErrorRequestHandler,Request,Response, NextFunction, type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import { ApiError } from "./utils/apierrorclass";
import { ZodValidationError } from "./utils/zod.errorclass";
import cookieParser from "cookie-parser";
import userroute from "./users/user.route";
import { config } from "./config";

export const createServer = (): Express => {
  const app = express();

  const errorHandler: ErrorRequestHandler = (
    err, // Error
    _req: Request, // Request
    res: Response, // Response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction // NextFunction  ← required!
  ) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        message: err.message,
        errorCode: err.errorCode,
      });
    }
    if (err instanceof ZodValidationError) {
      return res.status(err.statusCode).json({
        message: err.message,
        errorCode: err.errorCode,
      });
    }
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' });
  };

  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cookieParser())

    .use(cors({ origin: config.appUrl, credentials: true }))
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    })
    .get("/status", (_, res) => {
      return res.json({ ok: true });
    });
  app.use('/api/users',userroute)
  app.use(errorHandler);

  return app;
};
