"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGatewayApp = createGatewayApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const correlation_1 = require("../../shared/src/middleware/correlation");
const rateLimiter_1 = require("./middleware/rateLimiter");
const gatewayAuth_1 = require("./middleware/gatewayAuth");
const gatewayRouter_1 = require("./routes/gatewayRouter");
const env_1 = require("./config/env");
const openapiSpec_1 = require("./docs/openapiSpec");
function createGatewayApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow localhost on any port (e.g. 3000, 5000 Swagger UI, or direct tool requests)
            if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === env_1.gatewayConfig.corsOrigin) {
                callback(null, true);
            }
            else {
                callback(null, true);
            }
        },
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    // Rate Limiting on public/external API requests
    const limiter = (0, rateLimiter_1.createRateLimiter)({ windowMs: 60 * 1000, max: 200 });
    app.use(limiter);
    // Specialized Rate Limiter for Activation Endpoint (5 attempts per 15 minutes)
    const activationLimiter = (0, rateLimiter_1.createRateLimiter)({ windowMs: 15 * 60 * 1000, max: 5 });
    app.use('/api/v1/auth/activate', activationLimiter);
    // Root Route - Redirect or friendly landing to Swagger docs
    app.get('/', (req, res) => {
        res.redirect('/api-docs');
    });
    // Global Health Aggregator
    app.get('/health', async (req, res) => {
        const checks = { gateway: 'UP' };
        res.status(200).json({
            status: 'UP',
            gateway: 'api-gateway',
            timestamp: new Date().toISOString(),
            routes: (0, gatewayRouter_1.getServiceRoutes)().map((r) => r.prefix),
            services: checks,
        });
    });
    // Centralized Swagger UI and OpenAPI Specification Endpoints
    // In production, access can be restricted by evaluating environment and authorized admin/technical identity
    const isProd = process.env.NODE_ENV === 'production';
    const docsAuthMiddleware = (req, res, next) => {
        if (isProd) {
            return (0, gatewayAuth_1.gatewayAuth)(true)(req, res, next);
        }
        return next();
    };
    app.get('/api-docs/openapi.json', docsAuthMiddleware, (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(openapiSpec_1.openapiSpec);
    });
    app.use('/api-docs', docsAuthMiddleware, swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapiSpec_1.openapiSpec, {
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
        return (0, gatewayAuth_1.gatewayAuth)(true)(req, res, next);
    });
    // Attach microservice reverse proxy routes
    app.use((0, gatewayRouter_1.createGatewayRouter)());
    return app;
}
