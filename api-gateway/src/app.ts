import express from 'express';
import cors from 'cors';
import { correlationMiddleware } from '../../shared/src/middleware/correlation';
import { createRateLimiter } from './middleware/rateLimiter';
import { gatewayAuth } from './middleware/gatewayAuth';
import { createGatewayRouter, getServiceRoutes } from './routes/gatewayRouter';
import { gatewayConfig } from './config/env';

export function createGatewayApp() {
  const app = express();
  app.use(cors({ origin: gatewayConfig.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(correlationMiddleware);

  // Rate Limiting on public/external API requests
  const limiter = createRateLimiter({ windowMs: 60 * 1000, max: 200 });
  app.use(limiter);

  // Global Health Aggregator
  app.get('/health', async (req, res) => {
    const checks: Record<string, string> = { gateway: 'UP' };
    res.status(200).json({
      status: 'UP',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      routes: getServiceRoutes().map((r) => r.prefix),
      services: checks,
    });
  });

  // Apply gateway authentication middleware (validates JWT, injects claims, strips spoofed headers)
  // Auth endpoints (login, refresh, register) do not require Bearer token
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/auth/login') ||
        req.path.startsWith('/api/v1/auth/refresh') ||
        req.path.startsWith('/health')) {
      return next();
    }
    return gatewayAuth(true)(req, res, next);
  });

  // Attach microservice reverse proxy routes
  app.use(createGatewayRouter());

  return app;
}
