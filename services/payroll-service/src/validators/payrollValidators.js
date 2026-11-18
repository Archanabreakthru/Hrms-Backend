"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSalaryStructureSchema = exports.runPayrollSchema = void 0;
const zod_1 = require("zod");
exports.runPayrollSchema = {
    body: zod_1.z.object({
        month: zod_1.z.number().int().min(1).max(12),
        year: zod_1.z.number().int().min(2020),
    }),
};
exports.createSalaryStructureSchema = {
    body: zod_1.z.object({
        id: zod_1.z.string().optional(),
        name: zod_1.z.string().min(1, 'Structure name is required'),
        description: zod_1.z.string().optional().default(''),
        grossMonthly: zod_1.z.number().positive('Monthly gross salary must be positive'),
        ctcAnnual: zod_1.z.number().optional(),
        items: zod_1.z.array(zod_1.z.any()).optional().default([]),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
};
