import { z } from 'zod';

export const createClientSchema = {
  body: z.object({
    name: z.string().min(2, 'Client name must be at least 2 characters'),
    contactName: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    contractStart: z.string().optional(),
    contractEnd: z.string().optional(),
    status: z.enum(['Active', 'Inactive', 'Prospect']).default('Active'),
  }),
};

export const updateClientSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    contactName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    contractStart: z.string().optional(),
    contractEnd: z.string().optional(),
    status: z.enum(['Active', 'Inactive', 'Prospect']).optional(),
  }),
};

export const createSupervisorSchema = {
  body: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    fullName: z.string().min(2, 'Supervisor name must be at least 2 characters'),
    email: z.string().email('Valid supervisor email is required'),
    phone: z.string().optional(),
    designation: z.string().optional(),
    status: z.enum(['Active', 'Invited', 'Suspended']).default('Active'),
    userId: z.string().optional(),
  }),
};

export const updateSupervisorSchema = {
  body: z.object({
    fullName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    designation: z.string().optional(),
    status: z.enum(['Active', 'Invited', 'Suspended']).optional(),
    userId: z.string().optional(),
  }),
};

export const createDeploymentSchema = {
  body: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    employeeId: z.string().min(1, 'Employee ID is required'),
    supervisorId: z.string().optional(),
    project: z.string().min(2, 'Project name is required'),
    location: z.string().min(2, 'Work location is required'),
    workMode: z.string().default('Client Site'),
    startDate: z.string().min(1, 'Start date is required'),
    plannedEndDate: z.string().min(1, 'Planned end date is required'),
    allocation: z.number().min(1).max(100).default(100),
    allowanceMonthly: z.number().min(0).default(0),
    status: z.enum(['Active', 'Completed', 'Terminated', 'On_Hold']).default('Active'),
  }),
};

export const updateDeploymentSchema = {
  body: z.object({
    supervisorId: z.string().optional(),
    project: z.string().min(2).optional(),
    location: z.string().optional(),
    workMode: z.string().optional(),
    plannedEndDate: z.string().optional(),
    actualEndDate: z.string().optional(),
    allocation: z.number().min(1).max(100).optional(),
    allowanceMonthly: z.number().min(0).optional(),
    status: z.enum(['Active', 'Completed', 'Terminated', 'On_Hold']).optional(),
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
