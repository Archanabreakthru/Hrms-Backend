import { createApp } from './app';
import { OrganizationService } from './services/orgService';
import { OrganizationController } from './controllers/orgController';
import { PrismaOrgRepository } from './repositories/prismaOrgRepository';
import { config } from './config/env';
import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();
const orgRepo = new PrismaOrgRepository(prisma);
const orgService = new OrganizationService(orgRepo);
const orgController = new OrganizationController(orgService);
const app = createApp(orgController);

app.listen(config.port, () => {
  console.log(`[organization-service] Running on port ${config.port} in ${config.nodeEnv} mode with Prisma PostgreSQL repository`);
});

