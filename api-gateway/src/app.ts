import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { correlationMiddleware } from '../../shared/src/middleware/correlation';
import { createRateLimiter } from './middleware/rateLimiter';
import { gatewayAuth } from './middleware/gatewayAuth';
import { createGatewayRouter, getServiceRoutes } from './routes/gatewayRouter';
import { gatewayConfig } from './config/env';
import { openapiSpec } from './docs/openapiSpec';

export function createGatewayApp() {
  const app = express();
  app.use(cors({
    origin: (origin, callback) => {
      // Allow localhost on any port (e.g. 3000, 5000 Swagger UI, or direct tool requests)
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === gatewayConfig.corsOrigin) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(correlationMiddleware);

  // Rate Limiting on public/external API requests
  const limiter = createRateLimiter({ windowMs: 60 * 1000, max: 200 });
  app.use(limiter);

  // Specialized Rate Limiter for Activation Endpoint (5 attempts per 15 minutes)
  const activationLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  app.use('/api/v1/auth/activate', activationLimiter);

  // Root Route - Redirect or friendly landing to Swagger docs
  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });

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

  // Centralized Swagger UI and OpenAPI Specification Endpoints
  // In production, access can be restricted by evaluating environment and authorized admin/technical identity
  const isProd = process.env.NODE_ENV === 'production';
  const docsAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isProd) {
      return gatewayAuth(true)(req, res, next);
    }
    return next();
  };

  app.get('/api-docs/openapi.json', docsAuthMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(openapiSpec);
  });

  app.use('/api-docs', docsAuthMiddleware, swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'ORBYX HRMS - API Documentation',
  }));

  // Block external public access to internal-only service routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/auth/provision')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Internal service endpoint' },
      });
    }
    next();
  });

  // Apply gateway authentication middleware (validates JWT, injects claims, strips spoofed headers)
  // Auth endpoints (login, refresh, activate) and documentation/health assets do not require Bearer token
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/auth/login') ||
        req.path.startsWith('/api/v1/auth/refresh') ||
        req.path.startsWith('/api/v1/auth/activate') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/api-docs')) {
      return next();
    }
    return gatewayAuth(true)(req, res, next);
  });

  // Attach microservice reverse proxy routes
  app.use(createGatewayRouter());

  return app;
}
