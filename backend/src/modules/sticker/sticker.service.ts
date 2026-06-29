import { AppDataSource } from '../../database/data-source';
import { StickerPack } from '../../database/entities/StickerPack';
import { FavoriteSticker } from '../../database/entities/FavoriteSticker';
import { File, FileType } from '../../database/entities/File';
import { In } from 'typeorm';

export class StickerService {
    private stickerPackRepository = AppDataSource.getRepository(StickerPack);
    private favoriteStickerRepository = AppDataSource.getRepository(FavoriteSticker);
    private fileRepository = AppDataSource.getRepository(File);

    async findImportedBySourceShortName(shortName: string): Promise<StickerPack | null> {
        return this.stickerPackRepository.findOneBy({ sourceShortName: shortName });
    }

    async createPack(userId: string, name: string, title: string): Promise<StickerPack> {
        const existing = await this.stickerPackRepository.findOneBy({ name });
        if (existing) throw new Error('Pack with this name already exists');
        const pack = this.stickerPackRepository.create({
            name,
            title,
            authorId: userId,
            stickerIds: [],
            isSystem: false,
        });
        return this.stickerPackRepository.save(pack);
    }

    async addStickerToPack(packId: string, userId: string, stickerFileId: string): Promise<StickerPack> {
        const pack = await this.stickerPackRepository.findOneBy({ id: packId });
        if (!pack) throw new Error('Pack not found');
        if (pack.authorId !== userId) throw new Error('Only pack author can add stickers');

        const file = await this.fileRepository.findOneBy({ id: stickerFileId });
        if (!file) throw new Error('File not found');
        if (file.type !== FileType.STICKER && file.type !== FileType.STICKER_ANIMATED) {
            throw new Error('File is not a sticker');
        }

        if (!pack.stickerIds.includes(stickerFileId)) {
            pack.stickerIds.push(stickerFileId);
            await this.stickerPackRepository.save(pack);
            await this.fileRepository.increment({ id: stickerFileId }, 'usedCount', 1);
        }
        return pack;
    }

    async getUserPacks(userId: string): Promise<StickerPack[]> {
        return this.stickerPackRepository.find({
            where: [{ isSystem: true }, { authorId: userId }],
            order: { createdAt: 'DESC' },
        });
    }

    async deletePack(packId: string, userId: string): Promise<void> {
        const pack = await this.stickerPackRepository.findOneBy({ id: packId });
        if (!pack) throw new Error('Pack not found');
        if (pack.authorId !== userId && !pack.isSystem) {
            throw new Error('Access denied');
        }
        for (const stickerId of pack.stickerIds) {
            await this.fileRepository.decrement({ id: stickerId }, 'usedCount', 1);
        }
        await this.stickerPackRepository.remove(pack);
    }

    async addToFavorites(userId: string, stickerFileId: string): Promise<FavoriteSticker> {
        const file = await this.fileRepository.findOneBy({ id: stickerFileId });
        if (!file) throw new Error('Sticker not found');
        if (file.type !== FileType.STICKER && file.type !== FileType.STICKER_ANIMATED) {
            throw new Error('File is not a sticker');
        }

        const existing = await this.favoriteStickerRepository.findOneBy({ userId, stickerFileId });
        if (existing) throw new Error('Sticker already in favorites');

        const maxOrder = await this.favoriteStickerRepository
            .createQueryBuilder('fav')
            .select('MAX(fav.order)', 'max')
            .where('fav.userId = :userId', { userId })
            .getRawOne();
        const newOrder = (maxOrder?.max ?? -1) + 1;

        const fav = this.favoriteStickerRepository.create({
            userId,
            stickerFileId,
            order: newOrder,
        });
        await this.favoriteStickerRepository.save(fav);
        await this.fileRepository.increment({ id: stickerFileId }, 'usedCount', 1);
        return fav;
    }

    async removeFromFavorites(userId: string, stickerFileId: string): Promise<void> {
        const fav = await this.favoriteStickerRepository.findOneBy({ userId, stickerFileId });
        if (!fav) throw new Error('Sticker not in favorites');
        await this.favoriteStickerRepository.remove(fav);
        await this.fileRepository.decrement({ id: stickerFileId }, 'usedCount', 1);
    }

    async getFavorites(userId: string): Promise<{ sticker: File; order: number }[]> {
        const favorites = await this.favoriteStickerRepository.find({
            where: { userId },
            relations: ['sticker'],
            order: { order: 'ASC' },
        });
        return favorites.map(f => ({ sticker: f.sticker, order: f.order }));
    }

    async reorderFavorites(userId: string, stickerFileIds: string[]): Promise<void> {
        for (let i = 0; i < stickerFileIds.length; i++) {
            const fav = await this.favoriteStickerRepository.findOneBy({ userId, stickerFileId: stickerFileIds[i] });
            if (fav) {
                fav.order = i;
                await this.favoriteStickerRepository.save(fav);
            }
        }
    }
}