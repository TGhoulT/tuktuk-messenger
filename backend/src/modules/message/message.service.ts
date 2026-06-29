import { AppDataSource } from '../../database/data-source';
import { Message, MessageStatus, MessageType } from '../../database/entities/Message';
import { MessageReaction } from '../../database/entities/MessageReaction';
import { Chat } from '../../database/entities/Chat';
import { User } from '../../database/entities/User';
import { FileType } from '../../database/entities/File';
import { ChatService } from '../chat/chat.service';
import { FileService } from '../file/file.service';
import { GatewayService } from '../gateway/gateway.service';
import { getMasterEncryptionKey } from '../../shared/crypto/encryption';
import { generateDataKey, wrapDataKey, unwrapDataKey, encryptContent, decryptContent } from '../../shared/crypto/encryption';
import crypto from 'crypto';
import { SendMessageDto, ForwardMessagesDto } from './dto/send-message.dto';
import { HiddenMessage } from '../../database/entities/HiddenMessage';

export class MessageService {
    private messageRepository = AppDataSource.getRepository(Message);
    private reactionRepository = AppDataSource.getRepository(MessageReaction);
    private chatRepository = AppDataSource.getRepository(Chat);
    private hiddenMessageRepository = AppDataSource.getRepository(HiddenMessage);
    private chatService: ChatService;
    private fileService: FileService;
    private gatewayService?: GatewayService;

    constructor(gatewayService?: GatewayService) {
        this.chatService = new ChatService();
        this.fileService = new FileService();
        this.gatewayService = gatewayService;
    }

    // ========== Отправка сообщения ==========
    async sendMessage(userId: string, sessionId: string, dto: SendMessageDto): Promise<any> {
        if (!dto.text && !dto.fileId) {
            throw new Error('Message must contain either text or a file');
        }

        // Проверка доступа
        const canAccess = await this.chatService.canUserAccessChat(dto.chatId, userId);
        if (!canAccess) throw new Error('Access denied');

        const role = await this.chatService.getParticipantRole(dto.chatId, userId);
        const chat = await this.chatRepository.findOneBy({ id: dto.chatId });
        if (chat?.type === 'channel' && role !== 'owner' && role !== 'admin') {
            throw new Error('Only admins can post in channels');
        }

        // Валидация стикера (если нужно)
        if (dto.type === MessageType.STICKER) {
            if (!dto.fileId) throw new Error('Sticker message requires fileId');
            const file = await this.fileService.getFileInfo(dto.fileId);
            if (!file) throw new Error('Sticker file not found');
            if (file.type !== FileType.STICKER && file.type !== FileType.STICKER_ANIMATED) {
                throw new Error('Invalid sticker file');
            }
        }

        // Генерация clientMessageId (защита от replay)
        const clientMessageId = dto.clientMessageId || crypto.randomUUID();
        const existing = await this.messageRepository.findOneBy({ clientMessageId });
        if (existing) {
            throw new Error('Duplicate message detected');
        }

        // Формируем payload (текст + entities + метаданные)
        const payload = {
            text: dto.text || null,
            entities: dto.entities || [],
            clientMessageId,
            timestamp: Date.now(),
        };
        const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');

        // 1. Генерируем DEK
        const dataKey = generateDataKey();

        // 2. Шифруем payload DEK
        const { encrypted: encryptedContent, iv: contentIv, authTag: contentAuthTag } = encryptContent(payloadBuffer, dataKey);

        // 3. Шифруем DEK ключом чата
        const chatKey = await this.getChatKey(dto.chatId);
        const { wrappedKey: encryptedDek, iv: dekIv, authTag: dekAuthTag } = wrapDataKey(dataKey, chatKey);

        // Создаём сообщение
        const message = new Message();
        message.chatId = dto.chatId;
        message.senderId = userId;
        message.type = dto.type;
        message.fileId = dto.fileId ?? null;
        message.mediaGroupId = dto.mediaGroupId ?? null;
        message.isMediaGroup = !!dto.mediaGroupId;
        message.forwardOptions = dto.forwardOptions ?? null;
        message.sessionId = sessionId;
        message.clientMessageId = clientMessageId;
        message.encryptedDek = encryptedDek;
        message.dekIv = dekIv;
        message.dekAuthTag = dekAuthTag;
        message.encryptedContent = encryptedContent;
        message.contentIv = contentIv;
        message.contentAuthTag = contentAuthTag;
        message.searchableText = dto.text || null;


        const chatType = chat?.type;
        if (chatType === 'saved' || chatType === 'system') {
            message.status = MessageStatus.READ;
        } else {
            message.status = MessageStatus.SENT;
        }


        await this.messageRepository.save(message);
        // Обновляем updatedAt чата, чтобы он поднимался в списке
        await this.chatRepository.update(dto.chatId, { updatedAt: new Date() });

        // Обновляем lastActivityAt
        await AppDataSource.getRepository(User).update(userId, { lastActivityAt: new Date() });

        // Увеличиваем usedCount для файла
        if (dto.fileId) {
            await this.fileService.incrementUsedCount(dto.fileId);
        }

        // Отправляем real-time уведомление
        const populatedMessage = await this.getMessageWithDetails(message.id, userId);
        if (this.gatewayService) {
            this.gatewayService.emitToChat(dto.chatId, 'new_message', populatedMessage);
        }
        return populatedMessage;
    }

    // ========== История сообщений ==========
    async getMessages(chatId: string, userId: string, sessionId: string, cursor?: Date, limit: number = 50) {
        const canAccess = await this.chatService.canUserAccessChat(chatId, userId);
        if (!canAccess) throw new Error('Access denied');

        // Получаем все скрытые ID для этого чата
        const hiddenIds = await this.hiddenMessageRepository
            .createQueryBuilder('hm')
            .select('hm.messageId')
            .where('hm.userId = :userId', { userId })
            .andWhere('EXISTS (SELECT 1 FROM messages m WHERE m.id = hm."messageId" AND m."chatId" = :chatId)', { chatId })
            .getMany()
            .then(rows => rows.map(r => r.messageId));

        const query = this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.file', 'file')
            .where('message.chatId = :chatId', { chatId })
            .orderBy('message.createdAt', 'DESC')
            .take(limit);

        if (cursor) {
            query.andWhere('message.createdAt < :cursor', { cursor });
        }

        // Фильтруем скрытые сообщения
        if (hiddenIds.length > 0) {
            query.andWhere('message.id NOT IN (:...hiddenIds)', { hiddenIds });
        }

        const messages = await query.getMany();
        // const messages = await query
        //     .leftJoinAndSelect('message.sender', 'sender')
        //     .leftJoinAndSelect('message.file', 'file')
        //     .getMany();
        const result = [];
        for (const msg of messages) {
            result.push(await this.decorateMessage(msg, userId));
        }

        const nextCursor = result.length === limit ? result[result.length - 1]?.createdAt : null;

        return { messages: result, nextCursor };
    }

    // ========== Редактирование сообщения ==========
    async editMessage(messageId: string, userId: string, sessionId: string, newText: string): Promise<any> {
        // Проверяем, не скрыто ли сообщение для пользователя
        const hidden = await this.hiddenMessageRepository.findOne({
            where: { userId, messageId },
        });
        if (hidden) throw new Error('Message not found or hidden');

        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['chat'],
        });
        if (!message) throw new Error('Message not found');
        if (message.senderId !== userId) throw new Error('You can only edit your own messages');

        // Расшифровываем старый payload, чтобы получить entities
        const oldPayload = await this.decryptMessagePayload(message);
        const newPayload = {
            text: newText,
            entities: oldPayload.entities || [],
            clientMessageId: message.clientMessageId,
            timestamp: Date.now(),
        };
        const newPayloadBuffer = Buffer.from(JSON.stringify(newPayload), 'utf8');

        // Генерируем новый DEK
        const dataKey = generateDataKey();
        const { encrypted: encryptedContent, iv: contentIv, authTag: contentAuthTag } = encryptContent(newPayloadBuffer, dataKey);
        const chatKey = await this.getChatKey(message.chatId);
        const { wrappedKey: encryptedDek, iv: dekIv, authTag: dekAuthTag } = wrapDataKey(dataKey, chatKey);

        // Обновляем поля
        message.encryptedDek = encryptedDek;
        message.dekIv = dekIv;
        message.dekAuthTag = dekAuthTag;
        message.encryptedContent = encryptedContent;
        message.contentIv = contentIv;
        message.contentAuthTag = contentAuthTag;

        message.searchableText = newText || null;

        await this.messageRepository.save(message);

        const updatedMessage = await this.getMessageWithDetails(message.id, userId);
        if (this.gatewayService) {
            this.gatewayService.emitToChat(message.chatId, 'message_edited', updatedMessage);
        }
        return updatedMessage;
    }

    // ========== Удаление сообщения ==========
    async deleteMessage(messageId: string, userId: string, sessionId: string, forAll: boolean = true): Promise<void> {
        const message = await this.messageRepository.findOne({ where: { id: messageId }, relations: ['chat'] });
        if (!message) throw new Error('Message not found');

        // Проверка прав
        const role = await this.chatService.getParticipantRole(message.chatId, userId);
        const isOwner = message.senderId === userId;
        const chat = await this.chatRepository.findOneBy({ id: message.chatId });
        const canDelete = isOwner || role === 'owner' || role === 'admin' || chat?.type === 'dialog';
        if (!canDelete) throw new Error('Access denied');

        if (forAll) {
            // Удаляем физически для всех
            if (message.fileId) {
                await this.fileService.decrementUsedCount(message.fileId);
            }
            await this.messageRepository.remove(message);
            // Оповещаем всех участников чата
            if (this.gatewayService) {
                this.gatewayService.emitToChat(message.chatId, 'message_deleted', { messageId, forAll: true });
            }
        } else {
            // Удаляем только для себя
            const existing = await this.hiddenMessageRepository.findOne({ where: { userId, messageId } });
            if (!existing) {
                await this.hiddenMessageRepository.save({ userId, messageId });
            }
            // Оповещаем только текущего пользователя
            if (this.gatewayService) {
                this.gatewayService.emitToUser(userId, 'message_deleted', { messageId, forAll: false });
            }
        }
    }

    // ========== Пересылка сообщений ==========
    async forwardMessages(userId: string, sessionId: string, dto: ForwardMessagesDto): Promise<any[]> {
        const forwardedMessages: any[] = [];
        for (const targetChatId of dto.targetChatIds) {
            for (const messageId of dto.messageIds) {
                // Проверяем, не скрыто ли сообщение для пользователя
                const hidden = await this.hiddenMessageRepository.findOne({
                    where: { userId, messageId },
                });
                if (hidden) continue; // пропускаем скрытое сообщение

                const original = await this.messageRepository.findOne({
                    where: { id: messageId },
                    relations: ['chat', 'file'],
                });
                if (!original) continue;

                const canRead = await this.chatService.canUserAccessChat(original.chatId, userId);
                const canWrite = await this.chatService.canUserAccessChat(targetChatId, userId);
                if (!canRead || !canWrite) continue;

                // Расшифровываем payload исходного сообщения
                let payload = { text: null, entities: [] };
                if (original.encryptedContent && original.contentIv && original.contentAuthTag &&
                    original.encryptedDek && original.dekIv && original.dekAuthTag) {
                    const decrypted = await this.decryptMessagePayload(original);
                    payload = { text: decrypted.text, entities: decrypted.entities || [] };
                }

                const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');

                // Генерируем новый DEK для целевого чата
                const dataKey = generateDataKey();
                const { encrypted: encryptedContent, iv: contentIv, authTag: contentAuthTag } = encryptContent(payloadBuffer, dataKey);
                const chatKey = await this.getChatKey(targetChatId);
                const { wrappedKey: encryptedDek, iv: dekIv, authTag: dekAuthTag } = wrapDataKey(dataKey, chatKey);

                const newMessage = new Message();
                newMessage.chatId = targetChatId;
                newMessage.senderId = userId;
                newMessage.type = original.type;
                newMessage.fileId = original.fileId;
                newMessage.mediaGroupId = original.mediaGroupId;
                newMessage.isMediaGroup = original.isMediaGroup;
                newMessage.forwardedFromMessageId = original.id;
                newMessage.forwardedFromChatId = original.chatId;
                newMessage.forwardedFromUserId = original.senderId;
                newMessage.forwardOptions = dto.options ?? null;
                newMessage.sessionId = sessionId;
                newMessage.clientMessageId = crypto.randomUUID();
                newMessage.encryptedDek = encryptedDek;
                newMessage.dekIv = dekIv;
                newMessage.dekAuthTag = dekAuthTag;
                newMessage.encryptedContent = encryptedContent;
                newMessage.contentIv = contentIv;
                newMessage.contentAuthTag = contentAuthTag;

                await this.messageRepository.save(newMessage);

                if (original.fileId) {
                    await this.fileService.incrementUsedCount(original.fileId);
                }

                const populated = await this.getMessageWithDetails(newMessage.id, userId);
                forwardedMessages.push(populated);
                if (this.gatewayService) {
                    this.gatewayService.emitToChat(targetChatId, 'new_message', populated);
                }
            }
        }
        return forwardedMessages;
    }

    // ========== Реакции ==========
    async addReaction(messageId: string, userId: string, sessionId: string, reaction: string): Promise<void> {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) throw new Error('Message not found');

        const canAccess = await this.chatService.canUserAccessChat(message.chatId, userId);
        if (!canAccess) throw new Error('Access denied');

        const chat = await this.chatRepository.findOneBy({ id: message.chatId });
        const isChannel = chat?.type === 'channel';

        if (isChannel) {
            const reactions = message.reactions || {};
            reactions[reaction] = (reactions[reaction] || 0) + 1;
            await this.messageRepository.update(messageId, { reactions });
        } else {
            const existing = await this.reactionRepository.findOneBy({ messageId, userId, reaction });
            if (existing) return;
            const newReaction = this.reactionRepository.create({ messageId, userId, reaction });
            await this.reactionRepository.save(newReaction);
            const reactions = message.reactions || {};
            reactions[reaction] = (reactions[reaction] || 0) + 1;
            await this.messageRepository.update(messageId, { reactions });
        }

        if (this.gatewayService) {
            this.gatewayService.emitToChat(message.chatId, 'reaction', { messageId, userId, reaction, action: 'add' });
        }
    }

    async removeReaction(messageId: string, userId: string, sessionId: string, reaction: string): Promise<void> {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) throw new Error('Message not found');

        const chat = await this.chatRepository.findOneBy({ id: message.chatId });
        const isChannel = chat?.type === 'channel';

        if (isChannel) {
            const reactions = message.reactions || {};
            if (reactions[reaction] > 0) {
                reactions[reaction]--;
                if (reactions[reaction] === 0) delete reactions[reaction];
                await this.messageRepository.update(messageId, { reactions });
            }
        } else {
            await this.reactionRepository.delete({ messageId, userId, reaction });
            const reactions = message.reactions || {};
            if (reactions[reaction] > 0) reactions[reaction]--;
            if (reactions[reaction] === 0) delete reactions[reaction];
            await this.messageRepository.update(messageId, { reactions });
        }

        if (this.gatewayService) {
            this.gatewayService.emitToChat(message.chatId, 'reaction', { messageId, userId, reaction, action: 'remove' });
        }
    }

    // ========== Закрепление ==========
    async pinMessage(messageId: string, userId: string, sessionId: string, forBoth: boolean = false): Promise<void> {
        const message = await this.messageRepository.findOne({ where: { id: messageId }, relations: ['chat'] });
        if (!message) throw new Error('Message not found');

        const role = await this.chatService.getParticipantRole(message.chatId, userId);
        const chat = message.chat;
        const canPin = role === 'owner' || role === 'admin' || (chat.type === 'dialog');

        if (!canPin) throw new Error('Access denied');

        if (chat.type === 'dialog' && forBoth) {
            await this.chatRepository.update(message.chatId, { pinnedMessageId: messageId });
        } else {
            await this.chatRepository.update(message.chatId, { pinnedMessageId: messageId });
        }

        if (this.gatewayService) {
            this.gatewayService.emitToChat(message.chatId, 'message_pinned', { messageId, pinnedBy: userId });
        }
    }

    async getMessageContext(
        chatId: string,
        userId: string,
        targetMessageId: string,
        limit: number = 5,
    ) {
        const canAccess = await this.chatService.canUserAccessChat(chatId, userId);
        if (!canAccess) throw new Error('Access denied');

        // Проверяем, не скрыто ли целевое сообщение для пользователя
        const hiddenTarget = await this.hiddenMessageRepository.findOne({
            where: { userId, messageId: targetMessageId },
        });
        if (hiddenTarget) throw new Error('Message not found or hidden');

        const target = await this.messageRepository.findOne({
            where: { id: targetMessageId, chatId },
            relations: ['sender', 'file'],
        });
        if (!target) throw new Error('Message not found');

        const targetCreatedAt = target.createdAt;
        const chatKey = await this.getChatKey(chatId);

        const [older, newer] = await Promise.all([
            this.messageRepository
                .createQueryBuilder('message')
                .leftJoinAndSelect('message.sender', 'sender')
                .leftJoinAndSelect('message.file', 'file')
                .where('message.chatId = :chatId', { chatId })
                .andWhere('message.createdAt < :cursor', { cursor: targetCreatedAt })
                .andWhere('NOT EXISTS (SELECT 1 FROM hidden_messages hm WHERE hm."messageId" = message.id AND hm."userId" = :userId)', { userId })
                .orderBy('message.createdAt', 'DESC')
                .take(limit)
                .getMany(),
            this.messageRepository
                .createQueryBuilder('message')
                .leftJoinAndSelect('message.sender', 'sender')
                .leftJoinAndSelect('message.file', 'file')
                .where('message.chatId = :chatId', { chatId })
                .andWhere('message.createdAt > :cursor', { cursor: targetCreatedAt })
                .andWhere('NOT EXISTS (SELECT 1 FROM hidden_messages hm WHERE hm."messageId" = message.id AND hm."userId" = :userId)', { userId })
                .orderBy('message.createdAt', 'ASC')
                .take(limit)
                .getMany(),
        ]);

        const contextMessages = [
            ...older.reverse(),
            target,
            ...newer,
        ];

        const decorated = await Promise.all(
            contextMessages.map(msg => this.decorateMessageWithKey(msg, chatKey, userId))
        );

        return decorated;
    }

    // ========== Вспомогательные методы ==========

    private async decorateMessageWithKey(message: Message, chatKey: Buffer, userId: string): Promise<any> {
        let text = null;
        let entities = [];
        if (message.encryptedContent && message.contentIv && message.contentAuthTag &&
            message.encryptedDek && message.dekIv && message.dekAuthTag) {
            try {
                const dataKey = unwrapDataKey(message.encryptedDek, chatKey, message.dekIv, message.dekAuthTag);
                const decryptedBuffer = decryptContent(message.encryptedContent, dataKey, message.contentIv, message.contentAuthTag);
                const payload = JSON.parse(decryptedBuffer.toString('utf8'));
                text = payload.text;
                entities = payload.entities || [];
            } catch (err) {
                console.error('Failed to decrypt message', err);
            }
        }

        let forwardInfo = null;
        if (message.forwardedFromMessageId) {
            const original = await this.messageRepository.findOne({
                where: { id: message.forwardedFromMessageId },
                relations: ['sender'],
            });
            if (original) {
                forwardInfo = {
                    fromUserId: original.senderId,
                    fromUsername: original.sender.username,
                    fromChatId: message.forwardedFromChatId,
                    hideSender: message.forwardOptions?.hideSender,
                    hideCaption: message.forwardOptions?.hideCaption,
                };
            }
        }

        return {
            id: message.id,
            clientMessageId: message.clientMessageId,
            chatId: message.chatId,
            sender: { id: message.sender.id, username: message.sender.username },
            type: message.type,
            text,
            entities,
            file: message.file ? { id: message.file.id, url: `/file/${message.file.id}`, mimeType: message.file.mimeType } : null,
            mediaGroupId: message.mediaGroupId,
            isMediaGroup: message.isMediaGroup,
            forwardInfo,
            reactions: message.reactions,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            status: message.status,
        };
    }

    private async getChatKey(chatId: string): Promise<Buffer> {
        const chat = await this.chatRepository.findOneBy({ id: chatId });
        if (!chat || !chat.encryptedKey) throw new Error('Chat key not found');
        const masterKey = getMasterEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, chat.keyIv);
        decipher.setAuthTag(chat.keyAuthTag);
        const key = Buffer.concat([decipher.update(chat.encryptedKey), decipher.final()]);
        return key;
    }

    private async decryptMessagePayload(message: Message): Promise<any> {
        if (!message.encryptedContent || !message.contentIv || !message.contentAuthTag ||
            !message.encryptedDek || !message.dekIv || !message.dekAuthTag) {
            return { text: null, entities: [] };
        }
        // 1. Расшифровываем DEK
        const chatKey = await this.getChatKey(message.chatId);
        const dataKey = unwrapDataKey(message.encryptedDek, chatKey, message.dekIv, message.dekAuthTag);
        // 2. Расшифровываем содержимое
        const decryptedBuffer = decryptContent(message.encryptedContent, dataKey, message.contentIv, message.contentAuthTag);
        const payload = JSON.parse(decryptedBuffer.toString('utf8'));
        return payload;
    }

    private async decorateMessage(message: Message, userId: string): Promise<any> {
        let text = null;
        let entities = [];
        if (message.encryptedContent && message.contentIv && message.contentAuthTag &&
            message.encryptedDek && message.dekIv && message.dekAuthTag) {
            try {
                const payload = await this.decryptMessagePayload(message);
                text = payload.text;
                entities = payload.entities || [];
            } catch (err) {
                console.error('Failed to decrypt message', err);
            }
        }

        let forwardInfo = null;
        if (message.forwardedFromMessageId) {
            const original = await this.messageRepository.findOne({
                where: { id: message.forwardedFromMessageId },
                relations: ['sender'],
            });
            if (original) {
                forwardInfo = {
                    fromUserId: original.senderId,
                    fromUsername: original.sender.username,
                    fromChatId: message.forwardedFromChatId,
                    hideSender: message.forwardOptions?.hideSender,
                    hideCaption: message.forwardOptions?.hideCaption,
                };
            }
        }

        return {
            id: message.id,
            chatId: message.chatId,
            sender: { id: message.sender.id, username: message.sender.username },
            type: message.type,
            text,
            entities,
            file: message.file ? { id: message.file.id, url: `/file/${message.file.id}`, mimeType: message.file.mimeType } : null,
            mediaGroupId: message.mediaGroupId,
            isMediaGroup: message.isMediaGroup,
            forwardInfo,
            reactions: message.reactions,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            status: message.status,
        };
    }

    private async getMessageWithDetails(messageId: string, userId: string): Promise<any> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['sender', 'file'],
        });
        if (!message) throw new Error('Message not found');
        return this.decorateMessage(message, userId);
    }
}