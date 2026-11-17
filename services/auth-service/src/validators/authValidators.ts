import { z } from 'zod';

export const loginSchema = {
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

export const registerUserSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum([
      'super_admin',
      'managing_director',
      'hr_admin',
      'senior_manager',
      'reporting_manager',
      'employee',
      'client_supervisor',
    ]),
    employeeId: z.string().optional(),
    departmentId: z.string().optional(),
    clientId: z.string().optional(),
  }),
};

export const provisionUserSchema = {
  body: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    email: z.string().email('Valid official email address is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    roleCode: z.string().default('employee'),
    departmentId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
  }),
};

export const activateAccountSchema = {
  body: z.object({
    token: z.string().min(16, 'Valid activation token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
};

export const resendInviteSchema = {
  body: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
  }),
};

