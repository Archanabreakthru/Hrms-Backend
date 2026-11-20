export const notificationConfig = {
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '5008', 10),
  jwtSecret: process.env.JWT_SECRET || 'orbyx_super_secret_jwt_key_2026_dev_mode_only',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl: process.env.NOTIFICATION_DATABASE_URL || 'postgresql://orbyx:orbyx_secret@localhost:5432/orbyx_notification_db?schema=public',
  mail: {
    host: process.env.MAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USERNAME || '',
    pass: process.env.MAIL_PASSWORD || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@orbyx.internal',
    fromName: process.env.MAIL_FROM_NAME || 'Breakthru Enterprise Solution',
  },
  portalUrl: process.env.PUBLIC_APP_URL || process.env.HRMS_PORTAL_URL || process.env.APP_URL || 'http://localhost:3000',
  companyName: process.env.COMPANY_NAME || 'Breakthru Enterprise Solution',
};

