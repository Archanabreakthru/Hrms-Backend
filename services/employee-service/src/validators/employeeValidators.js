"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSalaryBankSchema = exports.updateReportingSchema = exports.updateEmploymentSchema = exports.updatePersonalSchema = exports.enrollEmployeeSchema = exports.draftEmployeeSchema = exports.PHONE_REGEX = exports.PAN_REGEX = void 0;
const zod_1 = require("zod");
exports.PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
exports.PHONE_REGEX = /^\+?[0-9\s\-]{8,15}$/;
exports.draftEmployeeSchema = {
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First name is required'),
        lastName: zod_1.z.string().min(1, 'Last name is required'),
        email: zod_1.z.string().email('Valid official email is required'),
        phone: zod_1.z.string().regex(exports.PHONE_REGEX, 'Valid phone number is required'),
        userId: zod_1.z.string().min(1, 'Linked user ID is required'),
        departmentId: zod_1.z.string().optional(),
        designationId: zod_1.z.string().optional(),
        branchId: zod_1.z.string().optional(),
        employmentType: zod_1.z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).default('Permanent'),
    }),
};
exports.enrollEmployeeSchema = {
    body: zod_1.z.object({
        id: zod_1.z.string().optional(), // If transitioning an existing draft
        userId: zod_1.z.string().min(1),
        firstName: zod_1.z.string().min(1),
        lastName: zod_1.z.string().min(1),
        email: zod_1.z.string().email(),
        phone: zod_1.z.string().regex(exports.PHONE_REGEX),
        dateOfBirth: zod_1.z.string().min(1, 'Date of birth is required for enrollment'),
        gender: zod_1.z.enum(['Male', 'Female', 'Other']),
        address: zod_1.z.string().min(5, 'Primary address is required'),
        emergencyContact: zod_1.z.object({
            name: zod_1.z.string().min(1, 'Emergency contact name is required'),
            relationship: zod_1.z.string().min(1, 'Relationship is required'),
            phone: zod_1.z.string().regex(exports.PHONE_REGEX, 'Valid emergency contact phone is required'),
        }),
        departmentId: zod_1.z.string().min(1, 'Department is required for enrollment'),
        designationId: zod_1.z.string().min(1, 'Designation is required for enrollment'),
        branchId: zod_1.z.string().min(1, 'Branch is required for enrollment'),
        employmentType: zod_1.z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).default('Permanent'),
        dateOfJoining: zod_1.z.string().min(1, 'Date of joining is required'),
        noticePeriodDays: zod_1.z.number().int().min(0).default(30),
        shiftId: zod_1.z.string().min(1, 'Assigned shift is required'),
        bankDetails: zod_1.z.object({
            accountNumber: zod_1.z.string().min(8, 'Bank account number is required'),
            ifscCode: zod_1.z.string().min(4, 'IFSC code is required'),
            bankName: zod_1.z.string().min(2, 'Bank name is required'),
            branchName: zod_1.z.string().optional(),
        }),
        panOrTaxNumber: zod_1.z.string().regex(exports.PAN_REGEX, 'Valid PAN format required (e.g. ABCDE1234F)'),
        pfUan: zod_1.z.string().optional(),
        esiNumber: zod_1.z.string().optional(),
        baseSalaryAnnual: zod_1.z.number().min(0).optional(),
        salaryStructureId: zod_1.z.string().optional(),
    }),
};
exports.updatePersonalSchema = {
    body: zod_1.z.object({
        personalEmail: zod_1.z.string().email().optional(),
        personalPhone: zod_1.z.string().regex(exports.PHONE_REGEX).optional(),
        currentAddress: zod_1.z.string().min(5).optional(),
        permanentAddress: zod_1.z.string().min(5).optional(),
        bloodGroup: zod_1.z.string().optional(),
        maritalStatus: zod_1.z.enum(['Single', 'Married', 'Other']).optional(),
        emergencyContact: zod_1.z.object({
            name: zod_1.z.string().min(1),
            relationship: zod_1.z.string().min(1),
            phone: zod_1.z.string().regex(exports.PHONE_REGEX),
        }).optional(),
    }),
};
exports.updateEmploymentSchema = {
    body: zod_1.z.object({
        departmentId: zod_1.z.string().optional(),
        designationId: zod_1.z.string().optional(),
        branchId: zod_1.z.string().optional(),
        employmentType: zod_1.z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).optional(),
        status: zod_1.z.enum(['Active', 'On_Leave', 'Probation', 'Notice_Period', 'Separated', 'Inactive']).optional(),
        profileStatus: zod_1.z.enum(['Draft', 'Profile_Incomplete', 'Pending_Verification', 'Active', 'Inactive', 'Separated']).optional(),
        noticePeriodDays: zod_1.z.number().int().min(0).optional(),
        probationPeriodDays: zod_1.z.number().int().min(0).optional(),
        confirmationDate: zod_1.z.string().optional(),
        dateOfSeparation: zod_1.z.string().optional(),
        separationReason: zod_1.z.string().optional(),
        shiftId: zod_1.z.string().optional(),
    }),
};
exports.updateReportingSchema = {
    body: zod_1.z.object({
        reportingManagerId: zod_1.z.string().min(1, 'Reporting manager ID is required'),
    }),
};
exports.updateSalaryBankSchema = {
    body: zod_1.z.object({
        bankDetails: zod_1.z.object({
            accountNumber: zod_1.z.string().min(8),
            ifscCode: zod_1.z.string().min(4),
            bankName: zod_1.z.string().min(2),
            branchName: zod_1.z.string().optional(),
        }).optional(),
        panOrTaxNumber: zod_1.z.string().regex(exports.PAN_REGEX).optional(),
        pfUan: zod_1.z.string().optional(),
        esiNumber: zod_1.z.string().optional(),
        baseSalaryAnnual: zod_1.z.number().min(0).optional(),
        salaryStructureId: zod_1.z.string().optional(),
        epfApplicable: zod_1.z.boolean().optional(),
        esiApplicable: zod_1.z.boolean().optional(),
    }),
};
