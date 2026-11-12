"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const correlation_1 = require("../../../shared/src/middleware/correlation");
const errorHandler_1 = require("../../../shared/src/middleware/errorHandler");
const notificationRepository_1 = require("./repositories/notificationRepository");
const notificationService_1 = require("./services/notificationService");
const notificationController_1 = require("./controllers/notificationController");
const notificationRoutes_1 = require("./routes/notificationRoutes");
function createApp(customRepo) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(correlation_1.correlationMiddleware);
    const repo = customRepo || new notificationRepository_1.InMemoryNotificationRepository();
    const service = new notificationService_1.NotificationService(repo);
    const controller = new notificationController_1.NotificationController(service);
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'UP', service: 'notification-service' });
    });
    app.use('/api/v1/notifications', (0, notificationRoutes_1.createNotificationRouter)(controller));
    app.use('/api/v1/audit', (0, notificationRoutes_1.createAuditRouter)(controller));
    app.use(errorHandler_1.errorHandler);
    return { app, service, repo };
}
