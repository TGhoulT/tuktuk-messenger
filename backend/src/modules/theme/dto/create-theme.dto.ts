import { IsString, IsOptional, IsBoolean, IsObject, IsHexColor } from 'class-validator';

export class CreateThemeDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsObject()
    variables: any;

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