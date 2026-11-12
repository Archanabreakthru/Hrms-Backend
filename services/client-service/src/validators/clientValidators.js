"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrApproveSchema = exports.verifyAttendanceSchema = exports.createDeploymentSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
exports.createClientSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2),
        contactName: zod_1.z.string().optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        contractStart: zod_1.z.string().optional(),
        contractEnd: zod_1.z.string().optional(),
    }),
};
exports.createDeploymentSchema = {
    body: zod_1.z.object({
        clientId: zod_1.z.string().min(1),
        employeeId: zod_1.z.string().min(1),
        supervisorId: zod_1.z.string().optional(),
        project: zod_1.z.string().min(2),
        location: zod_1.z.string().min(2),
        workMode: zod_1.z.string().default('Client Site'),
        startDate: zod_1.z.string().min(1),
        plannedEndDate: zod_1.z.string().min(1),
        allocation: zod_1.z.number().min(1).max(100).default(100),
        allowanceMonthly: zod_1.z.number().min(0).default(0),
    }),
};
exports.verifyAttendanceSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        remarks: zod_1.z.string().optional(),
    }),
};
exports.hrApproveSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        hrComments: zod_1.z.string().optional(),
    }),
};
