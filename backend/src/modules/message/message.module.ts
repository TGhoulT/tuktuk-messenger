import { MessageController } from './message.controller';
import { MessageService } from './message.service';

export const messageModule = {
    controllers: [MessageController],
    services: [MessageService],
};

export { MessageController, MessageService };