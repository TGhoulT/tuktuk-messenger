import { Request, Response } from 'express';
import { MessageService } from './message.service';
import { SendMessageDto, ForwardMessagesDto, EditMessageDto, ReactionDto, PinMessageDto } from './dto/send-message.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class MessageController {
    constructor(private messageService: MessageService) { }

    sendMessage = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const dto = plainToInstance(SendMessageDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const message = await this.messageService.sendMessage(userId, sessionId, dto);
            res.status(201).json(message);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    getMessages = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { chatId } = req.params;
        const { cursor, limit } = req.query;
        const limitNum = limit ? parseInt(limit as string) : 50;
        try {
            const messages = await this.messageService.getMessages(chatId, userId, sessionId, cursor ? new Date(cursor as string) : undefined, limitNum);
            res.json(messages);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    editMessage = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { messageId } = req.params;
        const dto = plainToInstance(EditMessageDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const message = await this.messageService.editMessage(messageId, userId, sessionId, dto.text);
            res.json(message);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    deleteMessage = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { messageId } = req.params;
        const { forAll } = req.body;
        try {
            await this.messageService.deleteMessage(messageId, userId, sessionId, forAll !== false);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    forwardMessages = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const dto = plainToInstance(ForwardMessagesDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const messages = await this.messageService.forwardMessages(userId, sessionId, dto);
            res.json(messages);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    addReaction = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { messageId } = req.params;
        const dto = plainToInstance(ReactionDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            await this.messageService.addReaction(messageId, userId, sessionId, dto.reaction);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    removeReaction = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { messageId } = req.params;
        const { reaction } = req.body;
        try {
            await this.messageService.removeReaction(messageId, userId, sessionId, reaction);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    pinMessage = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessionId = (req as any).sessionId;
        const { messageId } = req.params;
        const dto = plainToInstance(PinMessageDto, req.body);
        try {
            await this.messageService.pinMessage(messageId, userId, sessionId, dto.forBoth);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    getMessageContext = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { chatId, messageId } = req.params;
        const { limit } = req.query;
        try {
            const messages = await this.messageService.getMessageContext(
                chatId,
                userId,
                messageId,
                limit ? parseInt(limit as string) : 15,
            );
            res.json({ messages });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };
}