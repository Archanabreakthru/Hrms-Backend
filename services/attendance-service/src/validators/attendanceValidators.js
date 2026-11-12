"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHolidaySchema = exports.createShiftSchema = exports.reviewLeaveSchema = exports.applyLeaveSchema = exports.regularizationReviewSchema = exports.regularizationSchema = exports.punchClockSchema = void 0;
const zod_1 = require("zod");
exports.punchClockSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        date: zod_1.z.string().min(1), // "YYYY-MM-DD"
        punchType: zod_1.z.enum(['IN', 'OUT']),
        timestamp: zod_1.z.string().min(1), // ISO
        workMode: zod_1.z.enum(['Office', 'Client_Site', 'Remote']).default('Office'),
        shiftId: zod_1.z.string().default('SHIFT-GEN'),
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional(),
        photoUrl: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
};
exports.regularizationSchema = {
    body: zod_1.z.object({
        attendanceRecordId: zod_1.z.string().min(1),
        employeeId: zod_1.z.string().min(1),
        requestedCheckIn: zod_1.z.string().min(1),
        requestedCheckOut: zod_1.z.string().min(1),
        reason: zod_1.z.string().min(3),
    }),
};
exports.regularizationReviewSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        remarks: zod_1.z.string().optional(),
    }),
};
exports.applyLeaveSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        leaveTypeId: zod_1.z.string().min(1),
        startDate: zod_1.z.string().min(1), // "YYYY-MM-DD"
        endDate: zod_1.z.string().min(1), // "YYYY-MM-DD"
        isHalfDay: zod_1.z.boolean().default(false),
        halfDaySession: zod_1.z.enum(['First', 'Second']).optional(),
        reason: zod_1.z.string().min(3),
    }),
};
exports.reviewLeaveSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        rejectionReason: zod_1.z.string().optional(),
    }),
};
exports.createShiftSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        name: zod_1.z.string().min(2),
        startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
        endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
        gracePeriodMins: zod_1.z.number().int().min(0).default(15),
        halfDayThreshold: zod_1.z.number().min(1).default(4.5),
        fullDayThreshold: zod_1.z.number().min(1).default(8.0),
        isOvernight: zod_1.z.boolean().default(false),
        weeklyOffDays: zod_1.z.array(zod_1.z.number().int().min(0).max(6)).default([0, 6]),
    }),
};
exports.createHolidaySchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2),
        date: zod_1.z.string().min(1), // "YYYY-MM-DD"
        branchId: zod_1.z.string().optional(),
        isOptional: zod_1.z.boolean().default(false),
        year: zod_1.z.number().int().min(2020),
        description: zod_1.z.string().optional(),
    }),
};
