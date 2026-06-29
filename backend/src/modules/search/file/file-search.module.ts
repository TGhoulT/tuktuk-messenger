import { FileSearchController } from './file-search.controller';
import { FileSearchService } from './file-search.service';

export const fileSearchModule = {
    controllers: [FileSearchController],
    services: [FileSearchService],
};

export { FileSearchController, FileSearchService };