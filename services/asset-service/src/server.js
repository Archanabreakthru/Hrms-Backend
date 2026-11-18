"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const assetService_1 = require("./services/assetService");
const assetController_1 = require("./controllers/assetController");
const assetRepository_1 = require("./repositories/assetRepository");
const env_1 = require("./config/env");
const repo = new assetRepository_1.InMemoryAssetRepository();
const service = new assetService_1.AssetService(repo);
const controller = new assetController_1.AssetController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[asset-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
