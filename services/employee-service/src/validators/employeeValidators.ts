import { z } from 'zod';

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const PHONE_REGEX = /^\+?[0-9\s\-]{8,15}$/;

export const draftEmployeeSchema = {
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid official email is required'),
    phone: z.string().regex(PHONE_REGEX, 'Valid phone number is required'),
    userId: z.string().min(1, 'Linked user ID is required'),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    branchId: z.string().optional(),
    employmentType: z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).default('Permanent'),
  }),
};

export const enrollEmployeeSchema = {
  body: z.object({
    id: z.string().optional(), // If transitioning an existing draft
    userId: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().regex(PHONE_REGEX),
    dateOfBirth: z.string().min(1, 'Date of birth is required for enrollment'),
    gender: z.enum(['Male', 'Female', 'Other']),
    address: z.string().min(5, 'Primary address is required'),
    emergencyContact: z.object({
      name: z.string().min(1, 'Emergency contact name is required'),
      relationship: z.string().min(1, 'Relationship is required'),
      phone: z.string().regex(PHONE_REGEX, 'Valid emergency contact phone is required'),
    }),
    departmentId: z.string().min(1, 'Department is required for enrollment'),
    designationId: z.string().min(1, 'Designation is required for enrollment'),
    branchId: z.string().min(1, 'Branch is required for enrollment'),
    employmentType: z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).default('Permanent'),
    dateOfJoining: z.string().min(1, 'Date of joining is required'),
    noticePeriodDays: z.number().int().min(0).default(30),
    shiftId: z.string().min(1, 'Assigned shift is required'),
    bankDetails: z.object({
      accountNumber: z.string().min(8, 'Bank account number is required'),
      ifscCode: z.string().min(4, 'IFSC code is required'),
      bankName: z.string().min(2, 'Bank name is required'),
      branchName: z.string().optional(),
    }),
    panOrTaxNumber: z.string().regex(PAN_REGEX, 'Valid PAN format required (e.g. ABCDE1234F)'),
    pfUan: z.string().optional(),
    esiNumber: z.string().optional(),
    baseSalaryAnnual: z.number().min(0).optional(),
    salaryStructureId: z.string().optional(),
  }),
};

export const updatePersonalSchema = {
  body: z.object({
    personalEmail: z.string().email().optional(),
    personalPhone: z.string().regex(PHONE_REGEX).optional(),
    currentAddress: z.string().min(5).optional(),
    permanentAddress: z.string().min(5).optional(),
    bloodGroup: z.string().optional(),
    maritalStatus: z.enum(['Single', 'Married', 'Other']).optional(),
    emergencyContact: z.object({
      name: z.string().min(1),
      relationship: z.string().min(1),
      phone: z.string().regex(PHONE_REGEX),
    }).optional(),
  }),
};

export const updateEmploymentSchema = {
  body: z.object({
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    branchId: z.string().optional(),
    employmentType: z.enum(['Permanent', 'Contract', 'Probation', 'Intern']).optional(),
    status: z.enum(['Active', 'On_Leave', 'Probation', 'Notice_Period', 'Separated', 'Inactive']).optional(),
    profileStatus: z.enum(['Draft', 'Profile_Incomplete', 'Pending_Verification', 'Active', 'Inactive', 'Separated']).optional(),
    noticePeriodDays: z.number().int().min(0).optional(),
    probationPeriodDays: z.number().int().min(0).optional(),
    confirmationDate: z.string().optional(),
    dateOfSeparation: z.string().optional(),
    separationReason: z.string().optional(),
    shiftId: z.string().optional(),
  }),
};

export const updateReportingSchema = {
  body: z.object({
    reportingManagerId: z.string().min(1, 'Reporting manager ID is required'),
  }),
};

export const updateSalaryBankSchema = {
  body: z.object({
    bankDetails: z.object({
      accountNumber: z.string().min(8),
      ifscCode: z.string().min(4),
      bankName: z.string().min(2),
      branchName: z.string().optional(),
    }).optional(),
    panOrTaxNumber: z.string().regex(PAN_REGEX).optional(),
    pfUan: z.string().optional(),
    esiNumber: z.string().optional(),
    baseSalaryAnnual: z.number().min(0).optional(),
    salaryStructureId: z.string().optional(),
    epfApplicable: z.boolean().optional(),
    esiApplicable: z.boolean().optional(),
  }),
};

