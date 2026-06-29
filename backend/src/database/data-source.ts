import { DataSource } from 'typeorm';
import { config } from '../config/env';
import { User } from './entities/User';
import { UserSettings } from './entities/UserSettings';
import { RefreshToken } from './entities/RefreshToken';
import { Chat } from './entities/Chat';
import { ChatParticipant } from './entities/ChatParticipant';
import { Contact } from './entities/Contact';
import { Message } from './entities/Message';
import { MessageReaction } from './entities/MessageReaction';
import { File } from './entities/File';
import { StickerPack } from './entities/StickerPack';
import { FavoriteSticker } from './entities/FavoriteSticker';
import { FavoriteTrack } from './entities/FavoriteTrack';
import { UserGif } from './entities/UserGif';
import { Theme } from './entities/Theme';
import { UserSession } from './entities/UserSession';
import { Draft } from './entities/Draft';
import { HiddenMessage } from './entities/HiddenMessage';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    synchronize: false,
    logging: config.nodeEnv === 'development',
    entities: [User, UserSettings, RefreshToken, UserSession, Chat, ChatParticipant, Contact, Message, MessageReaction, File, StickerPack, FavoriteSticker, FavoriteTrack, UserGif, Theme, Draft, HiddenMessage],
    migrations: ['src/database/migrations/*.ts'],
    subscribers: [],
});