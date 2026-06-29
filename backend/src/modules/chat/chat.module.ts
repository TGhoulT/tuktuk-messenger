import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

export const chatModule = {
    controllers: [ChatController],
    services: [ChatService],
};

export { ChatController, ChatService };