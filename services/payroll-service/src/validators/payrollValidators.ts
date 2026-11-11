import { z } from 'zod';

export const runPayrollSchema = {
  body: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020),
  }),
};

export const updateSalaryStructureSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    effectiveFrom: z.string().min(1),
    grossSalaryMonthly: z.number().min(0),
    baseSalaryAnnual: z.number().min(0),
    items: z.array(
      z.object({
        code: z.string(),
        amountMonthly: z.number().min(0),
        type: z.enum(['Earning', 'Deduction', 'Employer_Contribution']),
      })
    ),
  }),
};

