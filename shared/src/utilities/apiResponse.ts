import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  correlationId?: string;
}

export function apiSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse['meta'],
  correlationId?: string
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
    correlationId: correlationId || (res.locals?.correlationId as string),
  };
  return res.status(statusCode).json(body);
}

export function apiError(
  res: Response,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  message = 'An unexpected error occurred',
  details?: any,
  correlationId?: string
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    correlationId: correlationId || (res.locals?.correlationId as string),
  };
  return res.status(statusCode).json(body);
}

