import { IsEnum, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { FileType } from '../../../database/entities/File';

export class UploadFileDto {
    @IsEnum(FileType)
    type: FileType;

    @IsOptional()
    @IsUUID()
    chatId?: string;      // для файлов, привязанных к чату

    @IsOptional()
    @IsBoolean()
    sendAsDocument?: boolean; // для медиа: true – без сжатия

    @IsOptional()
    @IsUUID()
    mediaGroupId?: string;    // если файл отправляется как часть альбома
}