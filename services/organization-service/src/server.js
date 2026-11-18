"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const orgService_1 = require("./services/orgService");
const orgController_1 = require("./controllers/orgController");
const prismaOrgRepository_1 = require("./repositories/prismaOrgRepository");
const env_1 = require("./config/env");
const client_1 = require("./generated/client");
const prisma = new client_1.PrismaClient();
const orgRepo = new prismaOrgRepository_1.PrismaOrgRepository(prisma);
const orgService = new orgService_1.OrganizationService(orgRepo);
const orgController = new orgController_1.OrganizationController(orgService);
const app = (0, app_1.createApp)(orgController);
app.listen(env_1.config.port, () => {
    console.log(`[organization-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode with Prisma PostgreSQL repository`);
});
