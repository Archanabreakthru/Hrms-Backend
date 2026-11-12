"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayConfig = void 0;
exports.gatewayConfig = {
    port: parseInt(process.env.GATEWAY_PORT || '5000', 10),
    jwtSecret: process.env.JWT_SECRET || 'orbyx_super_secret_jwt_key_2026_dev_mode_only',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
        organization: process.env.ORG_SERVICE_URL || 'http://localhost:5002',
        attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:5003',
        payroll: process.env.PAYROLL_SERVICE_URL || 'http://localhost:5004',
        expense: process.env.EXPENSE_SERVICE_URL || 'http://localhost:5005',
        asset: process.env.ASSET_SERVICE_URL || 'http://localhost:5006',
        client: process.env.CLIENT_SERVICE_URL || 'http://localhost:5007',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008',
        employee: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:5009',
    },
};
