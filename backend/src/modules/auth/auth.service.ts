import { User } from '../../database/entities/User';
import { UserSettings } from '../../database/entities/UserSettings';
import { RefreshToken } from '../../database/entities/RefreshToken';
import { UserSession } from '../../database/entities/UserSession';
import { AppDataSource } from '../../database/data-source';
import { ChatService } from '../chat/chat.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../../config/env';
import crypto from 'crypto';

export class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private userSettingsRepository = AppDataSource.getRepository(UserSettings);
    private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    private userSessionRepository = AppDataSource.getRepository(UserSession);

    async register(dto: RegisterDto) {
        const existingUser = await this.userRepository.findOne({
            where: [{ email: dto.email }, { username: dto.username }],
        });
        if (existingUser) {
            throw new Error('User with this email or username already exists');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = this.userRepository.create({
            email: dto.email,
            username: dto.username,
            passwordHash,
            lastActivityAt: new Date(),
        });
        await this.userRepository.save(user);

        const defaultSettings = this.userSettingsRepository.create({
            userId: user.id,
            sessionLifetimeDays: 7,
            autoDeleteMonths: 6,
            privacy: {
                phone: 'nobody',
                lastSeen: 'everyone',
                profilePhoto: 'everyone',
                forwardMessages: 'nobody',
                calls: 'everyone',
                voiceMessages: 'everyone',
                messages: 'everyone',
                bio: 'contacts',
                favoriteMusic: 'everyone',
                invites: 'contacts',
            },
            interface: {
                themeId: null,
                bubbleRadius: 18,
                chatListStyle: 'comfortable',
                fontSize: 'medium',
                animationsEnabled: true,
                autoPlayGif: true,
                autoPlayVideo: true,
                autoDownload: { mobile: true, wifi: true, roaming: false },
            },
        });
        await this.userSettingsRepository.save(defaultSettings);

        // Создаём системные чаты (Избранное и Тук-Тук) для нового пользователя
        const chatService = new ChatService();
        await chatService.createSavedMessagesChat(user.id);
        await chatService.createSystemChat(user.id);

        const tokens = await this.generateTokens(user.id, defaultSettings.sessionLifetimeDays);
        return { user: { id: user.id, email: user.email, username: user.username }, ...tokens };
    }

    async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
        const user = await this.userRepository.findOne({
            where: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
            relations: ['settings'],
        });
        if (!user || user.isDeleted) {
            throw new Error('Invalid credentials');
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            user.failedLoginAttempts += 1;
            const maxAttempts = parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS || '5');
            if (user.failedLoginAttempts >= maxAttempts) {
                const blockMinutes = parseInt(process.env.AUTH_BLOCK_DURATION_MINUTES || '10');
                user.lockedUntil = new Date(Date.now() + blockMinutes * 60000);
            }
            await this.userRepository.save(user);
            throw new Error('Invalid credentials');
        }

        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastActivityAt = new Date();
        await this.userRepository.save(user);

        const lifetimeDays = user.settings?.sessionLifetimeDays ?? 7;
        const { accessToken, refreshToken } = await this.generateTokens(user.id, lifetimeDays, userAgent, ipAddress);

        // Создаём новую пользовательскую сессию (sessionId)
        const sessionId = crypto.randomUUID();
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setMinutes(sessionExpiresAt.getMinutes() + 60); // 60 минут
        await this.userSessionRepository.save({
            userId: user.id,
            sessionId,
            ipAddress,
            userAgent,
            expiresAt: sessionExpiresAt,
        });

        return {
            user: { id: user.id, email: user.email, username: user.username },
            accessToken,
            refreshToken,
            sessionId,
        };
    }

    async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
        const tokenEntity = await this.refreshTokenRepository.findOne({
            where: { token: refreshToken },
            relations: ['user', 'user.settings'],
        });
        if (!tokenEntity || tokenEntity.expiresAt < new Date()) {
            throw new Error('Invalid or expired refresh token');
        }

        const user = tokenEntity.user;
        if (user.isDeleted) {
            throw new Error('User is deleted');
        }

        user.lastActivityAt = new Date();
        await this.userRepository.save(user);

        const lifetimeDays = user.settings?.sessionLifetimeDays ?? 7;
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + lifetimeDays);
        tokenEntity.expiresAt = newExpiresAt;
        tokenEntity.lastUsedAt = new Date();
        if (userAgent) tokenEntity.userAgent = userAgent;
        if (ipAddress) tokenEntity.ipAddress = ipAddress;
        await this.refreshTokenRepository.save(tokenEntity);

        const accessToken = jwt.sign(
            { sub: user.id },
            config.jwt.accessSecret as Secret,
            { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
        );

        // Создаём новую сессию при refresh (старая сессия остаётся? можно удалить старые сессии этого пользователя, но лучше создать новую и вернуть)
        const sessionId = crypto.randomUUID();
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setMinutes(sessionExpiresAt.getMinutes() + 60);
        await this.userSessionRepository.save({
            userId: user.id,
            sessionId,
            ipAddress,
            userAgent,
            expiresAt: sessionExpiresAt,
        });

        return { accessToken, sessionId };
    }

    async logout(userId: string, refreshToken: string) {
        await this.refreshTokenRepository.delete({ token: refreshToken, userId });
        // Опционально: можно также удалить все сессии пользователя или конкретную сессию, но в данном случае logout удаляет только refresh-токен.
    }

    async getUserSessions(userId: string) {
        const tokens = await this.refreshTokenRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        return tokens.map(t => ({
            id: t.id,
            createdAt: t.createdAt,
            expiresAt: t.expiresAt,
            lastUsedAt: t.lastUsedAt,
            userAgent: t.userAgent,
            ipAddress: t.ipAddress,
        }));
    }

    async revokeSession(userId: string, sessionId: string) {
        await this.refreshTokenRepository.delete({ id: sessionId, userId });
    }

    private async generateTokens(userId: string, lifetimeDays: number, userAgent?: string, ipAddress?: string) {
        const accessToken = jwt.sign(
            { sub: userId },
            config.jwt.accessSecret as Secret,
            { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
        );
        const refreshToken = jwt.sign(
            { sub: userId },
            config.jwt.refreshSecret as Secret
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + lifetimeDays);

        const tokenEntity = this.refreshTokenRepository.create({
            userId,
            token: refreshToken,
            expiresAt,
            userAgent,
            ipAddress,
            lastUsedAt: new Date(),
        });
        await this.refreshTokenRepository.save(tokenEntity);

        return { accessToken, refreshToken };
    }
}