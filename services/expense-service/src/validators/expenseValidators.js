"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewExpenseSchema = exports.submitExpenseSchema = void 0;
const zod_1 = require("zod");
exports.submitExpenseSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        categoryId: zod_1.z.string().min(1),
        amount: zod_1.z.number().min(1),
        expenseDate: zod_1.z.string().min(1),
        purpose: zod_1.z.string().min(3),
        receiptUrl: zod_1.z.string().optional(),
        isPettyCash: zod_1.z.boolean().default(false),
    }),
};
exports.reviewExpenseSchema = {
    body: zod_1.z.object({
        decision: zod_1.z.enum(['Approved', 'Rejected']),
        remarks: zod_1.z.string().optional(),
    }),
};
