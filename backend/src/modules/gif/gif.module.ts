import { GifController } from './gif.controller';
import { GifService } from './gif.service';

export const gifModule = {
    controllers: [GifController],
    services: [GifService],
};

export { GifController, GifService };