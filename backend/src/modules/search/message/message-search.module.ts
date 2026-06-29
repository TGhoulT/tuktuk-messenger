import { MessageSearchController } from './message-search.controller';
import { MessageSearchService } from './message-search.service';

export const searchModule = {
    controllers: [MessageSearchController],
    services: [MessageSearchService],
};

export { MessageSearchController, MessageSearchService };