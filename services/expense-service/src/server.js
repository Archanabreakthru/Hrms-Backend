"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const expenseService_1 = require("./services/expenseService");
const expenseController_1 = require("./controllers/expenseController");
const prismaExpenseRepository_1 = require("./repositories/prismaExpenseRepository");
const client_1 = require("./generated/client");
const env_1 = require("./config/env");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: env_1.config.databaseUrl,
        },
    },
});
const repo = new prismaExpenseRepository_1.PrismaExpenseRepository(prisma);
const service = new expenseService_1.ExpenseService(repo);
const controller = new expenseController_1.ExpenseController(service);
const app = (0, app_1.createApp)(controller);
async function start() {
    try {
        // Verify PostgreSQL connectivity
        await prisma.$connect();
        console.log(`[expense-service] Successfully connected to PostgreSQL schema expense`);
        const server = app.listen(env_1.config.port, () => {
            console.log(`[expense-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
        });
        const shutdown = async () => {
            console.log(`[expense-service] Shutting down...`);
            server.close();
            await prisma.$disconnect();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        console.error(`[expense-service] FATAL: Failed to connect to PostgreSQL:`, err);
        process.exit(1);
    }
}
start();
