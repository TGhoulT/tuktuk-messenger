import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

export const config = {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'mindedness',
        password: process.env.DB_PASSWORD || 'JigNFe-di6hNZ0C!',
        name: process.env.DB_NAME || 'tuk-tuk',
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    auth: {
        maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS || '5'),
        blockDurationMinutes: parseInt(process.env.AUTH_BLOCK_DURATION_MINUTES || '10'),
        blockEscalation: process.env.AUTH_BLOCK_ESCALATION === 'true',
    },
    masterKey: process.env.MASTER_KEY,
    masterSalt: process.env.MASTER_SALT,
    defaultSessionLifetimeDays: parseInt(process.env.DEFAULT_SESSION_LIFETIME_DAYS || '7'),
    maxSessionLifetimeDays: parseInt(process.env.MAX_SESSION_LIFETIME_DAYS || '365'),
};