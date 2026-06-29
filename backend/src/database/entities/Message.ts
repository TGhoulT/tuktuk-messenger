import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Chat } from './Chat';
import { User } from './User';
import { File } from './File';

export enum MessageType {
    TEXT = 'text',
    FILE = 'file',        // обычный файл (документ, изображение как файл)
    MEDIA = 'media',      // сжатое медиа (фото, видео) – для группировки
    VOICE = 'voice',
    STICKER = 'sticker',
    FORWARD = 'forward',
}

export enum MessageStatus {
    SENDING = 'sending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
}

@Entity('messages')
@Index(['chatId', 'createdAt'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    sessionId: string;

    @Column({ type: 'uuid' })
    chatId: string;

    @Column({ type: 'uuid' })
    senderId: string;

    @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
    type: MessageType;

    //DEK (зашифрованный ключ данных)
    @Column({ type: 'bytea', nullable: true })
    encryptedDek: Buffer | null;

    @Column({ type: 'bytea', nullable: true })
    dekIv: Buffer | null;

    @Column({ type: 'bytea', nullable: true })
    dekAuthTag: Buffer | null;

    // Зашифрованное содержимое сообщения
    @Column({ type: 'bytea', nullable: true })
    encryptedContent: Buffer | null;

    @Column({ type: 'bytea', nullable: true })
    contentIv: Buffer | null;

    @Column({ type: 'bytea', nullable: true })
    contentAuthTag: Buffer | null;

    // Поле для защиты от replay-атак (уникальный ID сообщения, генерируется клиентом)
    @Column({ type: 'uuid', nullable: true, unique: true })
    clientMessageId: string | null;

    @Column({ type: 'uuid', nullable: true })
    fileId: string | null;                 // ссылка на файл (если есть)

    @Column({ type: 'uuid', nullable: true })
    mediaGroupId: string | null;           // для группировки медиа (общий ID)

    @Column({ default: false })
    isMediaGroup: boolean;          // флаг, что сообщение входит в группу

    @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
    status: MessageStatus;

    @Column({ type: 'text', nullable: true })
    searchableText: string | null;

    // Поля для пересылки
    @Column({ type: 'uuid', nullable: true })
    forwardedFromMessageId: string | null; // исходное сообщение

    @Column({ type: 'uuid', nullable: true })
    forwardedFromChatId: string | null;

    @Column({ type: 'uuid', nullable: true })
    forwardedFromUserId: string | null;

    @Column({ type: 'jsonb', nullable: true })
    forwardOptions: {               // опции пересылки (скрыть имя, подпись)
        hideSender?: boolean;
        hideCaption?: boolean;
    } | null;

    // Реакции (агрегированные счётчики)
    @Column({ type: 'jsonb', default: {} })
    reactions: Record<string, number>; // например { "👍": 3, "❤️": 5 }

    // Для быстрого доступа к последним сообщениям
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Chat, chat => chat.messages, { onDelete: 'CASCADE' })
    chat: Chat;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    sender: User;

    @ManyToOne(() => File, { nullable: true })
    file: File | null;

    entities?: any[];
}