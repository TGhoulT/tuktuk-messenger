import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

export const themeModule = {
    controllers: [ThemeController],
    services: [ThemeService],
};

export { ThemeController, ThemeService };