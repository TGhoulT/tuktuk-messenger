import { Request, Response } from 'express';
import { ThemeService } from './theme.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { ApplyThemeDto } from './dto/apply-theme.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class ThemeController {
    constructor(private themeService: ThemeService) { }

    getThemes = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const themes = await this.themeService.getUserThemes(userId);
        res.json(themes);
    };

    getSystemThemes = async (req: Request, res: Response) => {
        const themes = await this.themeService.getSystemThemes();
        res.json(themes);
    };

    createTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(CreateThemeDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });

        try {
            const theme = await this.themeService.createTheme(
                userId,
                dto.name,
                dto.variables,
                dto.isPublic,
                dto.previewColor,
                dto.previewEmoji,
            );
            res.status(201).json(theme);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    updateTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { themeId } = req.params;
        const dto = plainToInstance(UpdateThemeDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });

        try {
            const theme = await this.themeService.updateTheme(themeId, userId, dto);
            res.json(theme);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    deleteTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { themeId } = req.params;

        try {
            await this.themeService.deleteTheme(themeId, userId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    applyTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(ApplyThemeDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });

        try {
            await this.themeService.applyTheme(userId, dto.themeId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    importTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            const theme = await this.themeService.importThemeFromFile(
                userId,
                req.file.buffer,
                req.file.originalname,
            );
            res.status(201).json(theme);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    exportTheme = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { themeId } = req.params;
        try {
            const filePath = await this.themeService.exportTheme(themeId, userId);
            res.download(filePath, `${themeId}.tdesktop-theme`);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };
}