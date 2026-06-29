import { IsUUID, IsOptional, IsString, IsEnum, IsNumber, IsObject, IsBoolean, MaxLength, ValidateIf, IsNotEmpty, IsArray, ValidateNested } from 'class-validator'; import { Type } from 'class-transformer';
import { MessageType } from '../../../database/entities/Message';

class MessageEntityDto {
    @IsString()
    type: string;

    @IsNumber()
    offset: number;

    @IsNumber()
    length: number;

    @IsOptional()
    @IsString()
    url?: string;

    @IsOptional()
    @IsString()
    language?: string;
}

export class SendMessageDto {
    @IsUUID()
    chatId: string;

    @IsEnum(MessageType)
    type: MessageType;

    @IsOptional()
    @IsString()
    @MaxLength(4096)
    @ValidateIf(o => !o.fileId)
    @IsNotEmpty({ message: 'Either text or fileId must be provided' })
    text?: string;

    @IsOptional()
    @IsUUID()
    @ValidateIf(o => !o.text)
    @IsNotEmpty({ message: 'Either text or fileId must be provided' })
    fileId?: string;

    @IsOptional()
    @IsUUID()
    mediaGroupId?: string;

    @IsOptional()
    @IsObject()
    forwardOptions?: {
        hideSender?: boolean;
        hideCaption?: boolean;
    };

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageEntityDto)
    entities?: MessageEntityDto[];

    @IsOptional()
    @IsUUID()
    clientMessageId?: string;
}

export class ForwardMessagesDto {
    @IsArray()
    @IsUUID(undefined, { each: true })
    messageIds: string[];

    @IsArray()
    @IsUUID(undefined, { each: true })
    targetChatIds: string[];

    @IsOptional()
    @IsObject()
    options?: {
        hideSender?: boolean;
        hideCaption?: boolean;
    };
}

export class EditMessageDto {
    @IsString()
    @MaxLength(4096)
    text: string;
}

export class ReactionDto {
    @IsString()
    reaction: string;
}

export class PinMessageDto {
    @IsBoolean()
    forBoth?: boolean; // закрепить для обоих (в диалоге)
}