import { createApp } from './app';
import { AttendanceService } from './services/attendanceService';
import { AttendanceController } from './controllers/attendanceController';
import { InMemoryAttendanceRepository } from './repositories/attendanceRepository';
import { config } from './config/env';

const repo = new InMemoryAttendanceRepository();
const service = new AttendanceService(repo);
const controller = new AttendanceController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[attendance-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

