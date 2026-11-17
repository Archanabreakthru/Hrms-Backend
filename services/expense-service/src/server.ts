import { createApp } from './app';
import { ExpenseService } from './services/expenseService';
import { ExpenseController } from './controllers/expenseController';
import { PrismaExpenseRepository } from './repositories/prismaExpenseRepository';
import { PrismaClient } from './generated/client';
import { config } from './config/env';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

const repo = new PrismaExpenseRepository(prisma);
const service = new ExpenseService(repo);
const controller = new ExpenseController(service);
const app = createApp(controller);

async function start() {
  try {
    // Verify PostgreSQL connectivity
    await prisma.$connect();
    console.log(`[expense-service] Successfully connected to PostgreSQL schema expense`);

    const server = app.listen(config.port, () => {
      console.log(`[expense-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    const shutdown = async () => {
      console.log(`[expense-service] Shutting down...`);
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error(`[expense-service] FATAL: Failed to connect to PostgreSQL:`, err);
    process.exit(1);
  }
}

start();
