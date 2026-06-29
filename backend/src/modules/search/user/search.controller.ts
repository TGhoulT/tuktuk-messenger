import { Request, Response } from 'express';
import { SearchService } from './search.service';

export class SearchController {
    constructor(private searchService: SearchService) { }

    search = async (req: Request, res: Response) => {
        const currentUserId = (req as any).user?.userId;
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }
        const results = await this.searchService.searchPublic(q.trim(), currentUserId);
        res.json(results);
    };
}