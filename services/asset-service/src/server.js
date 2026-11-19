"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const assetService_1 = require("./services/assetService");
const assetController_1 = require("./controllers/assetController");
const prismaAssetRepository_1 = require("./repositories/prismaAssetRepository");
const env_1 = require("./config/env");
const client_1 = require("./generated/client");
const prisma = new client_1.PrismaClient();
const repo = new prismaAssetRepository_1.PrismaAssetRepository(prisma);
const service = new assetService_1.AssetService(repo);
const controller = new assetController_1.AssetController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[asset-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode with PostgreSQL Prisma repository`);
});
