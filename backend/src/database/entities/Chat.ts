import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatParticipant } from './ChatParticipant';
import { Message } from './Message';

export type ChatType = 'dialog' | 'group' | 'channel' | 'saved' | 'system';
export type JoinMode = 'free' | 'invite' | 'request';

@Entity('chats')
export class Chat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ['dialog', 'group', 'channel', 'saved', 'system'], default: 'dialog' })
    type: ChatType;

    @Column({ nullable: true })
    title: string;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ default: false })
    isPrivate: boolean; // для групп/каналов: true = закрытый

    @Column({ type: 'enum', enum: ['free', 'invite', 'request'], nullable: true })
    joinMode: JoinMode;

    @Column({ nullable: true, unique: true })
    username: string; // для публичных каналов/групп

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => ChatParticipant, participant => participant.chat)
    participants: ChatParticipant[];

    @OneToMany(() => Message, message => message.chat)
    messages: Message[];

    @Column({ type: 'uuid', nullable: true })
    pinnedMessageId: string;

    @Column({ type: 'bytea', nullable: true })
    encryptedKey: Buffer; // зашифрованный ключ чата

    @Column({ type: 'bytea', nullable: true })
    keyIv: Buffer;

    @Column({ type: 'bytea', nullable: true })
    keyAuthTag: Buffer;
}