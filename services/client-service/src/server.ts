import { createApp } from './app';
import { ClientService } from './services/clientService';
import { ClientController } from './controllers/clientController';
import { InMemoryClientRepository } from './repositories/clientRepository';
import { config } from './config/env';

const repo = new InMemoryClientRepository();
const service = new ClientService(repo);
const controller = new ClientController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[client-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

