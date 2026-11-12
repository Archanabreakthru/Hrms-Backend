"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const clientRoutes_1 = require("./routes/clientRoutes");
const correlation_1 = require("../../../shared/src/middleware/correlation");
const errorHandler_1 = require("../../../shared/src/middleware/errorHandler");
function createApp(controller) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'UP',
            service: 'client-service',
            port: 5007,
            timestamp: new Date().toISOString(),
        });
    });
    // Client routes
    app.use('/api/v1/clients', (0, clientRoutes_1.createClientRouter)(controller));
    // Global error handler
    app.use(errorHandler_1.errorHandler);
    return app;
}
