import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { AuthController, AuthService } from './modules/auth/auth.module';
import { UserController, UserService } from './modules/user/user.module';
import { ChatController, ChatService } from './modules/chat/chat.module';
import { FileController, FileService } from './modules/file/file.module';
import { StickerController, StickerService } from './modules/sticker/sticker.module';
import { SearchController, SearchService } from './modules/search/user/search.module';
import { MessageSearchController, MessageSearchService } from './modules/search/message/message-search.module';
import { FileSearchController, FileSearchService } from './modules/search/file/file-search.module';
import { ThemeController, ThemeService } from './modules/theme/theme.module';
import { jwtGuard } from './shared/guards/jwt.guard';
import { sessionGuard } from './shared/guards/session.guard';
import { GatewayService } from './modules/gateway/gateway.service';

const upload = multer({ storage: multer.memoryStorage() });

export class AppModule {
    public app: express.Application;
    private authController: AuthController;
    private userController: UserController;
    private chatController: ChatController;
    private fileController: FileController;
    private stickerController: StickerController;
    private searchController: SearchController;
    private messageSearchController: MessageSearchController;
    private fileSearchController: FileSearchController;
    private themeController: ThemeController;

    constructor(chatService: ChatService) {
        this.app = express();
        this.setupMiddleware();
        this.setupControllers(chatService);
        this.setupRoutes();
    }

    private setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json());
        //const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
        const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
        this.app.use(limiter);
    }

    private setupControllers(chatService: ChatService) {
        const authService = new AuthService();
        this.authController = new AuthController(authService);

        const userService = new UserService();
        this.userController = new UserController(userService);

        this.chatController = new ChatController(chatService);

        const fileService = new FileService();
        this.fileController = new FileController(fileService);

        const stickerService = new StickerService();
        this.stickerController = new StickerController(stickerService);

        const searchService = new SearchService();
        this.searchController = new SearchController(searchService);

        const messageSearchService = new MessageSearchService();
        this.messageSearchController = new MessageSearchController(messageSearchService);

        const fileSearchService = new FileSearchService();
        this.fileSearchController = new FileSearchController(fileSearchService);

        const themeService = new ThemeService();
        this.themeController = new ThemeController(themeService);
    }

    private setupRoutes() {

        // this.app.get('/test-ping', (req, res) => {
        //     console.log('✅ Test endpoint hit');
        //     res.json({ ok: true, time: new Date().toISOString() });
        // });

        // this.app.get('/search/test', jwtGuard, sessionGuard, (req, res) => {
        //     console.log('✅ Search test hit, userId:', (req as any).user?.userId);
        //     res.json({ ok: true, userId: (req as any).user?.userId });
        // });

        // Auth routes
        this.app.post('/auth/register', this.authController.register);
        this.app.post('/auth/login', this.authController.login);
        this.app.post('/auth/refresh', this.authController.refresh);
        this.app.post('/auth/logout', this.authController.logout);
        this.app.get('/auth/sessions', jwtGuard, this.authController.getSessions);
        this.app.delete('/auth/sessions/:sessionId', jwtGuard, this.authController.revokeSession);

        // User routes
        this.app.get('/user/me', jwtGuard, sessionGuard, this.userController.getMe);
        this.app.patch('/user/me', jwtGuard, sessionGuard, this.userController.updateMe);
        this.app.get('/user/check-username/:username', jwtGuard, sessionGuard, this.userController.checkUsername);
        this.app.get('/user/contacts', jwtGuard, sessionGuard, this.userController.getContacts);
        this.app.get('/user/settings', jwtGuard, sessionGuard, this.userController.getSettings);
        this.app.patch('/user/settings', jwtGuard, sessionGuard, this.userController.updateSettings);
        this.app.get('/user/:userId', jwtGuard, sessionGuard, this.userController.getPublicProfile);
        this.app.post('/user/contacts', jwtGuard, sessionGuard, this.userController.addContact);
        this.app.delete('/user/contacts/:contactId', jwtGuard, sessionGuard, this.userController.removeContact);
        this.app.get('/user/favorite-tracks', jwtGuard, sessionGuard, this.userController.getFavoriteTracks);
        this.app.post('/user/favorite-tracks', jwtGuard, sessionGuard, this.userController.addFavoriteTrack);
        this.app.patch('/user/favorite-tracks/reorder', jwtGuard, sessionGuard, this.userController.reorderFavoriteTracks);
        this.app.delete('/user/favorite-tracks/:trackId', jwtGuard, sessionGuard, this.userController.removeFavoriteTrack);

        //Search routes
        this.app.get('/search', jwtGuard, sessionGuard, this.searchController.search);
        this.app.get('/search/messages', jwtGuard, sessionGuard, this.messageSearchController.search);
        this.app.get('/search/files', jwtGuard, sessionGuard, this.fileSearchController.search);

        // Chat routes
        this.app.post('/chat', jwtGuard, sessionGuard, this.chatController.createChat);
        this.app.get('/chat', jwtGuard, sessionGuard, this.chatController.getUserChats);
        this.app.get('/chat/:chatId', jwtGuard, sessionGuard, this.chatController.getChat);
        this.app.post('/chat/:chatId/participants', jwtGuard, sessionGuard, this.chatController.addParticipants);
        this.app.delete('/chat/:chatId/participants/:userId', jwtGuard, sessionGuard, this.chatController.removeParticipant);

        // File routes
        this.app.post('/file/upload', jwtGuard, sessionGuard, this.fileController.uploadFile);
        this.app.get('/file/:fileId', jwtGuard, sessionGuard, this.fileController.getFile);
        this.app.get('/file/:fileId/thumbnail', jwtGuard, sessionGuard, this.fileController.getThumbnail);

        // Sticker routes
        this.app.post('/sticker/packs', jwtGuard, sessionGuard, this.stickerController.createPack);
        this.app.post('/sticker/packs/:packId/stickers', jwtGuard, sessionGuard, this.stickerController.addStickerToPack);
        this.app.get('/sticker/packs', jwtGuard, sessionGuard, this.stickerController.getUserPacks);
        this.app.delete('/sticker/packs/:packId', jwtGuard, sessionGuard, this.stickerController.deletePack);
        this.app.post('/sticker/favorites', jwtGuard, sessionGuard, this.stickerController.addFavorite);
        this.app.delete('/sticker/favorites/:stickerFileId', jwtGuard, sessionGuard, this.stickerController.removeFavorite);
        this.app.get('/sticker/favorites', jwtGuard, sessionGuard, this.stickerController.getFavorites);
        this.app.patch('/sticker/favorites/reorder', jwtGuard, sessionGuard, this.stickerController.reorderFavorites);
        this.app.post('/sticker/import', jwtGuard, sessionGuard, this.stickerController.importStickerPack);
        this.app.get('/sticker/import/status/:jobId', jwtGuard, sessionGuard, this.stickerController.getImportStatus);

        // Theme routes
        this.app.get('/themes', jwtGuard, sessionGuard, this.themeController.getThemes);
        this.app.get('/themes/system', jwtGuard, sessionGuard, this.themeController.getSystemThemes);
        this.app.post('/themes', jwtGuard, sessionGuard, this.themeController.createTheme);
        this.app.patch('/themes/:themeId', jwtGuard, sessionGuard, this.themeController.updateTheme);
        this.app.delete('/themes/:themeId', jwtGuard, sessionGuard, this.themeController.deleteTheme);
        this.app.get('/themes/:themeId/export', jwtGuard, sessionGuard, this.themeController.exportTheme);
        this.app.post('/themes/apply', jwtGuard, sessionGuard, this.themeController.applyTheme);
        this.app.post('/themes/import', jwtGuard, sessionGuard, upload.single('file'), this.themeController.importTheme);
    }
}