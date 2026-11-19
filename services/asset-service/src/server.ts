import { createApp } from './app';
import { AssetService } from './services/assetService';
import { AssetController } from './controllers/assetController';
import { PrismaAssetRepository } from './repositories/prismaAssetRepository';
import { config } from './config/env';
import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();
const repo = new PrismaAssetRepository(prisma);
const service = new AssetService(repo);
const controller = new AssetController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[asset-service] Running on port ${config.port} in ${config.nodeEnv} mode with PostgreSQL Prisma repository`);
});
