import { createApp } from './app';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { PrismaAuthRepository } from './repositories/prismaAuthRepository';
import { prisma, disconnectPrisma } from './lib/prisma';
import { config } from './config/env';
import { UserRole } from '../../../shared/src/constants/roles';

async function bootstrap() {
  try {
    // 1. Fail-fast active database connectivity probe
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[auth-service] Connected to PostgreSQL schema auth successfully`);

    // 2. Instantiate Prisma-backed repository
    const authRepo = new PrismaAuthRepository(prisma);
    const authService = new AuthService(authRepo);
    const authController = new AuthController(authService);
    const app = createApp(authController);

    // 3. Bootstrap default super_admin if not present in database
    const adminEmail = 'admin@orbyx.internal';
    const existing = await authRepo.findUserByEmail(adminEmail);
    if (!existing) {
      await authService.register({
        email: adminEmail,
        password: 'SuperAdminPassword123!',
        role: UserRole.SUPER_ADMIN,
      });
      console.log(`[auth-service] Bootstrapped default super_admin (${adminEmail}) in database`);
    }

    // 4. Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`[auth-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // 5. Lifecycle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[auth-service] Received ${signal}. Draining connection pool and closing server...`);
      server.close(async () => {
        await disconnectPrisma();
        console.log(`[auth-service] Prisma disconnected. Process exiting cleanly.`);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[auth-service] FATAL: Database initialization failed during startup:', error);
    process.exit(1);
  }
}

bootstrap();
