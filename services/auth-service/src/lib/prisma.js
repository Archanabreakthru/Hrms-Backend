"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.disconnectPrisma = disconnectPrisma;
const client_1 = require("../generated/client");
exports.prisma = global.__authPrismaInstance ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        errorFormat: 'minimal',
    });
if (process.env.NODE_ENV !== 'production') {
    global.__authPrismaInstance = exports.prisma;
}
async function disconnectPrisma() {
    await exports.prisma.$disconnect();
}
