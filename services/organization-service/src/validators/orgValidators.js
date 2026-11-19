"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatutoryConfigSchema = exports.updateDesignationSchema = exports.createDesignationSchema = exports.updateDepartmentSchema = exports.createDepartmentSchema = exports.toggleStatusSchema = exports.updateBranchSchema = exports.createBranchSchema = exports.updateCompanyProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateCompanyProfileSchema = {
    body: zod_1.z.object({
        legalName: zod_1.z.string().min(2),
        tradingName: zod_1.z.string().min(2),
        cinNumber: zod_1.z.string().optional(),
        panNumber: zod_1.z.string().optional(),
        tanNumber: zod_1.z.string().optional(),
        gstin: zod_1.z.string().optional(),
        iecNumber: zod_1.z.string().optional(),
        pfRegistrationNumber: zod_1.z.string().optional(),
        esiRegistrationNumber: zod_1.z.string().optional(),
        registeredAddress: zod_1.z.string().min(5),
        headquartersAddress: zod_1.z.string().min(5),
        contactEmail: zod_1.z.string().email(),
        contactPhone: zod_1.z.string().min(8),
        website: zod_1.z.string().optional(),
        incorporatedDate: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        zipCode: zod_1.z.string().optional(),
        currency: zod_1.z.string().optional(),
        currencySymbol: zod_1.z.string().optional(),
        workingDaysPerWeek: zod_1.z.number().int().min(1).max(7).optional(),
        standardHoursPerDay: zod_1.z.number().optional(),
    }),
};
exports.createBranchSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        name: zod_1.z.string().min(2),
        city: zod_1.z.string().min(2),
        state: zod_1.z.string().min(2),
        country: zod_1.z.string().default('India'),
        address: zod_1.z.string().min(5),
        isHeadquarters: zod_1.z.boolean().default(false),
    }),
};
exports.updateBranchSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        city: zod_1.z.string().min(2).optional(),
        state: zod_1.z.string().min(2).optional(),
        country: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        isHeadquarters: zod_1.z.boolean().optional(),
        status: zod_1.z.enum(['Active', 'Inactive']).optional(),
    }),
};
exports.toggleStatusSchema = {
    body: zod_1.z.object({
        isActive: zod_1.z.boolean(),
    }),
};
exports.createDepartmentSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        name: zod_1.z.string().min(2),
        branchId: zod_1.z.string().optional(),
        parentDeptId: zod_1.z.string().optional(),
        headEmployeeId: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    }),
};
exports.updateDepartmentSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        branchId: zod_1.z.string().optional(),
        parentDeptId: zod_1.z.string().optional(),
        headEmployeeId: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Inactive']).optional(),
    }),
};
exports.createDesignationSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        title: zod_1.z.string().min(2),
        departmentId: zod_1.z.string().optional(),
        level: zod_1.z.number().int().min(1).default(1),
        description: zod_1.z.string().optional(),
    }),
};
exports.updateDesignationSchema = {
    body: zod_1.z.object({
        title: zod_1.z.string().min(2).optional(),
        departmentId: zod_1.z.string().optional(),
        level: zod_1.z.number().int().min(1).optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Active', 'Inactive']).optional(),
    }),
};
exports.updateStatutoryConfigSchema = {
    body: zod_1.z.object({
        epfApplicable: zod_1.z.boolean().optional(),
        epfEmployeeRatePercent: zod_1.z.number().min(0).max(100).optional(),
        epfEmployerRatePercent: zod_1.z.number().min(0).max(100).optional(),
        epfWageCeilingMonthly: zod_1.z.number().min(0).optional(),
        epfRestrictToWageCeiling: zod_1.z.boolean().optional(),
        epfEffectiveFrom: zod_1.z.string().optional(),
        epfExemptionReason: zod_1.z.string().optional(),
        esiApplicable: zod_1.z.boolean().optional(),
        esiGrossThresholdMonthly: zod_1.z.number().min(0).optional(),
        esiEmployeeRatePercent: zod_1.z.number().min(0).max(100).optional(),
        esiEmployerRatePercent: zod_1.z.number().min(0).max(100).optional(),
        esiEffectiveFrom: zod_1.z.string().optional(),
        esiExemptionReason: zod_1.z.string().optional(),
        ptApplicable: zod_1.z.boolean().optional(),
        ptStateJurisdiction: zod_1.z.string().optional(),
        ptMonthlySlabAmount: zod_1.z.number().min(0).optional(),
        ptMinGrossThreshold: zod_1.z.number().min(0).optional(),
        ptEffectiveFrom: zod_1.z.string().optional(),
        tdsApplicable: zod_1.z.boolean().optional(),
        tdsFinancialYear: zod_1.z.string().optional(),
        tdsDefaultRegime: zod_1.z.string().optional(),
        tdsEffectiveFrom: zod_1.z.string().optional(),
    }),
};
