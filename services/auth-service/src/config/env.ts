import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'orbyx-super-secure-jwt-secret-key-32chars',
  jwtIssuer: process.env.JWT_ISSUER || 'orbyx-auth-service',
  jwtAudience: process.env.JWT_AUDIENCE || 'orbyx-hrms-client',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://orbyx_auth_user:auth_secret@localhost:5432/orbyx_auth_db',
};

