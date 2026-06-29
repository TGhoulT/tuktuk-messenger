import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Message } from './Message';
import { User } from './User';

@Entity('message_reactions')
@Index(['messageId', 'userId', 'reaction'], { unique: true })
export class MessageReaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    messageId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column()
    reaction: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Message, { onDelete: 'CASCADE' })
    message: Message;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
}