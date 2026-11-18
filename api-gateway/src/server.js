"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const app = (0, app_1.createGatewayApp)();
app.listen(env_1.gatewayConfig.port, () => {
    console.log(`\n🚀 Celestial HRMS API Gateway running on http://localhost:${env_1.gatewayConfig.port}`);
    console.log(`📖 Swagger API Docs available at http://localhost:${env_1.gatewayConfig.port}/api-docs\n`);
});
