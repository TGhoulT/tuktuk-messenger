import { IsUUID } from 'class-validator';

export class ApplyThemeDto {
    @IsUUID()
    themeId: string;
}