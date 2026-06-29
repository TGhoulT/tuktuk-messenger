import { AppDataSource } from '../../database/data-source';
import { File, FileType } from '../../database/entities/File';
import { getMasterEncryptionKey, generateFileKey, encryptFile } from '../../shared/crypto/encryption';
import { ChatService } from '../chat/chat.service';
import sharp from 'sharp';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import waveform from '@uku/audio-waveform-node';
import { promisify } from 'util';

const MAX_FILE_SIZE = 100 * 1024 * 1024;       // 100 MB
const MAX_VOICE_SIZE = 50 * 1024 * 1024;       // 50 MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const getWaveform = promisify(waveform.getWaveForm);

export class FileService {
    private fileRepository = AppDataSource.getRepository(File);
    private chatService: ChatService;

    constructor() {
        this.chatService = new ChatService();
    }

    async uploadFile(
        userId: string,
        fileBuffer: Buffer,
        originalName: string,
        mimeType: string,
        dto: { type: FileType; chatId?: string; sendAsDocument?: boolean; mediaGroupId?: string }
    ): Promise<File> {
        // 1. Общая проверка размера
        const isVoice = dto.type === FileType.VOICE;
        const maxSize = isVoice ? MAX_VOICE_SIZE : MAX_FILE_SIZE;
        if (fileBuffer.length > maxSize) {
            throw new Error(`File too large. Max ${maxSize / 1024 / 1024} MB`);
        }

        // 2. Валидация голосовых сообщений
        if (isVoice) {
            const ext = originalName.split('.').pop()?.toLowerCase();
            if (!ext || !['ogg', 'opus', 'mp3', 'm4a'].includes(ext)) {
                throw new Error('Voice message must be .OGG (OPUS), .MP3, or .M4A format');
            }
            if (!['audio/ogg', 'audio/mpeg', 'audio/mp4'].includes(mimeType)) {
                throw new Error('Invalid MIME type for voice message');
            }
        }

        // 3. Валидация стикеров (оставляем как было)
        if (dto.type === FileType.STICKER) {
            const isWebp = originalName.toLowerCase().endsWith('.webp');
            const isPng = originalName.toLowerCase().endsWith('.png');
            if (!isWebp && !isPng) throw new Error('Static sticker must be .WEBP or .PNG');
            if (mimeType !== 'image/webp' && mimeType !== 'image/png') {
                throw new Error('Invalid MIME type for static sticker');
            }
            const metadata = await sharp(fileBuffer).metadata();
            if (metadata.width !== metadata.height || metadata.width !== 512) {
                throw new Error('Static sticker must be a 512x512 square');
            }
            if (fileBuffer.length > 512 * 1024) {
                throw new Error('Static sticker size must be ≤ 512 KB');
            }
        } else if (dto.type === FileType.STICKER_ANIMATED) {
            if (!originalName.toLowerCase().endsWith('.tgs')) {
                throw new Error('Animated sticker must be .TGS file');
            }
            if (fileBuffer[0] !== 0x1F || fileBuffer[1] !== 0x8B) {
                throw new Error('Invalid .TGS file: not a valid gzip archive');
            }
            if (fileBuffer.length > 64 * 1024) {
                throw new Error('Animated sticker size must be ≤ 64 KB');
            }
        }

        // 4. Проверка доступа к чату (если указан)
        if (dto.chatId) {
            const canAccess = await this.chatService.canUserAccessChat(dto.chatId, userId);
            if (!canAccess) throw new Error('You are not a member of this chat');
        }

        const fileId = crypto.randomUUID();
        const storagePath = path.join(UPLOAD_DIR, fileId);

        // 5. Шифрование содержимого файла
        const fileKey = generateFileKey();
        const { encrypted: encryptedFile, iv: fileIv, authTag: fileAuthTag } = encryptFile(fileBuffer, fileKey);
        fs.writeFileSync(storagePath, encryptedFile);

        // 6. Шифрование ключа файла мастер-ключом
        const masterKey = getMasterEncryptionKey();
        const keyIv = crypto.randomBytes(12);
        const keyCipher = crypto.createCipheriv('aes-256-gcm', masterKey, keyIv);
        const encryptedKey = Buffer.concat([keyCipher.update(fileKey), keyCipher.final()]);
        const keyAuthTag = keyCipher.getAuthTag();

        // 7. Формируем метаданные
        let metadata: any = {};

        if (isVoice) {
            try {
                // 7a. Получаем длительность
                const duration = await this.getAudioDuration(fileBuffer);
                metadata.duration = duration;

                // 7b. Генерируем waveform (5-битный массив, как в Telegram)
                const waveformBuffer = await this.generateWaveform(fileBuffer);
                metadata.waveform = waveformBuffer.toString('base64');
            } catch (err) {
                console.error('Voice metadata extraction failed:', err);
                // Не прерываем загрузку, просто без метаданных
            }
        }

        // 8. Сохраняем запись в БД
        const file = this.fileRepository.create({
            id: fileId,
            originalName,
            mimeType,
            size: fileBuffer.length,
            type: dto.type,
            sendAsDocument: dto.sendAsDocument || false,
            ownerId: userId,
            chatId: dto.chatId,
            localPath: storagePath,
            encryptedKey: encryptedKey,
            keyIv: keyIv,
            keyAuthTag: keyAuthTag,
            iv: fileIv,
            authTag: fileAuthTag,
            usedCount: 0,
            metadata: metadata,
        });
        await this.fileRepository.save(file);

        // 9. Генерация превью для изображений (если нужно)
        if (!dto.sendAsDocument && (dto.type === FileType.IMAGE || dto.type === FileType.AVATAR)) {
            try {
                const thumbnail = await this.generateThumbnail(fileBuffer, mimeType);
                if (thumbnail) {
                    const thumbFileId = crypto.randomUUID();
                    const thumbPath = path.join(UPLOAD_DIR, thumbFileId);
                    fs.writeFileSync(thumbPath, thumbnail);
                    file.thumbnailId = thumbFileId;
                    await this.fileRepository.save(file);
                }
            } catch (err) {
                console.warn('Thumbnail generation failed', err);
            }
        }

        return file;
    }

    // ========== Вспомогательные методы для голосовых ==========

    private async getAudioDuration(fileBuffer: Buffer): Promise<number> {
        const tempPath = path.join(UPLOAD_DIR, `temp_${crypto.randomUUID()}.ogg`);
        fs.writeFileSync(tempPath, fileBuffer);
        try {
            const duration = await new Promise<number>((resolve, reject) => {
                ffmpeg.ffprobe(tempPath, (err, metadata) => {
                    if (err) reject(err);
                    else resolve(metadata.format.duration || 0);
                });
            });
            return Math.round(duration);
        } finally {
            fs.unlinkSync(tempPath);
        }
    }

    private async generateWaveform(fileBuffer: Buffer): Promise<Buffer> {
        const tempPath = path.join(UPLOAD_DIR, `temp_${crypto.randomUUID()}.ogg`);
        fs.writeFileSync(tempPath, fileBuffer);
        try {
            // Получаем peaks (массив амплитуд)
            const peaks: number[] = await getWaveform(tempPath, { pixelPerSecond: 50 });
            // Нормализуем в диапазон 0..31 (5 бит)
            const maxPeak = peaks.reduce((max, p) => Math.max(max, Math.abs(p)), 0);
            const normalized = peaks.map(p => {
                let norm = Math.abs(p) / maxPeak;
                norm = Math.min(1, Math.max(0, norm));
                return Math.round(norm * 31);
            });
            // Упаковываем в 5‑битный буфер
            return this.encode5Bit(normalized);
        } finally {
            fs.unlinkSync(tempPath);
        }
    }

    private encode5Bit(peaks: number[]): Buffer {
        const result: number[] = [];
        for (let i = 0; i < peaks.length; i += 2) {
            const b1 = peaks[i] & 0x1F;
            const b2 = peaks[i + 1] !== undefined ? (peaks[i + 1] & 0x1F) : 0;
            result.push((b1 << 3) | (b2 >> 2));
            result.push(((b2 & 0x03) << 6) | 0);
        }
        return Buffer.from(result);
    }

    // ========== Остальные методы (без изменений) ==========

    async getFileStream(fileId: string, userId: string): Promise<{ stream: Readable; mimeType: string; size: number }> {
        const file = await this.fileRepository.findOne({
            where: { id: fileId },
            relations: ['chat'],
        });
        if (!file) throw new Error('File not found');

        if (file.chatId) {
            const canAccess = await this.chatService.canUserAccessChat(file.chatId, userId);
            if (!canAccess) throw new Error('Access denied');
        } else if (file.type === FileType.AVATAR) {
            if (file.ownerId !== userId) throw new Error('Access denied');
        } else {
            if (file.ownerId !== userId) throw new Error('Access denied');
        }

        const masterKey = getMasterEncryptionKey();
        const decipherKey = crypto.createDecipheriv('aes-256-gcm', masterKey, file.keyIv);
        decipherKey.setAuthTag(file.keyAuthTag);
        const fileKey = Buffer.concat([decipherKey.update(file.encryptedKey), decipherKey.final()]);

        const encryptedData = fs.readFileSync(file.localPath);
        const decipher = crypto.createDecipheriv('aes-256-gcm', fileKey, file.iv);
        decipher.setAuthTag(file.authTag);
        const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        const stream = Readable.from(decryptedData);
        return { stream, mimeType: file.mimeType, size: file.size };
    }

    async getThumbnailStream(fileId: string, userId: string): Promise<{ stream: Readable; mimeType: string }> {
        const file = await this.fileRepository.findOne({ where: { id: fileId }, relations: ['chat'] });
        if (!file) throw new Error('File not found');
        if (!file.thumbnailId) throw new Error('Thumbnail not found');

        if (file.chatId) {
            const canAccess = await this.chatService.canUserAccessChat(file.chatId, userId);
            if (!canAccess) throw new Error('Access denied');
        } else if (file.type === FileType.AVATAR) {
            if (file.ownerId !== userId) throw new Error('Access denied');
        } else {
            if (file.ownerId !== userId) throw new Error('Access denied');
        }

        const thumbPath = path.join(UPLOAD_DIR, file.thumbnailId);
        if (!fs.existsSync(thumbPath)) throw new Error('Thumbnail file not found');
        const stream = fs.createReadStream(thumbPath);
        return { stream, mimeType: 'image/jpeg' };
    }

    async deleteFile(fileId: string, userId: string): Promise<void> {
        const file = await this.fileRepository.findOne({ where: { id: fileId } });
        if (!file) throw new Error('File not found');
        if (file.ownerId !== userId) throw new Error('Access denied');

        if (file.usedCount > 1) {
            file.usedCount--;
            await this.fileRepository.save(file);
            return;
        }

        if (fs.existsSync(file.localPath)) fs.unlinkSync(file.localPath);
        if (file.thumbnailId) {
            const thumbPath = path.join(UPLOAD_DIR, file.thumbnailId);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
        await this.fileRepository.remove(file);
    }

    async getFileInfo(fileId: string): Promise<File | null> {
        return this.fileRepository.findOneBy({ id: fileId });
    }

    private async generateThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
        try {
            if (mimeType.startsWith('image/')) {
                return await sharp(buffer).resize(200, 200, { fit: 'cover' }).toBuffer();
            }
            return null;
        } catch {
            return null;
        }
    }

    async incrementUsedCount(fileId: string): Promise<void> {
        await this.fileRepository.increment({ id: fileId }, 'usedCount', 1);
    }

    async decrementUsedCount(fileId: string): Promise<void> {
        const file = await this.fileRepository.findOneBy({ id: fileId });
        if (file && file.usedCount > 0) {
            await this.fileRepository.decrement({ id: fileId }, 'usedCount', 1);
        }
    }
}