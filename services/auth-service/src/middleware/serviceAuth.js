"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyServiceAuth = verifyServiceAuth;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../../../../shared/src/errors/AppError");
const env_1 = require("../config/env");
/**
 * Validates HMAC service-to-service requests.
 * Canonical string format:
 *   METHOD\nPATH\nTIMESTAMP\nNONCE\nIDEMPOTENCY_KEY\nSHA256(BODY)
 */
function verifyServiceAuth(expectedServiceName) {
    return async (req, res, next) => {
        try {
            const serviceName = req.headers['x-service-name'];
            const timestamp = req.headers['x-service-timestamp'];
            const nonce = req.headers['x-service-nonce'];
            const idempotencyKey = req.headers['x-idempotency-key'] || '';
            const signature = req.headers['x-service-signature'];
            if (!serviceName || !timestamp || !nonce || !signature) {
                throw new AppError_1.UnauthorizedError('Missing required service authentication headers');
            }
            if (expectedServiceName && serviceName !== expectedServiceName) {
                throw new AppError_1.ForbiddenError(`Forbidden: Expected call from service '${expectedServiceName}', got '${serviceName}'`);
            }
            // 1. Time-window check: Enforce 5-minute maximum drift
            const requestTime = new Date(timestamp).getTime();
            const now = Date.now();
            if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
                throw new AppError_1.UnauthorizedError('Request timestamp out of bounds (maximum 5-minute drift allowed)');
            }
            // 2. Anti-Replay: Check and store nonce in database atomically
            const existingNonce = await prisma_1.prisma.serviceNonces.findUnique({
                where: { nonce },
            });
            if (existingNonce) {
                throw new AppError_1.UnauthorizedError('Replay detected: Service nonce has already been consumed');
            }
            await prisma_1.prisma.serviceNonces.create({
                data: {
                    nonce,
                    serviceName,
                },
            });
            // 3. Compute request body SHA-256 hash
            const bodyString = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
            const bodyHash = crypto_1.default.createHash('sha256').update(bodyString).digest('hex');
            // 4. Construct canonical string
            const method = req.method.toUpperCase();
            const path = req.originalUrl.split('?')[0];
            const canonicalString = `${method}\n${path}\n${timestamp}\n${nonce}\n${idempotencyKey}\n${bodyHash}`;
            // 5. Verify HMAC-SHA256 signature
            const secret = process.env.INTERNAL_SERVICE_SECRET || env_1.config.jwtSecret;
            const expectedSignature = crypto_1.default.createHmac('sha256', secret).update(canonicalString).digest('hex');
            const sigBuffer = Buffer.from(signature, 'hex');
            const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');
            if (sigBuffer.length !== expectedSigBuffer.length || !crypto_1.default.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
                throw new AppError_1.UnauthorizedError('Invalid service authentication signature');
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
