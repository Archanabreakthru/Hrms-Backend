import { z } from 'zod';

export const updateCompanyProfileSchema = {
  body: z.object({
    legalName: z.string().min(2),
    tradingName: z.string().min(2),
    cinNumber: z.string().optional(),
    panNumber: z.string().optional(),
    tanNumber: z.string().optional(),
    gstin: z.string().optional(),
    pfRegistrationNumber: z.string().optional(),
    esiRegistrationNumber: z.string().optional(),
    registeredAddress: z.string().min(5),
    headquartersAddress: z.string().min(5),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(8),
    website: z.string().url().optional(),
  }),
};

export const createBranchSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().default('India'),
    address: z.string().min(5),
    isHeadquarters: z.boolean().default(false),
  }),
};

export const createDepartmentSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2),
    branchId: z.string().optional(),
    parentDeptId: z.string().optional(),
    headEmployeeId: z.string().optional(),
  }),
};

export const createDesignationSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    title: z.string().min(2),
    departmentId: z.string().optional(),
    level: z.number().int().min(1).default(1),
    description: z.string().optional(),
  }),
};

