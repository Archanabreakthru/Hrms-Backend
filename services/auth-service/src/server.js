"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const authService_1 = require("./services/authService");
const authController_1 = require("./controllers/authController");
const prismaAuthRepository_1 = require("./repositories/prismaAuthRepository");
const prisma_1 = require("./lib/prisma");
const env_1 = require("./config/env");
const roles_1 = require("../../../shared/src/constants/roles");
async function bootstrap() {
    try {
        // 1. Fail-fast active database connectivity probe
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        console.log(`[auth-service] Connected to PostgreSQL schema auth successfully`);
        // 2. Instantiate Prisma-backed repository
        const authRepo = new prismaAuthRepository_1.PrismaAuthRepository(prisma_1.prisma);
        const authService = new authService_1.AuthService(authRepo);
        const authController = new authController_1.AuthController(authService);
        const app = (0, app_1.createApp)(authController);
        // 3. Bootstrap default super_admin if not present in database
        const adminEmail = 'admin@orbyx.internal';
        const existing = await authRepo.findUserByEmail(adminEmail);
        if (!existing) {
            await authService.register({
                email: adminEmail,
                password: 'SuperAdminPassword123!',
                role: roles_1.UserRole.SUPER_ADMIN,
            });
            console.log(`[auth-service] Bootstrapped default super_admin (${adminEmail}) in database`);
        }
        // 4. Start HTTP server
        const server = app.listen(env_1.config.port, () => {
            console.log(`[auth-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
        });
        // 5. Lifecycle graceful shutdown
        const shutdown = async (signal) => {
            console.log(`[auth-service] Received ${signal}. Draining connection pool and closing server...`);
            server.close(async () => {
                await (0, prisma_1.disconnectPrisma)();
                console.log(`[auth-service] Prisma disconnected. Process exiting cleanly.`);
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('[auth-service] FATAL: Database initialization failed during startup:', error);
        process.exit(1);
    }
}
bootstrap();
