import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { config } from '../../../config/env';
import { AppDataSource } from '../../../database/data-source';
import { User } from '../../../database/entities/User';

const options: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.accessSecret,
};

export const JwtStrategy = new Strategy(options, async (payload, done) => {
    try {
        const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.sub });
        if (user && !user.isDeleted) {
            return done(null, { userId: user.id, email: user.email, username: user.username });
        }
        return done(null, false);
    } catch (error) {
        return done(error, false);
    }
});