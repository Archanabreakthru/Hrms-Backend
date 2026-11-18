import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '../generated/client';
import { prisma } from '../lib/prisma';
import { UnauthorizedError, ForbiddenError } from '../../../../shared/src/errors/AppError';
import { config } from '../config/env';

/**
 * Validates HMAC service-to-service requests.
 * Canonical string format:
 *   METHOD\nPATH\nTIMESTAMP\nNONCE\nIDEMPOTENCY_KEY\nSHA256(BODY)
 */
export function verifyServiceAuth(expectedServiceName?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serviceName = req.headers['x-service-name'] as string;
      const timestamp = req.headers['x-service-timestamp'] as string;
      const nonce = req.headers['x-service-nonce'] as string;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || '';
      const signature = req.headers['x-service-signature'] as string;

      if (!serviceName || !timestamp || !nonce || !signature) {
        throw new UnauthorizedError('Missing required service authentication headers');
      }

      if (expectedServiceName && serviceName !== expectedServiceName) {
        throw new ForbiddenError(`Forbidden: Expected call from service '${expectedServiceName}', got '${serviceName}'`);
      }

      // 1. Time-window check: Enforce 5-minute maximum drift
      const requestTime = new Date(timestamp).getTime();
      const now = Date.now();
      if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
        throw new UnauthorizedError('Request timestamp out of bounds (maximum 5-minute drift allowed)');
      }

      // 2. Anti-Replay: Check and store nonce in database atomically
      const existingNonce = await prisma.serviceNonces.findUnique({
        where: { nonce },
      });
      if (existingNonce) {
        throw new UnauthorizedError('Replay detected: Service nonce has already been consumed');
      }

      await prisma.serviceNonces.create({
        data: {
          nonce,
          serviceName,
        },
      });

      // 3. Compute request body SHA-256 hash
      const bodyString = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
      const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');

      // 4. Construct canonical string
      const method = req.method.toUpperCase();
      const path = req.originalUrl.split('?')[0];
      const canonicalString = `${method}\n${path}\n${timestamp}\n${nonce}\n${idempotencyKey}\n${bodyHash}`;

      // 5. Verify HMAC-SHA256 signature
      const secret = process.env.INTERNAL_SERVICE_SECRET || config.jwtSecret;
      const expectedSignature = crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
        throw new UnauthorizedError('Invalid service authentication signature');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

