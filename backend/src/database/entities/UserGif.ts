import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { File } from './File';

@Entity('user_gifs')
export class UserGif {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    fileId: string;

    @Column({ type: 'int', default: 0 })
    rank: number;           // порядок в коллекции (чем больше rank, тем «новее»)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => File, { onDelete: 'CASCADE' })
    file: File;
}