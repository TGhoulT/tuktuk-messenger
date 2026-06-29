import { StickerController } from './sticker.controller';
import { StickerService } from './sticker.service';

export const stickerModule = {
    controllers: [StickerController],
    services: [StickerService],
};

export { StickerController, StickerService };