"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrApproveSchema = exports.verifyAttendanceSchema = exports.updateDeploymentSchema = exports.createDeploymentSchema = exports.updateSupervisorSchema = exports.createSupervisorSchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
exports.createClientSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Client name must be at least 2 characters'),
        contactName: zod_1.z.string().optional(),
        email: zod_1.z.string().email('Invalid email address').optional().or(zod_1.z.literal('')),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        contractStart: zod_1.z.string().optional(),
        contractEnd: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Inactive', 'Prospect']).default('Active'),
    }),
};
exports.updateClientSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        contactName: zod_1.z.string().optional(),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        contractStart: zod_1.z.string().optional(),
        contractEnd: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Inactive', 'Prospect']).optional(),
    }),
};
exports.createSupervisorSchema = {
    body: zod_1.z.object({
        clientId: zod_1.z.string().min(1, 'Client ID is required'),
        fullName: zod_1.z.string().min(2, 'Supervisor name must be at least 2 characters'),
        email: zod_1.z.string().email('Valid supervisor email is required'),
        phone: zod_1.z.string().optional(),
        designation: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Invited', 'Suspended']).default('Active'),
        userId: zod_1.z.string().optional(),
    }),
};
exports.updateSupervisorSchema = {
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(2).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        designation: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Invited', 'Suspended']).optional(),
        userId: zod_1.z.string().optional(),
    }),
};
exports.createDeploymentSchema = {
    body: zod_1.z.object({
        clientId: zod_1.z.string().min(1, 'Client ID is required'),
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
        supervisorId: zod_1.z.string().optional(),
        project: zod_1.z.string().min(2, 'Project name is required'),
        location: zod_1.z.string().min(2, 'Work location is required'),
        workMode: zod_1.z.string().default('Client Site'),
        startDate: zod_1.z.string().min(1, 'Start date is required'),
        plannedEndDate: zod_1.z.string().min(1, 'Planned end date is required'),
        allocation: zod_1.z.number().min(1).max(100).default(100),
        allowanceMonthly: zod_1.z.number().min(0).default(0),
        status: zod_1.z.enum(['Active', 'Completed', 'Terminated', 'On_Hold']).default('Active'),
    }),
};
exports.updateDeploymentSchema = {
    body: zod_1.z.object({
        supervisorId: zod_1.z.string().optional(),
        project: zod_1.z.string().min(2).optional(),
        location: zod_1.z.string().optional(),
        workMode: zod_1.z.string().optional(),
        plannedEndDate: zod_1.z.string().optional(),
        actualEndDate: zod_1.z.string().optional(),
        allocation: zod_1.z.number().min(1).max(100).optional(),
        allowanceMonthly: zod_1.z.number().min(0).optional(),
        status: zod_1.z.enum(['Active', 'Completed', 'Terminated', 'On_Hold']).optional(),
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
