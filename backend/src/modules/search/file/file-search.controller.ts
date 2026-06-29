import { Request, Response } from 'express';
import { FileSearchService } from './file-search.service';

export class FileSearchController {
    constructor(private fileSearchService: FileSearchService) { }

    search = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { q, limit, cursor } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }

        const limitNum = limit ? parseInt(limit as string, 10) : 20;
        if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
            return res.status(400).json({ message: 'Invalid limit parameter' });
        }

        try {
            const result = await this.fileSearchService.searchFiles(
                userId,
                q,
                limitNum,
                cursor ? new Date(cursor as string) : undefined,
            );
            res.json(result);
        } catch (error: any) {
            console.error('File search error:', error);
            res.status(500).json({ message: 'An internal server error occurred' });
        }
    };
}