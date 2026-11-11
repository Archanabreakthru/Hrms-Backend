import { createGatewayApp } from './app';
import { gatewayConfig } from './config/env';

const app = createGatewayApp();

app.listen(gatewayConfig.port, () => {
  console.log(`Orbyx HRMS API Gateway running on port ${gatewayConfig.port}`);
});

