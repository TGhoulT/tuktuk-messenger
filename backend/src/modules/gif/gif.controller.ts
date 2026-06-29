import { Request, Response } from 'express';
import { GifService } from './gif.service';

export class GifController {
    constructor(private gifService: GifService) { }

    // Поиск GIF через Klipy
    search = async (req: Request, res: Response) => {
        const { q, limit } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }
        try {
            const results = await this.gifService.searchGifs(q, limit ? parseInt(limit as string) : 20);
            res.json(results);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    // Получить список избранных GIF пользователя
    getFavorites = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const gifs = await this.gifService.getFavoriteGifs(userId);
        res.json(gifs);
    };

    // Добавить GIF в избранное (по URL из поиска)
    addFavorite = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'GIF url is required' });
        }
        try {
            const newGif = await this.gifService.addGif(userId, url);
            res.status(201).json(newGif);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    // Удалить GIF из избранного
    removeFavorite = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { gifId } = req.params;
        try {
            await this.gifService.removeGif(userId, gifId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };
}