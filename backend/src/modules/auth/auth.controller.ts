import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class AuthController {
    constructor(private authService: AuthService) { }

    register = async (req: Request, res: Response) => {
        const dto = plainToInstance(RegisterDto, req.body);
        const errors = await validate(dto);
        if (errors.length) {
            return res.status(400).json({ errors });
        }
        try {
            const result = await this.authService.register(dto);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    login = async (req: Request, res: Response) => {
        const dto = plainToInstance(LoginDto, req.body);
        const errors = await validate(dto);
        if (errors.length) {
            return res.status(400).json({ errors });
        }
        try {
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.ip || req.socket.remoteAddress;
            const result = await this.authService.login(dto, userAgent, ipAddress);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ message: error.message });
        }
    };

    refresh = async (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token required' });
        }
        try {
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.ip || req.socket.remoteAddress;
            const result = await this.authService.refresh(refreshToken, userAgent, ipAddress);
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ message: error.message });
        }
    };

    logout = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { refreshToken } = req.body;
        if (!userId || !refreshToken) {
            return res.status(400).json({ message: 'User ID and refresh token required' });
        }
        await this.authService.logout(userId, refreshToken);
        res.json({ success: true });
    };

    getSessions = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const sessions = await this.authService.getUserSessions(userId);
        res.json(sessions);
    };

    revokeSession = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { sessionId } = req.params;
        await this.authService.revokeSession(userId, sessionId);
        res.json({ success: true });
    };
}