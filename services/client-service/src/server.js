"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const clientService_1 = require("./services/clientService");
const clientController_1 = require("./controllers/clientController");
const clientRepository_1 = require("./repositories/clientRepository");
const env_1 = require("./config/env");
const repo = new clientRepository_1.InMemoryClientRepository();
const service = new clientService_1.ClientService(repo);
const controller = new clientController_1.ClientController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[client-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
