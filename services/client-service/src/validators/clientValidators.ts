import { z } from 'zod';

export const createClientSchema = {
  body: z.object({
    name: z.string().min(2),
    contactName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    contractStart: z.string().optional(),
    contractEnd: z.string().optional(),
  }),
};

export const createDeploymentSchema = {
  body: z.object({
    clientId: z.string().min(1),
    employeeId: z.string().min(1),
    supervisorId: z.string().optional(),
    project: z.string().min(2),
    location: z.string().min(2),
    workMode: z.string().default('Client Site'),
    startDate: z.string().min(1),
    plannedEndDate: z.string().min(1),
    allocation: z.number().min(1).max(100).default(100),
    allowanceMonthly: z.number().min(0).default(0),
  }),
};

export const verifyAttendanceSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    remarks: z.string().optional(),
  }),
};

export const hrApproveSchema = {
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    hrComments: z.string().optional(),
  }),
};

