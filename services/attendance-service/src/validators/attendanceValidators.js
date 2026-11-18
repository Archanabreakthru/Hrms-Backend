"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualEntrySchema = exports.cancelLeaveSchema = exports.updateLeaveTypeSchema = exports.createLeaveTypeSchema = exports.createHolidaySchema = exports.createShiftSchema = exports.reviewLeaveSchema = exports.applyLeaveSchema = exports.createShiftScheduleSchema = exports.regularizationReviewSchema = exports.regularizationSchema = exports.punchClockSchema = void 0;
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
        attendanceRecordId: zod_1.z.string().optional(),
        employeeId: zod_1.z.string().min(1),
        targetDate: zod_1.z.string().optional(),
        requestedCheckIn: zod_1.z.string().min(1),
        requestedCheckOut: zod_1.z.string().min(1),
        reason: zod_1.z.string().min(3),
    }),
};
exports.regularizationReviewSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        remarks: zod_1.z.string().optional(),
        stage: zod_1.z.enum(['manager', 'hr']).optional(),
    }),
};
exports.createShiftScheduleSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        shiftId: zod_1.z.string().min(1),
        effectiveFrom: zod_1.z.string().min(1),
        effectiveTo: zod_1.z.string().optional(),
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
exports.createLeaveTypeSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        name: zod_1.z.string().min(2),
        description: zod_1.z.string().optional(),
        isPaid: zod_1.z.boolean().default(true),
        annualQuotaDays: zod_1.z.number().min(0),
        isCarryForward: zod_1.z.boolean().default(false),
        maxCarryForward: zod_1.z.number().min(0).default(0),
        maxConsecutiveDays: zod_1.z.number().int().min(1).default(30),
        allowsHalfDay: zod_1.z.boolean().default(true),
        requiresDoc: zod_1.z.boolean().default(false),
        isEncashable: zod_1.z.boolean().default(false),
        eligibilityCriteria: zod_1.z.string().default('All Active Employees'),
        effectiveDate: zod_1.z.string().optional(),
    }),
};
exports.updateLeaveTypeSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        description: zod_1.z.string().optional(),
        isPaid: zod_1.z.boolean().optional(),
        annualQuotaDays: zod_1.z.number().min(0).optional(),
        isCarryForward: zod_1.z.boolean().optional(),
        maxCarryForward: zod_1.z.number().min(0).optional(),
        maxConsecutiveDays: zod_1.z.number().int().min(1).optional(),
        allowsHalfDay: zod_1.z.boolean().optional(),
        requiresDoc: zod_1.z.boolean().optional(),
        isEncashable: zod_1.z.boolean().optional(),
        eligibilityCriteria: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
};
exports.cancelLeaveSchema = {
    body: zod_1.z.object({
        reason: zod_1.z.string().optional(),
    }),
};
exports.manualEntrySchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        date: zod_1.z.string().min(1), // "YYYY-MM-DD"
        checkInTime: zod_1.z.string().min(1), // ISO
        checkOutTime: zod_1.z.string().min(1), // ISO
        shiftId: zod_1.z.string().default('SHIFT-GEN'),
        workMode: zod_1.z.enum(['Office', 'Client_Site', 'Remote']).default('Office'),
        status: zod_1.z.enum(['Present', 'Late', 'Half_Day', 'Overtime', 'Absent']).default('Present'),
        notes: zod_1.z.string().optional(),
    }),
};
