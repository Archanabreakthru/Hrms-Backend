import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'orbyx-super-secure-jwt-secret-key-32chars',
  jwtIssuer: process.env.JWT_ISSUER || 'orbyx-auth-service',
  jwtAudience: process.env.JWT_AUDIENCE || 'orbyx-hrms-client',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://orbyx_payroll_user:payroll_secret@localhost:5432/orbyx_payroll_db',
};

