import { Server, Socket } from 'socket.io';
import * as http from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { ChatService } from '../chat/chat.service';
import { AppDataSource } from '../../database/data-source';
import { User } from '../../database/entities/User';
import { Message, MessageStatus } from '../../database/entities/Message';

export class GatewayService {
    private io: Server;
    private chatService: ChatService;
    private onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

    constructor(server: http.Server, chatService: ChatService) {
        this.chatService = chatService;
        this.io = new Server(server, { cors: { origin: "http://localhost:5173", credentials: true } });
        this.io.use((socket, next) => this.authenticate(socket, next));
        this.io.on('connection', this.handleConnection.bind(this));
    }

    private authenticate(socket: Socket, next: (err?: Error) => void) {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decoded = jwt.verify(token, config.jwt.accessSecret);
            socket.data.userId = (decoded as any).sub;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    }

    private async handleConnection(socket: Socket) {
        const userId = socket.data.userId;
        console.log(`User ${userId} connected`);
        socket.join(userId);

        if (!this.onlineUsers.has(userId)) {
            this.onlineUsers.set(userId, new Set());
        }
        this.onlineUsers.get(userId)!.add(socket.id);

        // Оповещаем все чаты, что пользователь онлайн
        const chats = await this.chatService.getUserChats(userId);
        for (const chat of chats) {
            socket.join(`chat:${chat.id}`);
            socket.to(`chat:${chat.id}`).emit('user_online', { userId });
        }

        // Пинг (возврат на вкладку)
        socket.on('ping_online', async () => {
            // Обновляем время последней активности
            await AppDataSource.getRepository(User).update(userId, { lastActivityAt: new Date() });
        });

        // Явный уход (вкладка неактивна)
        socket.on('went_offline', () => {
            this.removeUserOnline(userId, socket.id);
        });

        // Отметка о прочтении
        socket.on('mark_read', async (data: { chatId: string }) => {
            const chatId = data.chatId;
            const readerId = userId;
            try {
                const messageRepo = AppDataSource.getRepository(Message);
                const messagesToUpdate = await messageRepo
                    .createQueryBuilder('message')
                    .where('message.chatId = :chatId', { chatId })
                    .andWhere('message.senderId != :readerId', { readerId })
                    .andWhere('message.status != :readStatus', { readStatus: MessageStatus.READ })
                    .getMany();

                if (messagesToUpdate.length > 0) {
                    await messageRepo.update(
                        messagesToUpdate.map(m => m.id),
                        { status: MessageStatus.READ }
                    );
                    this.io.to(`chat:${chatId}`).emit('chat_read', {
                        chatId,
                        readBy: readerId,
                    });
                }
            } catch (err) {
                console.error('Error marking messages as read:', err);
            }
        });

        // Печатает
        socket.on('typing', (data: { chatId: string }) => {
            socket.to(`chat:${data.chatId}`).emit('user_typing', { userId, chatId: data.chatId });
        });

        socket.on('stop_typing', (data: { chatId: string }) => {
            socket.to(`chat:${data.chatId}`).emit('user_typing_stop', { userId, chatId: data.chatId });
        });

        // Выбирает стикер
        socket.on('choosing_sticker', (data: { chatId: string }) => {
            socket.to(`chat:${data.chatId}`).emit('user_choosing_sticker', { userId, chatId: data.chatId });
        });

        socket.on('join_chat', (data: { chatId: string }) => {
            socket.join(`chat:${data.chatId}`);
            console.log(`User ${userId} joined chat room ${data.chatId}`);
        });

        socket.on('get_online_status', (data: { userId: string }) => {
            const isOnline = this.onlineUsers.has(data.userId);
            socket.emit('user_online_status', { userId: data.userId, online: isOnline });
        });


        socket.on('disconnect', () => {
            console.log(`User ${userId} socket disconnected`);
            this.removeUserOnline(userId, socket.id);
        });
    }

    private removeUserOnline(userId: string, socketId: string) {
        const sockets = this.onlineUsers.get(userId);
        if (sockets) {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.onlineUsers.delete(userId);
                // Оповещаем все чаты, что пользователь оффлайн
                this.chatService.getUserChats(userId).then(chats => {
                    for (const chat of chats) {
                        this.io.to(`chat:${chat.id}`).emit('user_offline', { userId });
                    }
                });
            }
        }
    }

    emitToChat(chatId: string, event: string, data: any) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }

    emitToUser(userId: string, event: string, data: any) {
        this.io.to(userId).emit(event, data);
    }
}