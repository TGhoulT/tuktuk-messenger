import { AppDataSource } from '../../database/data-source';
import { Chat, ChatType } from '../../database/entities/Chat';
import { ChatParticipant, ParticipantRole } from '../../database/entities/ChatParticipant';
import { Message } from '../../database/entities/Message';
import { User } from '../../database/entities/User';
import { CreateChatDto } from './dto/create-chat.dto';
import crypto from 'crypto';
import { decryptContent, getMasterEncryptionKey, unwrapDataKey } from '../../shared/crypto/encryption';
import { GatewayService } from '../gateway/gateway.service';
import { UserSettings } from '../../database/entities/UserSettings';
import { Contact } from '../../database/entities/Contact';

export class ChatService {
    private chatRepository = AppDataSource.getRepository(Chat);
    private participantRepository = AppDataSource.getRepository(ChatParticipant);
    private userRepository = AppDataSource.getRepository(User);
    private messageRepository = AppDataSource.getRepository(Message);
    private gatewayService?: GatewayService;
    private userSettingsRepository = AppDataSource.getRepository(UserSettings);
    private contactRepository = AppDataSource.getRepository(Contact);



    constructor(gatewayService?: GatewayService) {
        this.gatewayService = gatewayService;
    }

    /**
     * Создать чат (диалог, группу, канал)
     */
    async createChat(ownerId: string, dto: CreateChatDto) {
        // Для диалога проверяем, не существует ли уже
        if (dto.type === 'dialog') {
            if (!dto.userIds || dto.userIds.length !== 1) {
                throw new Error('Dialog requires exactly one other user');
            }
            const otherUserId = dto.userIds[0];
            const existing = await this.findDialogBetween(ownerId, otherUserId);
            if (existing) {
                return existing;
            }
        }

        // Создаём объект чата (без сохранения)
        const chat = this.chatRepository.create({
            type: dto.type,
            title: dto.title,
            isPrivate: dto.isPrivate ?? false,
            joinMode: dto.joinMode ?? (dto.type === 'channel' ? 'invite' : 'free'),
            username: dto.username,
        });

        // === ГЕНЕРАЦИЯ КЛЮЧА ЧАТА (AES-256) ===
        const chatKey = crypto.randomBytes(32);          // случайный ключ чата
        const masterKey = getMasterEncryptionKey();      // мастер-ключ из .env + соль
        const iv = crypto.randomBytes(12);               // инициализационный вектор
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
        const encryptedKey = Buffer.concat([cipher.update(chatKey), cipher.final()]);
        const authTag = cipher.getAuthTag();

        chat.encryptedKey = encryptedKey;
        chat.keyIv = iv;
        chat.keyAuthTag = authTag;
        // ====================================

        // Сохраняем чат в БД
        await this.chatRepository.save(chat);

        // Добавляем владельца с ролью owner
        await this.addParticipant(chat.id, ownerId, 'owner');

        // Добавляем остальных участников (если есть)
        if (dto.userIds && dto.userIds.length) {
            for (const userId of dto.userIds) {
                await this.addParticipant(chat.id, userId, 'member');
            }
        }

        // Отправляем событие new_chat всем участникам
        if (this.gatewayService) {
            const chatWithParticipants = await this.getChatById(chat.id);
            for (const participant of chatWithParticipants.participants) {
                const enrichedChat = this.enrichChatForUser(chatWithParticipants, participant.userId);
                this.gatewayService.emitToUser(participant.userId, 'new_chat', enrichedChat);
            }
        }

        // Возвращаем чат с участниками
        return this.getChatById(chat.id);
    }

    /**
     * Найти диалог между двумя пользователями
     */
    private async findDialogBetween(userId1: string, userId2: string) {
        const participants = await this.participantRepository.find({
            where: [{ userId: userId1 }, { userId: userId2 }],
            relations: ['chat'],
        });
        const chatMap = new Map<string, number>();
        for (const p of participants) {
            const chatId = p.chatId;
            chatMap.set(chatId, (chatMap.get(chatId) || 0) + 1);
        }
        for (const [chatId, count] of chatMap.entries()) {
            if (count === 2) {
                const chat = await this.chatRepository.findOne({
                    where: { id: chatId, type: 'dialog' },
                });
                if (chat) return chat;
            }
        }
        return null;
    }

    /**
     * Добавить участника в чат
     */
    async addParticipant(chatId: string, userId: string, role: ParticipantRole = 'member') {
        const chat = await this.chatRepository.findOneBy({ id: chatId });
        if (!chat) throw new Error('Chat not found');

        const existing = await this.participantRepository.findOneBy({ chatId, userId });
        if (existing) return existing;

        const participant = this.participantRepository.create({
            chatId,
            userId,
            role,
            status: 'accepted',
        });
        return await this.participantRepository.save(participant);
    }

    /**
     * Удалить участника
     */
    async removeParticipant(chatId: string, userId: string, requesterId: string) {
        const chat = await this.chatRepository.findOneBy({ id: chatId });
        if (!chat) throw new Error('Chat not found');

        const requesterRole = await this.getParticipantRole(chatId, requesterId);
        if (!requesterRole) throw new Error('You are not a participant');

        // Проверка прав: владелец или админ может удалять, кроме владельца
        const targetRole = await this.getParticipantRole(chatId, userId);
        if (!targetRole) throw new Error('User not in chat');

        if (targetRole === 'owner') {
            throw new Error('Cannot remove owner');
        }
        if (requesterRole !== 'owner' && requesterRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }

        await this.participantRepository.delete({ chatId, userId });
    }

    /**
     * Получить роль участника
     */
    async getParticipantRole(chatId: string, userId: string): Promise<ParticipantRole | null> {
        const participant = await this.participantRepository.findOneBy({ chatId, userId });
        return participant?.role ?? null;
    }

    /**
     * Проверить, имеет ли пользователь доступ к чату (участник)
     */
    async canUserAccessChat(chatId: string, userId: string): Promise<boolean> {
        const count = await this.participantRepository.countBy({ chatId, userId });
        return count > 0;
    }

    /**
     * Получить чат по ID (с участниками)
     */
    async getChatById(chatId: string) {
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
            relations: ['participants', 'participants.user'],
        });
        if (!chat) throw new Error('Chat not found');
        return chat;
    }

    async getUserChats(userId: string) {
        const participants = await this.participantRepository.find({
            where: { userId },
            relations: ['chat', 'chat.participants', 'chat.participants.user'],
            order: { chat: { updatedAt: 'DESC' } },
        });

        // Убираем дубликаты чатов
        const chatMap = new Map<string, Chat>();
        for (const p of participants) {
            if (!chatMap.has(p.chatId)) {
                chatMap.set(p.chatId, p.chat);
            }
        }
        const chats = Array.from(chatMap.values());

        // Загружаем последние сообщения одним запросом
        const chatIds = chats.map(c => c.id);
        const lastMessagesRaw = await this.messageRepository
            .createQueryBuilder('msg')
            .select([
                'msg.chatId',
                'msg.id',
                'msg.type',
                'msg.encryptedContent',
                'msg.contentIv',
                'msg.contentAuthTag',
                'msg.encryptedDek',
                'msg.dekIv',
                'msg.dekAuthTag',
                'msg.fileId',
                'msg.createdAt',
            ])
            .where('msg.chatId IN (:...chatIds)', { chatIds })
            .andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('MAX(subMsg.createdAt)')
                    .from(Message, 'subMsg')
                    .where('subMsg.chatId = msg.chatId')
                    .getQuery();
                return 'msg.createdAt = ' + subQuery;
            })
            .getMany();

        const lastMessageMap = new Map<string, Message>();
        for (const msg of lastMessagesRaw) {
            lastMessageMap.set(msg.chatId, msg);
        }

        // Подсчёт непрочитанных
        const unreadCountsRaw = await this.messageRepository
            .createQueryBuilder('msg')
            .select('msg.chatId', 'chatId')
            .addSelect('COUNT(msg.id)', 'count')
            .where('msg.chatId IN (:...chatIds)', { chatIds })
            .andWhere('msg.senderId != :userId', { userId })
            .andWhere('msg.status != :readStatus', { readStatus: 'read' })
            .groupBy('msg.chatId')
            .getRawMany();

        const unreadCountMap = new Map<string, number>();
        for (const uc of unreadCountsRaw) {
            unreadCountMap.set(uc.chatId, parseInt(uc.count, 10));
        }

        // Формируем ответ, обогащая каждый чат через единый метод (асинхронно)
        const enrichedChats = await Promise.all(
            chats.map(chat => this.enrichChatForUser(chat, userId))
        );

        return enrichedChats.map((enriched, index) => {
            let lastMessage = null;
            const rawMsg = lastMessageMap.get(enriched.id);
            if (rawMsg) {
                let text = '';
                if (rawMsg.encryptedContent && rawMsg.encryptedDek) {
                    text = this.decryptLastMessage(rawMsg, chats[index]) || '';
                } else if (rawMsg.type === 'sticker') {
                    text = 'Стикер';
                } else if (rawMsg.type === 'file' || rawMsg.type === 'media') {
                    text = 'Файл';
                }
                lastMessage = {
                    id: rawMsg.id,
                    type: rawMsg.type,
                    text,
                    createdAt: rawMsg.createdAt,
                };
            }
            return {
                ...enriched,
                lastMessage,
                unreadCount: unreadCountMap.get(enriched.id) || 0,
            };
        });
    }

    /**
     * Расшифровка текста последнего сообщения (аналог decorateMessage, но только для текста)
     */
    private decryptLastMessage(message: Message, chat: Chat): string | null {
        try {
            if (!message.encryptedContent || !message.contentIv || !message.contentAuthTag ||
                !message.encryptedDek || !message.dekIv || !message.dekAuthTag) {
                return null;
            }

            // 1. Получаем ключ чата (уже есть в объекте chat)
            const masterKey = getMasterEncryptionKey();
            const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, chat.keyIv);
            decipher.setAuthTag(chat.keyAuthTag);
            const chatKey = Buffer.concat([decipher.update(chat.encryptedKey), decipher.final()]);

            // 2. Расшифровываем DEK
            const dataKey = unwrapDataKey(message.encryptedDek, chatKey, message.dekIv, message.dekAuthTag);

            // 3. Расшифровываем содержимое
            const decryptedBuffer = decryptContent(message.encryptedContent, dataKey, message.contentIv, message.contentAuthTag);
            const payload = JSON.parse(decryptedBuffer.toString('utf8'));
            return payload.text || null;
        } catch (err) {
            console.error('Failed to decrypt last message text', err);
            return null;
        }
    }

    /**
     * Создаём ключ для системного чата
     */
    private generateChatKey(chat: Chat): void {
        const chatKey = crypto.randomBytes(32);          // случайный ключ чата
        const masterKey = getMasterEncryptionKey();      // мастер-ключ из .env + соль
        const iv = crypto.randomBytes(12);               // инициализационный вектор
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
        const encryptedKey = Buffer.concat([cipher.update(chatKey), cipher.final()]);
        const authTag = cipher.getAuthTag();

        chat.encryptedKey = encryptedKey;
        chat.keyIv = iv;
        chat.keyAuthTag = authTag;
    }

    /**
     * Создаём пользовательский чат Избранного 
     */
    async createSavedMessagesChat(userId: string): Promise<Chat> {
        // Проверяем, не существует ли уже чат "Избранное" у пользователя
        const existing = await this.chatRepository.findOne({
            where: { type: 'saved', participants: { userId } },
            relations: ['participants'],
        });
        if (existing) return existing;

        const chat = this.chatRepository.create({
            type: 'saved',
            title: 'Избранное',
            isPrivate: true,
        });
        this.generateChatKey(chat);
        await this.chatRepository.save(chat);
        await this.addParticipant(chat.id, userId, 'owner');
        return chat;
    }

    /**
     * Создаём системный чат Тук-Тук
     */
    async createSystemChat(userId: string): Promise<Chat> {
        const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
        // Проверяем, есть ли уже диалог с системным ботом
        const existing = await this.findDialogBetween(userId, SYSTEM_USER_ID);
        if (existing) return existing;

        const chat = this.chatRepository.create({
            type: 'system',
            title: 'Тук-Тук',
            isPrivate: true,
        });
        this.generateChatKey(chat);
        await this.chatRepository.save(chat);
        await this.addParticipant(chat.id, userId, 'member');
        await this.addParticipant(chat.id, SYSTEM_USER_ID, 'owner');
        return chat;
    }

    setGatewayService(gatewayService: GatewayService) {
        this.gatewayService = gatewayService;
    }

    /**
     * Обогащает объект чата данными для конкретного пользователя
     * (displayTitle, isDialog, avatarUrl, lastSeenDisplay).
     * Используется в getUserChats и при отправке new_chat.
     */
    private async enrichChatForUser(chat: Chat, viewerId: string) {
        let displayTitle = chat.title;
        let avatarUrl = chat.avatarUrl;
        let isDialog = false;
        let lastSeenDisplay: string | null = null;
        let lastActivityAt: Date | null = null;

        if (chat.type === 'dialog') {
            isDialog = true;
            const otherParticipant = chat.participants?.find(p => p.userId !== viewerId);
            if (otherParticipant?.user) {
                const targetUser = otherParticipant.user;
                const fullName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ');
                displayTitle = fullName || targetUser.username;
                avatarUrl = targetUser.avatarUrl;

                // Получаем настройки приватности целевого пользователя
                const targetSettings = await this.userSettingsRepository.findOne({
                    where: { userId: targetUser.id },
                });
                const privacy = targetSettings?.privacy || {};
                const rule = privacy.lastSeen || 'everyone';

                let canSeeExact = false;
                if (rule === 'everyone') canSeeExact = true;
                else if (rule === 'contacts') {
                    const isContact = await this.contactRepository.findOne({
                        where: { ownerId: targetUser.id, contactId: viewerId },
                    });
                    canSeeExact = !!isContact;
                }

                if (canSeeExact && targetUser.lastActivityAt) {
                    lastActivityAt = targetUser.lastActivityAt;
                    lastSeenDisplay = null; // фронт сам отформатирует
                } else if (targetUser.lastActivityAt) {
                    // Отдаём приблизительную строку
                    lastSeenDisplay = this.getApproximateLastSeen(targetUser.lastActivityAt);
                }
            }
        }

        return {
            id: chat.id,
            type: chat.type,
            title: chat.title,
            displayTitle,
            avatarUrl,
            isDialog,
            lastActivityAt,   // точное время (если разрешено) или null
            lastSeenDisplay,  // строка для показа (если точное время скрыто)
            participants: chat.participants,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        };
    }

    /**
     * Возвращает приблизительную строку "был(а) недавно", "на этой неделе" и т.д.
     */
    private getApproximateLastSeen(date: Date): string {
        const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return 'недавно';
        if (diffDays <= 7) return 'на этой неделе';
        if (diffDays <= 30) return 'в этом месяце';
        return 'давно';
    }
}