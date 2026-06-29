import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../database/data-source';
import { UserSession } from '../../database/entities/UserSession';

export const sessionGuard = async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) {
        return res.status(400).json({ message: 'X-Session-Id header required' });
    }
    const sessionRepo = AppDataSource.getRepository(UserSession);
    const session = await sessionRepo.findOne({
        where: { sessionId },
        relations: ['user'],
    });
    if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ message: 'Invalid or expired session' });
    }
    const jwtUserId = (req as any).user?.userId;
    if (session.userId !== jwtUserId) {
        return res.status(403).json({ message: 'Session does not belong to user' });
    }
    // Продлеваем сессию, если осталось меньше 15 минут
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;
    if (session.expiresAt.getTime() - now.getTime() < fifteenMinutes) {
        session.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        await sessionRepo.save(session);
    }
    (req as any).sessionId = sessionId;
    next();
};