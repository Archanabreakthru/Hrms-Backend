import { createGatewayApp } from './app';
import { gatewayConfig } from './config/env';

const app = createGatewayApp();

app.listen(gatewayConfig.port, () => {
  console.log(`\n🚀 Orbyx HRMS API Gateway running on http://localhost:${gatewayConfig.port}`);
  console.log(`📖 Swagger API Docs available at http://localhost:${gatewayConfig.port}/api-docs\n`);
});

