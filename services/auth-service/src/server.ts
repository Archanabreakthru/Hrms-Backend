import { createApp } from './app';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { InMemoryAuthRepository } from './repositories/authRepository';
import { config } from './config/env';
import { UserRole } from '../../../shared/src/constants/roles';

const authRepo = new InMemoryAuthRepository();
const authService = new AuthService(authRepo);
const authController = new AuthController(authService);
const app = createApp(authController);

// Bootstrap a default admin if none exists
(async () => {
  const adminEmail = 'admin@orbyx.internal';
  const existing = await authRepo.findUserByEmail(adminEmail);
  if (!existing) {
    await authService.register({
      email: adminEmail,
      password: 'SuperAdminPassword123!',
      role: UserRole.SUPER_ADMIN,
    });
    console.log(`[auth-service] Bootstrapped default super_admin (${adminEmail})`);
  }
})();

app.listen(config.port, () => {
  console.log(`[auth-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

