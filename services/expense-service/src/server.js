"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const expenseService_1 = require("./services/expenseService");
const expenseController_1 = require("./controllers/expenseController");
const expenseRepository_1 = require("./repositories/expenseRepository");
const env_1 = require("./config/env");
const repo = new expenseRepository_1.InMemoryExpenseRepository();
const service = new expenseService_1.ExpenseService(repo);
const controller = new expenseController_1.ExpenseController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[expense-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
