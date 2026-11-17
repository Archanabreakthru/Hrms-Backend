"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendInviteSchema = exports.activateAccountSchema = exports.provisionUserSchema = exports.registerUserSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
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
exports.provisionUserSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
        email: zod_1.z.string().email('Valid official email address is required'),
        firstName: zod_1.z.string().min(1, 'First name is required'),
        lastName: zod_1.z.string().min(1, 'Last name is required'),
        roleCode: zod_1.z.string().default('employee'),
        departmentId: zod_1.z.string().optional().nullable(),
        clientId: zod_1.z.string().optional().nullable(),
    }),
};
exports.activateAccountSchema = {
    body: zod_1.z.object({
        token: zod_1.z.string().min(16, 'Valid activation token is required'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number'),
    }),
};
exports.resendInviteSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
    }),
};
