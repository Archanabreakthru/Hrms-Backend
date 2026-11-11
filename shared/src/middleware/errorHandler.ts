import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { apiError } from '../utilities/apiResponse';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = res.locals?.correlationId;

  if (err instanceof AppError) {
    apiError(res, err.statusCode, err.code, err.message, err.details, correlationId);
    return;
  }

  // Unhandled internal server error
  console.error(`[UnhandledError] [${correlationId}]`, err);
  apiError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message,
    undefined,
    correlationId
  );
}

