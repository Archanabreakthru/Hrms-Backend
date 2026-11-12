"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().email('Valid email address is required'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
};
exports.refreshTokenSchema = {
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
};
exports.registerUserSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
        role: zod_1.z.enum([
            'super_admin',
            'managing_director',
            'hr_admin',
            'senior_manager',
            'reporting_manager',
            'employee',
            'client_supervisor',
        ]),
        employeeId: zod_1.z.string().optional(),
        departmentId: zod_1.z.string().optional(),
        clientId: zod_1.z.string().optional(),
    }),
};
