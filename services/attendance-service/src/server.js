"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const attendanceService_1 = require("./services/attendanceService");
const attendanceController_1 = require("./controllers/attendanceController");
const attendanceRepository_1 = require("./repositories/attendanceRepository");
const env_1 = require("./config/env");
const repo = new attendanceRepository_1.InMemoryAttendanceRepository();
const service = new attendanceService_1.AttendanceService(repo);
const controller = new attendanceController_1.AttendanceController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[attendance-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
