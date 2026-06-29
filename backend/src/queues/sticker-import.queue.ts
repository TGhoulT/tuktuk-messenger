import Queue from 'bull';
import { AppDataSource } from '../database/data-source';
import { StickerPack } from '../database/entities/StickerPack';
import { File, FileType } from '../database/entities/File';
import { FileService } from '../modules/file/file.service';
import axios from 'axios';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

const stickerImportQueue = new Queue('sticker import', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

stickerImportQueue.process(5, async (job) => {
    try {
        const { shortName, userId } = job.data;
        console.log(`[Import] Starting import of sticker pack "${shortName}" for user ${userId}`);

        const packRepo = AppDataSource.getRepository(StickerPack);
        const existing = await packRepo.findOneBy({ sourceShortName: shortName });
        if (existing) {
            throw new Error(`Sticker pack "${shortName}" already imported`);
        }

        const getSetUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getStickerSet?name=${shortName}`;
        const setResponse = await axios.get(getSetUrl);
        if (!setResponse.data.ok) {
            throw new Error(`Telegram API error: ${setResponse.data.description}`);
        }
        const stickerSet = setResponse.data.result;

        const newPack = packRepo.create({
            name: shortName,
            sourceShortName: shortName,
            title: stickerSet.title,
            authorId: userId,
            stickerIds: [],
            isSystem: false,
        });
        await packRepo.save(newPack);

        const fileService = new FileService();
        const stickerIds: string[] = [];

        for (const sticker of stickerSet.stickers) {
            const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${sticker.file_id}`;
            const fileInfo = await axios.get(getFileUrl);
            if (!fileInfo.data.ok) {
                throw new Error(`Failed to get file info for sticker: ${sticker.file_id}`);
            }
            const filePath = fileInfo.data.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
            const fileBuffer = await axios.get(downloadUrl, { responseType: 'arraybuffer' })
                .then(res => Buffer.from(res.data));

            const ext = filePath.split('.').pop() || 'webp';
            const originalName = `${shortName}_${crypto.randomUUID()}.${ext}`;
            const mimeType = sticker.is_animated ? 'application/x-tgsticker' : 'image/webp';
            const fileType = sticker.is_animated ? FileType.STICKER_ANIMATED : FileType.STICKER;

            const uploadedFile = await fileService.uploadFile(
                userId,
                fileBuffer,
                originalName,
                mimeType,
                { type: fileType, sendAsDocument: false }
            );
            stickerIds.push(uploadedFile.id);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        newPack.stickerIds = stickerIds;
        if (stickerIds.length > 0) {
            newPack.thumbnailId = stickerIds[0];
        }
        await packRepo.save(newPack);

        console.log(`[Import] Successfully imported pack "${shortName}" (${stickerIds.length} stickers)`);
        return { packId: newPack.id, stickerCount: stickerIds.length };
    } catch (error) {
        console.error('[Import] Job failed:', error);
        throw error;
    }
});

export default stickerImportQueue;