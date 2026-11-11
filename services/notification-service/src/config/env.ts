export const notificationConfig = {
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '5008', 10),
  jwtSecret: process.env.JWT_SECRET || 'orbyx_super_secret_jwt_key_2026_dev_mode_only',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl: process.env.NOTIFICATION_DATABASE_URL || 'postgresql://orbyx:orbyx_secret@localhost:5432/orbyx_notification_db?schema=public',
};

