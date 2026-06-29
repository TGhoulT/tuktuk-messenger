import { Request, Response } from 'express';
import { MessageSearchService } from './message-search.service';

export class MessageSearchController {
    constructor(private messageSearchService: MessageSearchService) { }

    search = async (req: Request, res: Response) => {
        console.log(`🔍 Search request received: q="${req.query.q}", chatId="${req.query.chatId}"`);
        const userId = (req as any).user?.userId;
        console.log(`👤 User ID from token: ${userId}`);
        const { q, chatId, limit, cursor } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }

        const limitNum = limit ? parseInt(limit as string, 10) : 20;
        if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
            return res.status(400).json({ message: 'Invalid limit parameter' });
        }

        try {
            const result = await this.messageSearchService.searchMessages(
                userId,
                q,
                chatId as string,
                limitNum,
                cursor ? new Date(cursor as string) : undefined,
            );
            console.log(`✅ Search successful, found ${result.total} messages`);
            res.json(result);
        } catch (error: any) {
            console.error('❌ Search error:', error);
            res.status(500).json({ message: 'An internal server error occurred' });
        }
    };
}