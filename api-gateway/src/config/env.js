"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayConfig = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
dotenv_1.default.config();
exports.gatewayConfig = {
    port: parseInt(process.env.GATEWAY_PORT || process.env.PORT || '5000', 10),
    jwtSecret: process.env.JWT_SECRET || 'supersecret_jwt_key_replace_in_production',
    corsOrigin: process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000',
    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
        organization: process.env.ORG_SERVICE_URL || process.env.ORGANIZATION_SERVICE_URL || 'http://localhost:5002',
        attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:5003',
        payroll: process.env.PAYROLL_SERVICE_URL || 'http://localhost:5004',
        expense: process.env.EXPENSE_SERVICE_URL || 'http://localhost:5005',
        asset: process.env.ASSET_SERVICE_URL || 'http://localhost:5006',
        client: process.env.CLIENT_SERVICE_URL || 'http://localhost:5007',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008',
        employee: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:5009',
    },
};
