import { IsEnum, IsOptional, IsString, IsUUID, IsBoolean, MinLength, MaxLength, IsArray } from 'class-validator';
import { ChatType, JoinMode } from '../../../database/entities/Chat';

export class CreateChatDto {
    @IsEnum(['dialog', 'group', 'channel'])
    type: ChatType;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    title?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    userIds?: string[]; // для group/channel: список участников

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;

    @IsOptional()
    @IsEnum(['free', 'invite', 'request'])
    joinMode?: JoinMode;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    username?: string; // для публичных каналов/групп
}