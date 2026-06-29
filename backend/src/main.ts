import 'reflect-metadata';
import { AppDataSource } from './database/data-source';
import { AppModule } from './app.module';
import passport from 'passport';
import { JwtStrategy } from './modules/auth/strategies/jwt.strategy';
import { config } from './config/env';
import { User } from './database/entities/User';
import { startCleanupInactiveUsers } from './tasks/cleanupInactiveUsers';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as http from 'http';
import { GatewayService } from './modules/gateway/gateway.service';
import { ChatService } from './modules/chat/chat.service';
import { MessageService } from './modules/message/message.service';
import { MessageController } from './modules/message/message.controller';
import { jwtGuard } from './shared/guards/jwt.guard';
import { sessionGuard } from './shared/guards/session.guard';

async function seedSystemUser() {
    const userRepo = AppDataSource.getRepository(User);
    const systemUserId = '00000000-0000-0000-0000-000000000001';
    const existing = await userRepo.findOneBy({ id: systemUserId });
    if (!existing) {
        const systemUser = userRepo.create({
            id: systemUserId,
            email: 'system@tuktuk.local',
            username: 'Тук-Тук',
            passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
            isDeleted: false,
        });
        await userRepo.save(systemUser);
        console.log('System user created');
    }
}

async function bootstrap() {
    await AppDataSource.initialize();
    console.log('Database connected');

    await seedSystemUser();
    startCleanupInactiveUsers();

    passport.use(JwtStrategy);

    // 1. Создаём ChatService (пока без gatewayService)
    const chatService = new ChatService();

    // 2. Создаём AppModule и приложение Express
    const appModule = new AppModule(chatService);
    const app = appModule.app;
    app.use(passport.initialize());

    // 3. Создаём HTTP-сервер и GatewayService, передаём chatService
    const server = http.createServer(app);
    const gatewayService = new GatewayService(server, chatService);

    // 4. Даём chatService ссылку на gatewayService (чтобы он мог отправлять new_chat)
    chatService.setGatewayService(gatewayService);


    // Создаём MessageService и MessageController с gatewayService
    const messageService = new MessageService(gatewayService);
    const messageController = new MessageController(messageService);

    app.get('/message/:chatId', jwtGuard, sessionGuard, messageController.getMessages);
    app.post('/message', jwtGuard, sessionGuard, messageController.sendMessage);
    app.patch('/message/:messageId', jwtGuard, sessionGuard, messageController.editMessage);
    app.delete('/message/:messageId', jwtGuard, sessionGuard, messageController.deleteMessage);
    app.post('/message/forward', jwtGuard, sessionGuard, messageController.forwardMessages);
    app.post('/message/:messageId/pin', jwtGuard, sessionGuard, messageController.pinMessage);
    app.post('/message/:messageId/reaction', jwtGuard, sessionGuard, messageController.addReaction);
    app.delete('/message/:messageId/reaction', jwtGuard, sessionGuard, messageController.removeReaction);
    app.get('/message/:chatId/context/:messageId', jwtGuard, sessionGuard, messageController.getMessageContext);

    server.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
    });
}

bootstrap().catch(console.error);