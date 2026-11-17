import { createApp } from './app';
import { AttendanceService } from './services/attendanceService';
import { AttendanceController } from './controllers/attendanceController';
import { InMemoryAttendanceRepository } from './repositories/attendanceRepository';
import { PrismaAttendanceRepository } from './repositories/prismaAttendanceRepository';
import { PrismaClient } from './generated/client';
import { config } from './config/env';

const prisma = new PrismaClient();
const repo = process.env.USE_IN_MEMORY_DB === 'true'
  ? new InMemoryAttendanceRepository()
  : new PrismaAttendanceRepository(prisma);

const service = new AttendanceService(repo);
const controller = new AttendanceController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[attendance-service] Running on port ${config.port} in ${config.nodeEnv} mode (repo: ${repo.constructor.name})`);
});

