"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesignationSchema = exports.createDepartmentSchema = exports.createBranchSchema = exports.updateCompanyProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateCompanyProfileSchema = {
    body: zod_1.z.object({
        legalName: zod_1.z.string().min(2),
        tradingName: zod_1.z.string().min(2),
        cinNumber: zod_1.z.string().optional(),
        panNumber: zod_1.z.string().optional(),
        tanNumber: zod_1.z.string().optional(),
        gstin: zod_1.z.string().optional(),
        pfRegistrationNumber: zod_1.z.string().optional(),
        esiRegistrationNumber: zod_1.z.string().optional(),
        registeredAddress: zod_1.z.string().min(5),
        headquartersAddress: zod_1.z.string().min(5),
        contactEmail: zod_1.z.string().email(),
        contactPhone: zod_1.z.string().min(8),
        website: zod_1.z.string().url().optional(),
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
exports.createDepartmentSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(10).toUpperCase(),
        name: zod_1.z.string().min(2),
        branchId: zod_1.z.string().optional(),
        parentDeptId: zod_1.z.string().optional(),
        headEmployeeId: zod_1.z.string().optional(),
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
