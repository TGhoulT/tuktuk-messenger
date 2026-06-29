import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Chat } from './Chat';

export enum FileType {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    DOCUMENT = 'document',
    STICKER = 'sticker',
    STICKER_ANIMATED = 'sticker_animated',
    VOICE = 'voice',
    AVATAR = 'avatar',
}

@Entity('files')
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    originalName: string;

    @Column()
    mimeType: string;

    @Column()
    size: number;

    @Column({ type: 'enum', enum: FileType })
    type: FileType;

    @Column({ default: false })
    sendAsDocument: boolean; 	// true – без сжатия (как файл)

    @Column({ nullable: true })
    thumbnailId: string;		// ссылка на файл-превью (если есть)

    @Column({ type: 'jsonb', default: {} })
    metadata: {			        // длительность, размеры, кодек и т.д.
        duration?: number;
        width?: number;
        height?: number;
        codec?: string;
    };

    @Column({ type: 'uuid', nullable: true })
    ownerId: string;		// кто загрузил (пользователь)

    @Column({ type: 'uuid', nullable: true })
    chatId: string;		// чат, к которому привязан (если не аватар)

    @Column({ nullable: true })
    localPath: string;		// путь к файлу на диске

    @Column({ type: 'bytea', nullable: true }) // зашифрованный ключ
    encryptedKey: Buffer;

    @Column({ type: 'bytea', nullable: true })
    iv: Buffer; // IV для шифрования содержимого файла

    @Column({ type: 'bytea', nullable: true })
    authTag: Buffer;

    @Column({ type: 'bytea', nullable: true }) // IV для ключа
    keyIv: Buffer;

    @Column({ type: 'bytea', nullable: true })
    keyAuthTag: Buffer; // аутентификационный тег для зашифрованного ключа файла

    @Column({ default: 0 })
    usedCount: number; // количество ссылок (в сообщениях, наборах, избранном)

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User)
    owner: User;

    @ManyToOne(() => Chat)
    chat: Chat;
}