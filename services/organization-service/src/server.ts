import { createApp } from './app';
import { OrganizationService } from './services/orgService';
import { OrganizationController } from './controllers/orgController';
import { InMemoryOrganizationRepository } from './repositories/orgRepository';
import { config } from './config/env';

const orgRepo = new InMemoryOrganizationRepository();
const orgService = new OrganizationService(orgRepo);
const orgController = new OrganizationController(orgService);
const app = createApp(orgController);

app.listen(config.port, () => {
  console.log(`[organization-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

