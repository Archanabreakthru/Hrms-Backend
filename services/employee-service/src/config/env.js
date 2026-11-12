"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5009', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'orbyx-super-secure-jwt-secret-key-32chars',
    jwtIssuer: process.env.JWT_ISSUER || 'orbyx-auth-service',
    jwtAudience: process.env.JWT_AUDIENCE || 'orbyx-hrms-client',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://orbyx_employee_user:emp_secret@localhost:5432/orbyx_employee_db',
    encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 hex chars = 32 bytes
    orgServiceUrl: process.env.ORG_SERVICE_URL || 'http://localhost:5002',
};
