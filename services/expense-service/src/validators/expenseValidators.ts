import { z } from 'zod';

export const submitExpenseSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    categoryId: z.string().min(1),
    amount: z.number().min(1),
    expenseDate: z.string().min(1),
    purpose: z.string().min(3),
    receiptUrl: z.string().optional(),
    isPettyCash: z.boolean().default(false),
  }),
};

export const reviewExpenseSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    remarks: z.string().optional(),
  }),
};

