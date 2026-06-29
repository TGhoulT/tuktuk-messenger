import { AppDataSource } from '../../database/data-source';
import { Theme, ThemeType } from '../../database/entities/Theme';
import { UserSettings } from '../../database/entities/UserSettings';
import { FileService } from '../file/file.service';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export class ThemeService {
    private themeRepository = AppDataSource.getRepository(Theme);
    private userSettingsRepository = AppDataSource.getRepository(UserSettings);
    private fileService = new FileService();

    // Получение системных тем
    async getSystemThemes(): Promise<Theme[]> {
        return this.themeRepository.find({
            where: { type: ThemeType.SYSTEM, isPublic: true },
            order: { usageCount: 'DESC' },
        });
    }

    // Получение пользовательских тем (свои + публичные)
    async getUserThemes(userId: string): Promise<Theme[]> {
        return this.themeRepository.find({
            where: [
                { authorId: userId, type: ThemeType.CUSTOM },
                { isPublic: true, type: ThemeType.CUSTOM },
                { type: ThemeType.SYSTEM }
            ],
            order: { usageCount: 'DESC' },
        });
    }

    // Создание пользовательской темы
    async createTheme(userId: string, name: string, variables: any, isPublic: boolean = false, previewColor?: string, previewEmoji?: string): Promise<Theme> {
        const thumbnailUrl = await this.generateThemePreview(variables, previewColor, previewEmoji);
        const theme = this.themeRepository.create({
            name,
            authorId: userId,
            variables,
            type: ThemeType.CUSTOM,
            isPublic,
            previewColor,
            previewEmoji,
            thumbnailUrl,
        });
        return this.themeRepository.save(theme);
    }

    // Обновление темы
    async updateTheme(themeId: string, userId: string, updates: any): Promise<Theme> {
        const theme = await this.themeRepository.findOneBy({ id: themeId });
        if (!theme) throw new Error('Theme not found');
        if (theme.authorId !== userId) throw new Error('Access denied');

        Object.assign(theme, updates);
        return this.themeRepository.save(theme);
    }

    // Удаление темы
    async deleteTheme(themeId: string, userId: string): Promise<void> {
        const theme = await this.themeRepository.findOneBy({ id: themeId });
        if (!theme) throw new Error('Theme not found');
        if (theme.authorId !== userId && theme.type !== ThemeType.SYSTEM) {
            throw new Error('Access denied');
        }
        await this.themeRepository.remove(theme);
    }

    // Импорт темы из файла
    async importThemeFromFile(userId: string, fileBuffer: Buffer, fileName: string): Promise<Theme> {
        let variables;
        const ext = fileName.split('.').pop()?.toLowerCase();

        if (ext === 'json') {
            variables = JSON.parse(fileBuffer.toString());
        } else if (ext === 'tdesktop-theme') {
            variables = await this.parseTDesktopTheme(fileBuffer);
        } else {
            throw new Error('Unsupported theme file format');
        }

        await this.validateThemeVariables(variables);

        // Определяем previewColor и previewEmoji
        const previewColor = variables.backgroundColor || variables.primaryColor || '#cccccc';
        const previewEmoji = '📁'; // можно позже улучшить – извлекать из имени файла
        const thumbnailUrl = await this.generateThemePreview(variables, previewColor, previewEmoji);

        const theme = this.themeRepository.create({
            name: path.basename(fileName, `.${ext}`),
            authorId: userId,
            variables,
            type: ThemeType.IMPORTED,
            thumbnailUrl,
            isPublic: false,
            previewColor,
            previewEmoji,
        });

        return this.themeRepository.save(theme);
    }

    // Применение темы пользователем
    async applyTheme(userId: string, themeId: string): Promise<void> {
        const theme = await this.themeRepository.findOneBy({ id: themeId });
        if (!theme) throw new Error('Theme not found');

        let settings = await this.userSettingsRepository.findOne({ where: { userId } });
        if (!settings) {
            settings = this.userSettingsRepository.create({ userId });
        }

        settings.interface = {
            ...settings.interface,
            themeId,
        };

        await this.userSettingsRepository.save(settings);

        // Увеличиваем счётчик использования темы
        theme.usageCount += 1;
        await this.themeRepository.save(theme);
    }

    // Валидация переменных темы
    private async validateThemeVariables(variables: any): Promise<void> {
        const allowedKeys = [
            'primaryColor', 'secondaryColor', 'backgroundColor', 'surfaceColor',
            'textColor', 'textSecondaryColor', 'textHintColor',
            'headerBackground', 'headerTextColor', 'chatBackground',
            'chatBubbleIncoming', 'chatBubbleOutgoing', 'chatTextIncoming', 'chatTextOutgoing',
            'borderRadius', 'buttonRadius', 'fontSize', 'fontFamily',
            'useGlassmorphism', 'blurIntensity', 'opacity',
            'backgroundPattern', 'patternOpacity'
        ];

        for (const key of Object.keys(variables)) {
            if (!allowedKeys.includes(key)) {
                throw new Error(`Unknown theme variable: ${key}`);
            }
        }

        // Валидация цветов
        const colorKeys = allowedKeys.filter(k => k.endsWith('Color'));
        for (const key of colorKeys) {
            if (variables[key] && !/^#[0-9A-Fa-f]{6}$/.test(variables[key])) {
                throw new Error(`Invalid color format for ${key}`);
            }
        }

        // Валидация числовых значений
        if (variables.borderRadius !== undefined && (variables.borderRadius < 0 || variables.borderRadius > 50)) {
            throw new Error('Border radius must be between 0 and 50');
        }
        if (variables.blurIntensity !== undefined && (variables.blurIntensity < 0 || variables.blurIntensity > 20)) {
            throw new Error('Blur intensity must be between 0 and 20');
        }
        if (variables.opacity !== undefined && (variables.opacity < 0 || variables.opacity > 1)) {
            throw new Error('Opacity must be between 0 and 1');
        }
    }

    // Парсинг .tdesktop-theme файла
    private async parseTDesktopTheme(buffer: Buffer): Promise<any> {
        // TODO: Реализация парсинга формата Telegram Desktop Theme
        // Это бинарный формат с RLE-сжатием
        // Для начала можно использовать простой JSON-формат
        const content = buffer.toString('utf8');
        const lines = content.split(/\r?\n/);
        const raw: Record<string, string> = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;
            const key = trimmed.substring(0, colonIndex).trim();
            let value = trimmed.substring(colonIndex + 1).trim();
            if (value.endsWith(';')) value = value.slice(0, -1);
            raw[key] = value;
        }

        // Маппинг ключей Telegram Desktop -> наша схема
        const mapped: any = {};
        if (raw.windowBg) mapped.backgroundColor = raw.windowBg;
        if (raw.windowFg) mapped.textColor = raw.windowFg;
        if (raw.historyBg) mapped.chatBackground = raw.historyBg;
        if (raw.msgInBg) mapped.chatBubbleIncoming = raw.msgInBg;
        if (raw.msgOutBg) mapped.chatBubbleOutgoing = raw.msgOutBg;
        if (raw.msgInTextFg) mapped.chatTextIncoming = raw.msgInTextFg;
        if (raw.msgOutTextFg) mapped.chatTextOutgoing = raw.msgOutTextFg;
        if (raw.topBarBg) mapped.headerBackground = raw.topBarBg;
        // ... добавьте другие поля по аналогии

        // По умолчанию glassmorphism выключен
        mapped.useGlassmorphism = false;
        mapped.blurIntensity = 10;
        mapped.opacity = 0.8;
        return mapped;
    }

    // Генерация превью темы
    private async generateThemePreview(variables: any, previewColor?: string, previewEmoji?: string): Promise<string | null> {
        const bgColor = previewColor || variables.primaryColor || variables.backgroundColor || '#cccccc';
        const emoji = previewEmoji || '🎨';

        const svg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="${bgColor}" />
            <text x="100" y="120" font-size="80" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        </svg>
    `;

        const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
        const uploadDir = path.join(process.cwd(), 'uploads', 'themes');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const fileName = `theme_preview_${Date.now()}.png`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, imageBuffer);
        return `/uploads/themes/${fileName}`;
    }

    async exportTheme(themeId: string, userId: string): Promise<string> {
        const theme = await this.themeRepository.findOneBy({ id: themeId });
        if (!theme) throw new Error('Theme not found');
        if (theme.authorId !== userId && !theme.isPublic) throw new Error('Access denied');

        // Преобразуем variables в формат .tdesktop-theme
        const lines: string[] = [];
        for (const [key, value] of Object.entries(theme.variables)) {
            // Преобразование ключей (например, primaryColor -> windowBg)
            const tdesktopKey = this.mapToTDesktopKey(key);
            if (tdesktopKey && value) {
                lines.push(`${tdesktopKey}: ${value};`);
            }
        }
        const content = lines.join('\n');
        const filePath = path.join(process.cwd(), 'uploads', 'themes', `export_${theme.id}.tdesktop-theme`);
        fs.writeFileSync(filePath, content);
        return filePath;
    }

    private mapToTDesktopKey(key: string): string | null {
        const mapping: Record<string, string> = {
            backgroundColor: 'windowBg',
            textColor: 'windowFg',
            chatBackground: 'historyBg',
            chatBubbleIncoming: 'msgInBg',
            chatBubbleOutgoing: 'msgOutBg',
            chatTextIncoming: 'msgInTextFg',
            chatTextOutgoing: 'msgOutTextFg',
            headerBackground: 'topBarBg',
            // добавьте другие соответствия
        };
        return mapping[key] || null;
    }
}