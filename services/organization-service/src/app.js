"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const orgRoutes_1 = require("./routes/orgRoutes");
const correlation_1 = require("../../../shared/src/middleware/correlation");
const errorHandler_1 = require("../../../shared/src/middleware/errorHandler");
function createApp(orgController) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'UP',
            service: 'organization-service',
            port: 5002,
            timestamp: new Date().toISOString(),
        });
    });
    // Org routes
    app.use('/api/v1/org', (0, orgRoutes_1.createOrgRouter)(orgController));
    // Global error handler
    app.use(errorHandler_1.errorHandler);
    return app;
}
