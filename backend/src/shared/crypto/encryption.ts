import crypto from 'crypto';
import { config } from '../../config/env';

const MASTER_KEY = config.masterKey;
const MASTER_SALT = config.masterSalt;

if (!MASTER_KEY || !MASTER_SALT) {
    throw new Error('MASTER_KEY and MASTER_SALT must be set in .env');
}

/**
 * Получить мастер-ключ (AES-256) на основе MASTER_KEY и MASTER_SALT через PBKDF2.
 */
export const getMasterEncryptionKey = (): Buffer => {
    return crypto.pbkdf2Sync(MASTER_KEY, MASTER_SALT, 100000, 32, 'sha256');
};

/**
 * Зашифровать данные с помощью мастер-ключа.
 * Возвращает объект { encrypted, iv, authTag }.
 */
export const encryptWithMaster = (data: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } => {
    const key = getMasterEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, authTag };
};

/**
 * Расшифровать данные мастер-ключом.
 */
export const decryptWithMaster = (encrypted: Buffer, iv: Buffer, authTag: Buffer): Buffer => {
    const key = getMasterEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

/**
 * Сгенерировать случайный ключ для файла (AES-256).
 */
export const generateFileKey = (): Buffer => {
    return crypto.randomBytes(32);
};

/**
 * Зашифровать файл с помощью переданного ключа.
 * Возвращает { encrypted, iv, authTag }.
 */
export const encryptFile = (data: Buffer, key: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, authTag };
};

/**
 * Расшифровать файл с помощью ключа.
 */
export const decryptFile = (encrypted: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

/**
 * Генерирует случайный ключ данных (DEK) для сообщения.
 */
export const generateDataKey = (): Buffer => crypto.randomBytes(32);

/**
 * Шифрует DEK с помощью ключа-обёртки (KEK).
 * @param dataKey - DEK для шифрования
 * @param kek - ключ-обёртка (например, ключ чата)
 * @returns { wrappedKey, iv, authTag }
 */
export const wrapDataKey = (dataKey: Buffer, kek: Buffer): { wrappedKey: Buffer; iv: Buffer; authTag: Buffer } => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    const wrappedKey = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { wrappedKey, iv, authTag };
};

/**
 * Расшифровывает DEK с помощью ключа-обёртки.
 */
export const unwrapDataKey = (wrappedKey: Buffer, kek: Buffer, iv: Buffer, authTag: Buffer): Buffer => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(wrappedKey), decipher.final()]);
};

/**
 * Шифрует содержимое (payload) с помощью DEK.
 * @param data - данные (Buffer)
 * @param dataKey - DEK
 * @returns { encrypted, iv, authTag }
 */
export const encryptContent = (data: Buffer, dataKey: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, authTag };
};

/**
 * Расшифровывает содержимое с помощью DEK.
 */
export const decryptContent = (encrypted: Buffer, dataKey: Buffer, iv: Buffer, authTag: Buffer): Buffer => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};