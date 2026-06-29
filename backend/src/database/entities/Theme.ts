import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

export enum ThemeType {
    SYSTEM = 'system',   // предустановленная системная тема
    CUSTOM = 'custom',   // пользовательская тема
    IMPORTED = 'imported' // импортированная из файла
}

@Entity('themes')
export class Theme {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'enum', enum: ThemeType, default: ThemeType.CUSTOM })
    type: ThemeType;

    @Column({ type: 'uuid', nullable: true })
    authorId: string;

    @Column({ type: 'jsonb', default: {} })
    variables: {
        // Цветовая схема (основные цвета)
        primaryColor?: string;
        secondaryColor?: string;
        backgroundColor?: string;
        surfaceColor?: string;
        errorColor?: string;
        successColor?: string;
        warningColor?: string;

        // Текстовые цвета
        textColor?: string;
        textSecondaryColor?: string;
        textHintColor?: string;

        // Цвета интерфейса
        headerBackground?: string;
        headerTextColor?: string;
        chatBackground?: string;
        chatBubbleIncoming?: string;
        chatBubbleOutgoing?: string;
        chatTextIncoming?: string;
        chatTextOutgoing?: string;

        // Дополнительные стили
        borderRadius?: number;
        buttonRadius?: number;
        fontSize?: 'small' | 'medium' | 'large';
        fontFamily?: string;

        // Эффекты
        useGlassmorphism?: boolean;
        blurIntensity?: number;      // от 0 до 20px
        opacity?: number;             // от 0 до 1

        // Паттерн фона (URL или base64)
        backgroundPattern?: string;
        patternOpacity?: number;
    };

    @Column({ nullable: true, type: 'varchar' })
    thumbnailUrl: string | null;

    @Column({ nullable: true })
    previewColor: string; // например, "#901515"

    @Column({ nullable: true })
    previewEmoji: string; // например, "🎨"

    @Column({ default: false })
    isPublic: boolean;

    @Column({ default: 0 })
    usageCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, { nullable: true })
    author: User;
}