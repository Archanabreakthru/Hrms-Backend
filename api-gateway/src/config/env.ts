import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const gatewayConfig = {
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


