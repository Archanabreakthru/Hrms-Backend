import { z } from 'zod';

export const runPayrollSchema = {
  body: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020),
  }),
};

export const createSalaryStructureSchema = {
  body: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Structure name is required'),
    description: z.string().optional().default(''),
    grossMonthly: z.number().positive('Monthly gross salary must be positive'),
    ctcAnnual: z.number().optional(),
    items: z.array(z.any()).optional().default([]),
    isActive: z.boolean().optional().default(true),
  }),
};

