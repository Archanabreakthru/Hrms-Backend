"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const app = (0, app_1.createGatewayApp)();
app.listen(env_1.gatewayConfig.port, () => {
    console.log(`Orbyx HRMS API Gateway running on port ${env_1.gatewayConfig.port}`);
});
