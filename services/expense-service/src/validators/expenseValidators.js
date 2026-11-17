"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleAdvanceSchema = exports.disburseAdvanceSchema = exports.reviewAdvanceSchema = exports.createAdvanceSchema = exports.reimburseExpenseSchema = exports.reviewExpenseSchema = exports.submitExpenseSchema = void 0;
const zod_1 = require("zod");
exports.submitExpenseSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
        categoryId: zod_1.z.string().uuid('Category ID must be a valid UUID'),
        amount: zod_1.z.number().positive('Amount must be greater than 0'),
        currency: zod_1.z.string().default('INR'),
        expenseDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD'),
        purpose: zod_1.z.string().min(3, 'Purpose must be at least 3 characters'),
        receiptUrl: zod_1.z.string().optional().nullable(),
        receiptFileName: zod_1.z.string().optional().nullable(),
        isPettyCash: zod_1.z.boolean().default(false),
    }),
};
exports.reviewExpenseSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        remarks: zod_1.z.string().optional(),
    }).refine((data) => {
        if (data.decision === 'Rejected' && (!data.remarks || data.remarks.trim().length === 0)) {
            return false;
        }
        return true;
    }, {
        message: 'Remarks are mandatory when rejecting an expense claim',
        path: ['remarks'],
    }),
};
exports.reimburseExpenseSchema = {
    body: zod_1.z.object({
        reimbursementReference: zod_1.z.string().min(3, 'Payment/UTR reference is required (min 3 chars)'),
        remarks: zod_1.z.string().optional(),
    }),
};
exports.createAdvanceSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
        advanceType: zod_1.z.enum(['Salary Advance', 'Travel Petty Cash']),
        amount: zod_1.z.number().positive('Advance amount must be greater than 0'),
        purpose: zod_1.z.string().min(5, 'Purpose must be at least 5 characters'),
        requestDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be YYYY-MM-DD'),
    }),
};
exports.reviewAdvanceSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        approvedAmount: zod_1.z.number().positive('Approved amount must be positive').optional(),
        remarks: zod_1.z.string().optional(),
    }).refine((data) => {
        if (data.decision === 'Rejected' && (!data.remarks || data.remarks.trim().length === 0)) {
            return false;
        }
        return true;
    }, {
        message: 'Remarks are mandatory when rejecting an advance request',
        path: ['remarks'],
    }),
};
exports.disburseAdvanceSchema = {
    body: zod_1.z.object({
        paymentReference: zod_1.z.string().min(3, 'Payment/disbursement reference is required (min 3 chars)'),
    }),
};
exports.settleAdvanceSchema = {
    body: zod_1.z.object({
        actualExpense: zod_1.z.number().nonnegative('Actual expense must be non-negative'),
        settlementNote: zod_1.z.string().min(3, 'Settlement note is required (min 3 chars)'),
    }),
};
