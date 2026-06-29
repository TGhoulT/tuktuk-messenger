import { UserController } from './user.controller';
import { UserService } from './user.service';

export const userModule = {
    controllers: [UserController],
    services: [UserService],
};

export { UserController, UserService };