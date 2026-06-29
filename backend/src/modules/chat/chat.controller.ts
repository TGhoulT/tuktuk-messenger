import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class ChatController {
    constructor(private chatService: ChatService) { }

    createChat = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(CreateChatDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });

        try {
            const chat = await this.chatService.createChat(userId, dto);
            res.status(201).json(chat);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    getUserChats = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const chats = await this.chatService.getUserChats(userId);
        res.json(chats);
    };

    getChat = async (req: Request, res: Response) => {
        const { chatId } = req.params;
        const userId = (req as any).user?.userId;
        const canAccess = await this.chatService.canUserAccessChat(chatId, userId);
        if (!canAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const chat = await this.chatService.getChatById(chatId);
        res.json(chat);
    };

    addParticipants = async (req: Request, res: Response) => {
        const { chatId } = req.params;
        const requesterId = (req as any).user?.userId;
        const dto = plainToInstance(AddParticipantsDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });

        try {
            // Проверка прав (только owner/admin могут добавлять)
            const role = await this.chatService.getParticipantRole(chatId, requesterId);
            if (role !== 'owner' && role !== 'admin') {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }

            const results = [];
            for (const userId of dto.userIds) {
                results.push(await this.chatService.addParticipant(chatId, userId, 'member'));
            }
            res.json(results);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    removeParticipant = async (req: Request, res: Response) => {
        const { chatId, userId } = req.params;
        const requesterId = (req as any).user?.userId;
        try {
            await this.chatService.removeParticipant(chatId, userId, requesterId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(403).json({ message: error.message });
        }
    };
}