import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sticker_packs')
export class StickerPack {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    sourceShortName: string;

    @Column()
    title: string;

    @Column({ type: 'uuid', nullable: true })
    authorId: string;

    @Column({ type: 'jsonb', default: [] })
    stickerIds: string[]; // массив fileId

    @Column({ nullable: true })
    thumbnailId: string;

    @Column({ default: false })
    isSystem: boolean;

    @CreateDateColumn()
    createdAt: Date;

}