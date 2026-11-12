"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const expenseRoutes_1 = require("./routes/expenseRoutes");
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
            service: 'expense-service',
            port: 5005,
            timestamp: new Date().toISOString(),
        });
    });
    // Expense routes
    app.use('/api/v1/expenses', (0, expenseRoutes_1.createExpenseRouter)(controller));
    // Global error handler
    app.use(errorHandler_1.errorHandler);
    return app;
}
