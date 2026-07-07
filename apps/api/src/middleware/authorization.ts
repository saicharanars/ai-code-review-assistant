import { Request, Response, NextFunction } from 'express';
import { accessToken } from '../types/user.js';
import * as dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import {
  ForbiddenError,
  InternalError,
  UnauthorizedError,
} from '../utils/customerrors.js';

interface AuthRequest extends Request {
  user?: jwt.JwtPayload | string;
}

const Authorization = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      console.log(authHeader)
      if (!authHeader) {
        throw new UnauthorizedError('Authorization header is missing');
      }

      if (authHeader.split(' ')[0] !== 'Bearer') {
        throw new UnauthorizedError('authorization schema is not bearer');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedError('token is missing');
      }

      const secret = process.env.JWT_SECRET_KEY;
      if (!secret) {
        throw new InternalError('JWT secret key is not defined');
      }

      const verified = jwt.verify(token, secret);

      if (typeof verified === 'string') {
        throw new UnauthorizedError('Invalid token structure');
      }

      const decoded = accessToken.parse(verified);

      req.user = decoded;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export { Authorization };
