"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const employeeService_1 = require("./services/employeeService");
const employeeController_1 = require("./controllers/employeeController");
const prismaEmployeeRepository_1 = require("./repositories/prismaEmployeeRepository");
const orgServiceClient_1 = require("./services/orgServiceClient");
const env_1 = require("./config/env");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const employeeRepo = new prismaEmployeeRepository_1.PrismaEmployeeRepository(prisma);
const orgClient = new orgServiceClient_1.OrgServiceClient(env_1.config.orgServiceUrl);
const employeeService = new employeeService_1.EmployeeService(employeeRepo, orgClient);
const employeeController = new employeeController_1.EmployeeController(employeeService);
const app = (0, app_1.createApp)(employeeController);
app.listen(env_1.config.port, () => {
    console.log(`[employee-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode with Prisma PostgreSQL repository`);
});
