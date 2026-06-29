import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export const authModule = {
    controllers: [AuthController],
    services: [AuthService],
};

export { AuthController, AuthService };