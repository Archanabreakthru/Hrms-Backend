"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSalaryStructureSchema = exports.runPayrollSchema = void 0;
const zod_1 = require("zod");
exports.runPayrollSchema = {
    body: zod_1.z.object({
        month: zod_1.z.number().int().min(1).max(12),
        year: zod_1.z.number().int().min(2020),
    }),
};
exports.updateSalaryStructureSchema = {
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1),
        effectiveFrom: zod_1.z.string().min(1),
        grossSalaryMonthly: zod_1.z.number().min(0),
        baseSalaryAnnual: zod_1.z.number().min(0),
        items: zod_1.z.array(zod_1.z.object({
            code: zod_1.z.string(),
            amountMonthly: zod_1.z.number().min(0),
            type: zod_1.z.enum(['Earning', 'Deduction', 'Employer_Contribution']),
        })),
    }),
};
