"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app_1 = require("./app");
const clientService_1 = require("./services/clientService");
const clientController_1 = require("./controllers/clientController");
const prismaClientRepository_1 = require("./repositories/prismaClientRepository");
const client_1 = require("./generated/client");
const env_1 = require("./config/env");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || env_1.config.databaseUrl,
        },
    },
});
const repo = new prismaClientRepository_1.PrismaClientRepository(prisma);
const service = new clientService_1.ClientService(repo);
const controller = new clientController_1.ClientController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[client-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode with Prisma PostgreSQL repository`);
});
