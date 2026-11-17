import { z } from 'zod';

export const punchClockSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    date: z.string().min(1), // "YYYY-MM-DD"
    punchType: z.enum(['IN', 'OUT']),
    timestamp: z.string().min(1), // ISO
    workMode: z.enum(['Office', 'Client_Site', 'Remote']).default('Office'),
    shiftId: z.string().default('SHIFT-GEN'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    photoUrl: z.string().optional(),
    notes: z.string().optional(),
  }),
};

export const regularizationSchema = {
  body: z.object({
    attendanceRecordId: z.string().optional(),
    employeeId: z.string().min(1),
    targetDate: z.string().optional(),
    requestedCheckIn: z.string().min(1),
    requestedCheckOut: z.string().min(1),
    reason: z.string().min(3),
  }),
};

export const regularizationReviewSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    remarks: z.string().optional(),
    stage: z.enum(['manager', 'hr']).optional(),
  }),
};

export const createShiftScheduleSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    shiftId: z.string().min(1),
    effectiveFrom: z.string().min(1),
    effectiveTo: z.string().optional(),
  }),
};

export const applyLeaveSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    leaveTypeId: z.string().min(1),
    startDate: z.string().min(1), // "YYYY-MM-DD"
    endDate: z.string().min(1),   // "YYYY-MM-DD"
    isHalfDay: z.boolean().default(false),
    halfDaySession: z.enum(['First', 'Second']).optional(),
    reason: z.string().min(3),
  }),
};

export const reviewLeaveSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    rejectionReason: z.string().optional(),
  }),
};

export const createShiftSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
    gracePeriodMins: z.number().int().min(0).default(15),
    halfDayThreshold: z.number().min(1).default(4.5),
    fullDayThreshold: z.number().min(1).default(8.0),
    isOvernight: z.boolean().default(false),
    weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
  }),
};

export const createHolidaySchema = {
  body: z.object({
    name: z.string().min(2),
    date: z.string().min(1), // "YYYY-MM-DD"
    branchId: z.string().optional(),
    isOptional: z.boolean().default(false),
    year: z.number().int().min(2020),
    description: z.string().optional(),
  }),
};

export const createLeaveTypeSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2),
    description: z.string().optional(),
    isPaid: z.boolean().default(true),
    annualQuotaDays: z.number().min(0),
    isCarryForward: z.boolean().default(false),
    maxCarryForward: z.number().min(0).default(0),
    maxConsecutiveDays: z.number().int().min(1).default(30),
    allowsHalfDay: z.boolean().default(true),
    requiresDoc: z.boolean().default(false),
    isEncashable: z.boolean().default(false),
    eligibilityCriteria: z.string().default('All Active Employees'),
    effectiveDate: z.string().optional(),
  }),
};

export const updateLeaveTypeSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    isPaid: z.boolean().optional(),
    annualQuotaDays: z.number().min(0).optional(),
    isCarryForward: z.boolean().optional(),
    maxCarryForward: z.number().min(0).optional(),
    maxConsecutiveDays: z.number().int().min(1).optional(),
    allowsHalfDay: z.boolean().optional(),
    requiresDoc: z.boolean().optional(),
    isEncashable: z.boolean().optional(),
    eligibilityCriteria: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const cancelLeaveSchema = {
  body: z.object({
    reason: z.string().optional(),
  }),
};

export const manualEntrySchema = {
  body: z.object({
    employeeId: z.string().min(1),
    date: z.string().min(1), // "YYYY-MM-DD"
    checkInTime: z.string().min(1), // ISO
    checkOutTime: z.string().min(1), // ISO
    shiftId: z.string().default('SHIFT-GEN'),
    workMode: z.enum(['Office', 'Client_Site', 'Remote']).default('Office'),
    status: z.enum(['Present', 'Late', 'Half_Day', 'Overtime', 'Absent']).default('Present'),
    notes: z.string().optional(),
  }),
};


