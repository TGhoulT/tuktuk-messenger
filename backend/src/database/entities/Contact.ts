import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    ownerId: string;        // кто добавил

    @Column({ type: 'uuid' })
    contactId: string;       // кто добавлен

    @Column({ nullable: true })
    localName: string;       // отображаемое имя в списке контактов

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    owner: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    contact: User;
}