import { Request, Response } from 'express';
import { StickerService } from './sticker.service';
import stickerImportQueue from '../../queues/sticker-import.queue';
import { plainToInstance } from 'class-transformer';
import { IsString, IsArray, IsUUID } from 'class-validator';
import { validate } from 'class-validator';

class CreatePackDto {
    @IsString()
    name: string;
    @IsString()
    title: string;
}

class AddStickerDto {
    @IsUUID()
    stickerFileId: string;
}

class ReorderFavoritesDto {
    @IsArray()
    @IsUUID(undefined, { each: true })
    stickerFileIds: string[];
}

export class StickerController {
    constructor(private stickerService: StickerService) { }

    importStickerPack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }

        const match = url.match(/t\.me\/addstickers\/([a-zA-Z0-9_]+)/);
        if (!match) {
            return res.status(400).json({ message: 'Invalid sticker pack link' });
        }
        const shortName = match[1];

        // Проверяем через сервис, не импортирован ли уже
        const existing = await this.stickerService.findImportedBySourceShortName(shortName);
        if (existing) {
            return res.status(409).json({ message: 'Sticker pack already imported' });
        }

        const job = await stickerImportQueue.add({ shortName, userId });
        res.status(202).json({ jobId: job.id, status: 'queued', message: 'Import started' });
    };

    getImportStatus = async (req: Request, res: Response) => {
        const { jobId } = req.params;
        const job = await stickerImportQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        const state = await job.getState();
        const progress = job.progress();
        const result = job.returnvalue;
        res.json({ jobId, state, progress, result });
    };

    createPack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(CreatePackDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const pack = await this.stickerService.createPack(userId, dto.name, dto.title);
            res.status(201).json(pack);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };

    addStickerToPack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { packId } = req.params;
        const dto = plainToInstance(AddStickerDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const pack = await this.stickerService.addStickerToPack(packId, userId, dto.stickerFileId);
            res.json(pack);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };

    getUserPacks = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const packs = await this.stickerService.getUserPacks(userId);
        res.json(packs);
    };

    deletePack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { packId } = req.params;
        try {
            await this.stickerService.deletePack(packId, userId);
            res.json({ success: true });
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };

    addFavorite = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(AddStickerDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const fav = await this.stickerService.addToFavorites(userId, dto.stickerFileId);
            res.status(201).json(fav);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };

    removeFavorite = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { stickerFileId } = req.params;
        try {
            await this.stickerService.removeFromFavorites(userId, stickerFileId);
            res.json({ success: true });
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };

    getFavorites = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const favorites = await this.stickerService.getFavorites(userId);
        res.json(favorites);
    };

    reorderFavorites = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(ReorderFavoritesDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            await this.stickerService.reorderFavorites(userId, dto.stickerFileIds);
            res.json({ success: true });
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    };
}