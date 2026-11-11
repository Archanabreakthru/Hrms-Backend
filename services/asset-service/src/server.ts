import { createApp } from './app';
import { AssetService } from './services/assetService';
import { AssetController } from './controllers/assetController';
import { InMemoryAssetRepository } from './repositories/assetRepository';
import { config } from './config/env';

const repo = new InMemoryAssetRepository();
const service = new AssetService(repo);
const controller = new AssetController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[asset-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

