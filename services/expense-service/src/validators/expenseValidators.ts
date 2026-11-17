import { z } from 'zod';

export const submitExpenseSchema = {
  body: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    categoryId: z.string().uuid('Category ID must be a valid UUID'),
    amount: z.number().positive('Amount must be greater than 0'),
    currency: z.string().default('INR'),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD'),
    purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
    receiptUrl: z.string().optional().nullable(),
    receiptFileName: z.string().optional().nullable(),
    isPettyCash: z.boolean().default(false),
  }),
};

export const reviewExpenseSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    remarks: z.string().optional(),
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

export const reimburseExpenseSchema = {
  body: z.object({
    reimbursementReference: z.string().min(3, 'Payment/UTR reference is required (min 3 chars)'),
    remarks: z.string().optional(),
  }),
};

export const createAdvanceSchema = {
  body: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    advanceType: z.enum(['Salary Advance', 'Travel Petty Cash']),
    amount: z.number().positive('Advance amount must be greater than 0'),
    purpose: z.string().min(5, 'Purpose must be at least 5 characters'),
    requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be YYYY-MM-DD'),
  }),
};

export const reviewAdvanceSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    approvedAmount: z.number().positive('Approved amount must be positive').optional(),
    remarks: z.string().optional(),
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

export const disburseAdvanceSchema = {
  body: z.object({
    paymentReference: z.string().min(3, 'Payment/disbursement reference is required (min 3 chars)'),
  }),
};

export const settleAdvanceSchema = {
  body: z.object({
    actualExpense: z.number().nonnegative('Actual expense must be non-negative'),
    settlementNote: z.string().min(3, 'Settlement note is required (min 3 chars)'),
  }),
};
