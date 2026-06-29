import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { UserSettings } from './UserSettings';
import { RefreshToken } from './RefreshToken';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;

    @Column({ type: 'varchar', nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', nullable: true })
    lastName: string | null;

    @Column()
    passwordHash: string;

    @Column({ type: 'timestamp', nullable: true })
    lastActivityAt: Date;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ type: 'varchar', length: 150, nullable: true })
    bio: string | null;

    @Column({ default: false })
    isDeleted: boolean;

    @Column({ default: 0 })
    failedLoginAttempts: number;

    @Column({ type: 'timestamp', nullable: true })
    lockedUntil: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToOne(() => UserSettings, settings => settings.user, { cascade: true })
    settings: UserSettings;

    @OneToMany(() => RefreshToken, token => token.user)
    refreshTokens: RefreshToken[];
}