"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const authRoutes_1 = require("./routes/authRoutes");
const correlation_1 = require("../../../shared/src/middleware/correlation");
const errorHandler_1 = require("../../../shared/src/middleware/errorHandler");
function createApp(authController) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'UP',
            service: 'auth-service',
            port: 5001,
            timestamp: new Date().toISOString(),
        });
    });
    // Auth routes
    app.use('/api/v1/auth', (0, authRoutes_1.createAuthRouter)(authController));
    // Global error handler
    app.use(errorHandler_1.errorHandler);
    return app;
}
