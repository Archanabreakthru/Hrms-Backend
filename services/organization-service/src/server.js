"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const orgService_1 = require("./services/orgService");
const orgController_1 = require("./controllers/orgController");
const orgRepository_1 = require("./repositories/orgRepository");
const env_1 = require("./config/env");
const orgRepo = new orgRepository_1.InMemoryOrganizationRepository();
const orgService = new orgService_1.OrganizationService(orgRepo);
const orgController = new orgController_1.OrganizationController(orgService);
const app = (0, app_1.createApp)(orgController);
app.listen(env_1.config.port, () => {
    console.log(`[organization-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
