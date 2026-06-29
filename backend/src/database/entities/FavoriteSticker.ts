import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { File } from './File';

@Entity('favorite_stickers')
export class FavoriteSticker {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    stickerFileId: string;    // ссылка на файл стикера

    @Column({ default: 0 })
    order: number;            // порядок в списке (0 – самый верх)

    @CreateDateColumn()
    addedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => File, { onDelete: 'CASCADE' })
    sticker: File;
}