import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'orbyx-super-secure-jwt-secret-key-32chars',
  jwtIssuer: process.env.JWT_ISSUER || 'orbyx-auth-service',
  jwtAudience: process.env.JWT_AUDIENCE || 'orbyx-hrms-client',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://orbyx_client_user:client_secret@localhost:5432/orbyx_client_db',
};

