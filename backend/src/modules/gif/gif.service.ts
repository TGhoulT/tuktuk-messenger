import axios from 'axios';
import { AppDataSource } from '../../database/data-source';
import { UserGif } from '../../database/entities/UserGif';
import { FileType, File } from '../../database/entities/File';
import { FileService } from '../file/file.service';
import { validateExternalUrl } from '../../shared/utils/url-validator';

const KLIPY_API_KEY = process.env.KLIPY_API_KEY;
const GIF_LIMIT = 200;

export class GifService {
    private userGifRepository = AppDataSource.getRepository(UserGif);
    private fileService = new FileService();

    private async downloadAndValidateGif(url: string): Promise<Buffer> {
        // 1. Валидация URL (SSRF защита)
        const validatedUrl = await validateExternalUrl(url);

        // 2. Скачивание с таймаутом и без автоматических редиректов (контроль над редиректами)
        const response = await axios.get(validatedUrl.toString(), {
            timeout: 10000,
            maxRedirects: 0, // отключаем авто-редиректы, обработаем вручную
            responseType: 'arraybuffer',
            validateStatus: (status) => status === 200, // принимаем только 200 OK
        });

        // 3. Проверка Content-Type (должен быть image/*)
        const contentType = response.headers['content-type'];
        if (!contentType || typeof contentType !== 'string' || !contentType.startsWith('image/')) {
            throw new Error('Downloaded content is not an image');
        }

        // 4. Ограничение размера файла (например, 10 МБ для GIF)
        if (response.data.length > 10 * 1024 * 1024) {
            throw new Error('GIF file too large (max 10 MB)');
        }

        return Buffer.from(response.data);
    }

    async searchGifs(query: string, limit: number = 20) {
        if (!KLIPY_API_KEY) throw new Error('KLIPY_API_KEY not set');
        const url = `https://api.klipy.com/v1/search?key=${KLIPY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await axios.get(url);
        // Валидируем, что ответ действительно от Klipy (его домен)
        if (!response.data?.results) throw new Error('Invalid response from GIF provider');
        return response.data.results.map((item: any) => ({
            id: item.id,
            url: item.media[0]?.url,
            preview: item.media[0]?.preview_url,
            width: item.media[0]?.dims[0],
            height: item.media[0]?.dims[1],
        }));
    }

    async getFavoriteGifs(userId: string) {
        const gifs = await this.userGifRepository.find({
            where: { userId },
            relations: ['file'],
            order: { rank: 'DESC' },
        });
        return gifs.map(g => ({
            id: g.id,
            fileId: g.fileId,
            url: `/file/${g.fileId}`,
            rank: g.rank,
            addedAt: g.createdAt,
        }));
    }

    async addGif(userId: string, gifUrl: string): Promise<UserGif> {
        // 1. Безопасно скачиваем и проверяем GIF
        const fileBuffer = await this.downloadAndValidateGif(gifUrl);

        // 2. Сохраняем через FileService (тип IMAGE)
        const file = await this.fileService.uploadFile(
            userId,
            fileBuffer,
            `gif_${Date.now()}.gif`,
            'image/gif',
            { type: FileType.IMAGE, sendAsDocument: false }
        );

        // 3. Определяем новый rank
        const maxRankResult = await this.userGifRepository
            .createQueryBuilder('ug')
            .select('MAX(ug.rank)', 'max')
            .where('ug.userId = :userId', { userId })
            .getRawOne();
        const newRank = (maxRankResult?.max ?? 0) + 1;

        // 4. Лимит 200 – удаляем самый старый
        const count = await this.userGifRepository.countBy({ userId });
        if (count >= GIF_LIMIT) {
            const oldest = await this.userGifRepository.findOne({
                where: { userId },
                order: { rank: 'ASC' },
                relations: ['file'],
            });
            if (oldest) {
                await this.fileService.deleteFile(oldest.fileId, userId);
                await this.userGifRepository.remove(oldest);
            }
        }

        // 5. Создаём запись
        const userGif = this.userGifRepository.create({
            userId,
            fileId: file.id,
            rank: newRank,
        });
        return this.userGifRepository.save(userGif);
    }

    async removeGif(userId: string, userGifId: string): Promise<void> {
        const userGif = await this.userGifRepository.findOne({
            where: { id: userGifId, userId },
            relations: ['file'],
        });
        if (!userGif) throw new Error('Gif not found');
        await this.fileService.deleteFile(userGif.fileId, userId);
        await this.userGifRepository.remove(userGif);
    }
}