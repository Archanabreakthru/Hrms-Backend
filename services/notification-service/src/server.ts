import { createApp } from './app';
import { notificationConfig } from './config/env';

const { app } = createApp();

app.listen(notificationConfig.port, () => {
  console.log(`Notification & Audit Service listening on port ${notificationConfig.port}`);
});
