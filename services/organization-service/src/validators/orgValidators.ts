import { z } from 'zod';

export const updateCompanyProfileSchema = {
  body: z.object({
    legalName: z.string().min(2),
    tradingName: z.string().min(2),
    cinNumber: z.string().optional(),
    panNumber: z.string().optional(),
    tanNumber: z.string().optional(),
    gstin: z.string().optional(),
    iecNumber: z.string().optional(),
    pfRegistrationNumber: z.string().optional(),
    esiRegistrationNumber: z.string().optional(),
    registeredAddress: z.string().min(5),
    headquartersAddress: z.string().min(5),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(8),
    website: z.string().optional(),
    incorporatedDate: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    currency: z.string().optional(),
    currencySymbol: z.string().optional(),
    workingDaysPerWeek: z.number().int().min(1).max(7).optional(),
    standardHoursPerDay: z.number().optional(),
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

export const updateBranchSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    isHeadquarters: z.boolean().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
};

export const toggleStatusSchema = {
  body: z.object({
    isActive: z.boolean(),
  }),
};

export const createDepartmentSchema = {
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2),
    branchId: z.string().optional(),
    parentDeptId: z.string().optional(),
    headEmployeeId: z.string().optional(),
    description: z.string().optional(),
  }),
};

export const updateDepartmentSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    branchId: z.string().optional(),
    parentDeptId: z.string().optional(),
    headEmployeeId: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
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

export const updateDesignationSchema = {
  body: z.object({
    title: z.string().min(2).optional(),
    departmentId: z.string().optional(),
    level: z.number().int().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
};

export const updateStatutoryConfigSchema = {
  body: z.object({
    epfApplicable: z.boolean().optional(),
    epfEmployeeRatePercent: z.number().min(0).max(100).optional(),
    epfEmployerRatePercent: z.number().min(0).max(100).optional(),
    epfWageCeilingMonthly: z.number().min(0).optional(),
    epfRestrictToWageCeiling: z.boolean().optional(),
    epfEffectiveFrom: z.string().optional(),
    epfExemptionReason: z.string().optional(),
    esiApplicable: z.boolean().optional(),
    esiGrossThresholdMonthly: z.number().min(0).optional(),
    esiEmployeeRatePercent: z.number().min(0).max(100).optional(),
    esiEmployerRatePercent: z.number().min(0).max(100).optional(),
    esiEffectiveFrom: z.string().optional(),
    esiExemptionReason: z.string().optional(),
    ptApplicable: z.boolean().optional(),
    ptStateJurisdiction: z.string().optional(),
    ptMonthlySlabAmount: z.number().min(0).optional(),
    ptMinGrossThreshold: z.number().min(0).optional(),
    ptEffectiveFrom: z.string().optional(),
    tdsApplicable: z.boolean().optional(),
    tdsFinancialYear: z.string().optional(),
    tdsDefaultRegime: z.string().optional(),
    tdsEffectiveFrom: z.string().optional(),
  }),
};

