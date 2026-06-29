import { AppDataSource } from '../../../database/data-source';
import { Message } from '../../../database/entities/Message';

export class MessageSearchService {
    private messageRepository = AppDataSource.getRepository(Message);

    async searchMessages(
        userId: string,
        query: string,
        chatId?: string,
        limit: number = 20,
        cursor?: Date,
    ) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return { messages: [], total: 0 };

        // Группируем условия поиска в скобки, чтобы AND chatId применялся корректно
        const qb = this.messageRepository
            .createQueryBuilder('message')
            .innerJoin('message.chat', 'chat')
            .innerJoin('chat.participants', 'participant', 'participant.userId = :userId', { userId })
            .where(
                `(to_tsvector('russian', COALESCE(message."searchableText", '')) @@ plainto_tsquery('russian', :query) OR message."searchableText" ILIKE :likeQuery)`,
                { query: cleanQuery, likeQuery: `%${cleanQuery}%` },
            );

        if (chatId) {
            qb.andWhere('message.chatId = :chatId', { chatId });
        }
        if (cursor) {
            qb.andWhere('message.createdAt < :cursor', { cursor });
        }

        // Явная сортировка от новых к старым
        qb.orderBy('message.createdAt', 'DESC').take(limit);

        const messages = await qb.getMany();

        const result = messages.map(msg => ({
            id: msg.id,
            chatId: msg.chatId,
            text: msg.searchableText,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
        }));

        return {
            messages: result,
            total: result.length,
            nextCursor: result.length === limit ? result[result.length - 1].createdAt : null,
        };
    }
}