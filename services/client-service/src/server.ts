import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createApp } from './app';
import { ClientService } from './services/clientService';
import { ClientController } from './controllers/clientController';
import { PrismaClientRepository } from './repositories/prismaClientRepository';
import { PrismaClient } from './generated/client';
import { config } from './config/env';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || config.databaseUrl,
    },
  },
});
const repo = new PrismaClientRepository(prisma);
const service = new ClientService(repo);
const controller = new ClientController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[client-service] Running on port ${config.port} in ${config.nodeEnv} mode with Prisma PostgreSQL repository`);
});
