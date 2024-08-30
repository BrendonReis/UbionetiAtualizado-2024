import { verify } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import AppError from '../errors/AppError';
import authConfig from '../config/auth';

interface TokenPayload {
  id: string;
  profile: string;
  companyId: number;
}

const isAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  console.log(authHeader);

  if (!authHeader) {
    throw new AppError('ERR_SESSION_EXPIRED', 401);
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    throw new AppError('ERR_SESSION_EXPIRED', 401);
  }

  try {
    const decoded = verify(token, authConfig.secret) as TokenPayload;
    logger.info(`Token decoded successfully: ${JSON.stringify(decoded)}`);

    const { id, profile, companyId } = decoded;
    req.user = { id, profile, companyId };
  } catch (err) {
    logger.error(`Token verification failed: ${err.message}`);
    throw new AppError("Invalid token. We'll try to assign a new one on next request", 403);
  }

  return next();
};

export default isAuth;
