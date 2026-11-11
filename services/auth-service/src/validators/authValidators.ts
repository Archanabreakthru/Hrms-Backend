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

