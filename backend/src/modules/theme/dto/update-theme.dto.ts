import { IsString, IsOptional, IsBoolean, IsObject, IsHexColor } from 'class-validator';

export class UpdateThemeDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsObject()
    variables?: any;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @IsOptional()
    @IsHexColor()
    previewColor?: string;

    @IsOptional()
    @IsString()
    previewEmoji?: string;
}