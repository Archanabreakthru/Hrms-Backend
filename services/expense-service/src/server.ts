import { createApp } from './app';
import { ExpenseService } from './services/expenseService';
import { ExpenseController } from './controllers/expenseController';
import { InMemoryExpenseRepository } from './repositories/expenseRepository';
import { config } from './config/env';

const repo = new InMemoryExpenseRepository();
const service = new ExpenseService(repo);
const controller = new ExpenseController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[expense-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

