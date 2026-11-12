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
    app.use((0, cors_1.default)({ origin: env_1.gatewayConfig.corsOrigin, credentials: true }));
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    // Rate Limiting on public/external API requests
    const limiter = (0, rateLimiter_1.createRateLimiter)({ windowMs: 60 * 1000, max: 200 });
    app.use(limiter);
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
    // Apply gateway authentication middleware (validates JWT, injects claims, strips spoofed headers)
    // Auth endpoints (login, refresh) and documentation/health assets do not require Bearer token in development
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/v1/auth/login') ||
            req.path.startsWith('/api/v1/auth/refresh') ||
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
