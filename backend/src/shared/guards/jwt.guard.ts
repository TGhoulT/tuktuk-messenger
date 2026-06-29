import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

export const jwtGuard = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        (req as any).user = user;
        next();
    })(req, res, next);
};