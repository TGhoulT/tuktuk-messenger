import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('favorite_tracks')
export class FavoriteTrack {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column()
    trackName: string;        // Название трека

    @Column({ nullable: true })
    artistName: string;       // Имя исполнителя

    @Column({ default: 0 })
    order: number;            // Порядок в списке (0 = первый трек)

    @CreateDateColumn()
    addedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
}