import { AppDataSource } from '../../../database/data-source';
import { User } from '../../../database/entities/User';
import { Chat } from '../../../database/entities/Chat';
import { Contact } from '../../../database/entities/Contact';

export class SearchService {
    private userRepository = AppDataSource.getRepository(User);
    private chatRepository = AppDataSource.getRepository(Chat);
    private contactRepository = AppDataSource.getRepository(Contact);

    async searchPublic(query: string, currentUserId: string) {
        const normalizedQuery = query.trim().toLowerCase();
        const exactMatchPattern = normalizedQuery;

        // 1. Базовый поиск пользователей
        const rawUsers = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.settings', 'settings')
            .where('user.username ILIKE :query', { query: `%${normalizedQuery}%` })
            .andWhere('user.isDeleted = false')
            .andWhere('user.id != :currentUserId', { currentUserId })
            .orderBy(`CASE WHEN LOWER(user.username) = :exact THEN 1 ELSE 2 END`, 'ASC')
            .setParameter('exact', exactMatchPattern)
            .limit(20)
            .getMany();

        // 2. Фильтрация по приватности
        const users = [];
        for (const user of rawUsers) {
            const privacy = user.settings?.privacy?.messages || 'everyone';
            if (privacy === 'nobody') continue;
            if (privacy === 'contacts') {
                // Проверяем, есть ли текущий пользователь в контактах найденного
                const isContact = await this.contactRepository
                    .createQueryBuilder('contact')
                    .where('contact.ownerId = :ownerId', { ownerId: user.id })
                    .andWhere('contact.contactId = :contactId', { contactId: currentUserId })
                    .getOne();
                if (!isContact) continue;
            }
            users.push({
                type: 'user',
                id: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
            });
        }

        // Поиск чатов (без изменений)
        const chats = await this.chatRepository
            .createQueryBuilder('chat')
            .where(
                '(chat.username ILIKE :query OR chat.title ILIKE :query) AND chat.isPrivate = false',
                { query: `%${normalizedQuery}%` }
            )
            .orderBy(
                `CASE WHEN LOWER(chat.username) = :exact OR LOWER(chat.title) = :exact THEN 1 ELSE 2 END`,
                'ASC'
            )
            .setParameter('exact', exactMatchPattern)
            .limit(20)
            .getMany();

        return {
            users,
            chats: chats.map(c => ({
                type: c.type,
                id: c.id,
                title: c.title || c.username,
                username: c.username,
                avatarUrl: c.avatarUrl,
            })),
        };
    }
}