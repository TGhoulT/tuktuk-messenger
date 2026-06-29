import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('user_settings')
export class UserSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ default: 7 })
    sessionLifetimeDays: number;

    @Column({ default: 6 })
    autoDeleteMonths: number;

    @Column({ type: 'jsonb', default: {} })
    privacy: {
        phone?: 'everyone' | 'contacts' | 'nobody';
        lastSeen?: 'everyone' | 'contacts' | 'nobody';
        profilePhoto?: 'everyone' | 'contacts' | 'nobody';
        forwardMessages?: 'everyone' | 'contacts' | 'nobody';
        calls?: 'everyone' | 'contacts' | 'nobody';
        voiceMessages?: 'everyone' | 'contacts' | 'nobody';
        messages?: 'everyone' | 'contacts' | 'nobody';
        bio?: 'everyone' | 'contacts' | 'nobody';
        favoriteMusic?: 'everyone' | 'contacts' | 'nobody';
        invites?: 'everyone' | 'contacts' | 'nobody';
    };

    @Column({ type: 'jsonb', default: {} })
    interface: {
        themeId?: string | null;
        bubbleRadius?: number;
        chatListStyle?: 'compact' | 'comfortable';
        fontSize?: 'small' | 'medium' | 'large';
        animationsEnabled?: boolean;
        autoPlayGif?: boolean;
        autoPlayVideo?: boolean;
        autoDownload?: {
            mobile: boolean;
            wifi: boolean;
            roaming: boolean;
        };
    };

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
}