import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Chat } from './Chat';
import { User } from './User';

export type ParticipantRole = 'owner' | 'admin' | 'member' | 'subscriber';
export type InviteStatus = 'pending' | 'accepted' | 'rejected';

@Entity('chat_participants')
export class ChatParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    chatId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'enum', enum: ['owner', 'admin', 'member', 'subscriber'], default: 'member' })
    role: ParticipantRole;

    @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected'], default: 'accepted' })
    status: InviteStatus;

    @CreateDateColumn()
    joinedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Chat, chat => chat.participants, { onDelete: 'CASCADE' })
    chat: Chat;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
}