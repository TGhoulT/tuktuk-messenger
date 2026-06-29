import { SearchController } from './search.controller';
import { SearchService } from './search.service';

export const searchModule = {
    controllers: [SearchController],
    services: [SearchService],
};

export { SearchController, SearchService };