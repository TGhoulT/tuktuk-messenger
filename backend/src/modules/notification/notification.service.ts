import { AppDataSource } from '../../database/data-source';
import { Chat } from '../../database/entities/Chat';
import { ChatParticipant } from '../../database/entities/ChatParticipant';
import { User } from '../../database/entities/User';
import { MessageService } from '../message/message.service';
import { MessageType } from '../../database/entities/Message';
import geolite2, { GeoIpDbName } from 'geolite2-redist';
import maxmind, { CityResponse, Reader } from 'maxmind';
import crypto from 'crypto';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

export class NotificationService {
    private chatRepository = AppDataSource.getRepository(Chat);
    private participantRepository = AppDataSource.getRepository(ChatParticipant);
    private messageService: MessageService;
    private cityReader: any = null;

    constructor() {
        this.messageService = new MessageService();
        this.initGeoIp();
    }

    private async initGeoIp() {
        try {
            const reader = await geolite2.open(
                GeoIpDbName.City,
                (path) => maxmind.open<CityResponse>(path)
            );
            this.cityReader = reader;
            console.log('✅ GeoIP database initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize GeoIP database:', error);
        }
    }

    // Обновленный метод для получения местоположения
    private async getLocationFromIp(ip: string): Promise<string> {
        if (!this.cityReader) {
            return "Неизвестное местоположение";
        }

        try {
            // Используем базу данных для определения геолокации IP-адреса
            const geo = this.cityReader.get(ip);

            if (!geo) {
                console.warn(`⚠️ Location not found for IP: ${ip}`);
                return "Неизвестное местоположение";
            }

            // Формируем локацию в формате: Город, Регион, Страна
            const city = geo.city?.names?.en || '';
            const subdivision = geo.subdivisions?.[0]?.names?.en || '';
            const country = geo.country?.names?.en || '';

            // Формируем строку местоположения
            const parts = [city, subdivision, country].filter(part => part && part !== '');
            if (parts.length === 0) {
                return "Неизвестное местоположение";
            }

            return parts.join(', ');
        } catch (error) {
            console.error(`❌ Error getting location for IP ${ip}:`, error);
            return "Неизвестное местоположение";
        }
    }

    // Отправка уведомления конкретному пользователю
    async sendNotification(userId: string, text: string): Promise<void> {
        let systemChat = await this.findSystemChat(userId);
        if (!systemChat) {
            systemChat = await this.createSystemChat(userId);
        }

        await this.messageService.sendMessage(
            SYSTEM_USER_ID,
            crypto.randomUUID(),
            {
                chatId: systemChat.id,
                type: MessageType.TEXT,
                text,
            },
        );
    }

    // Уведомление о входе с нового устройства (с геолокацией)
    async sendNewLoginAlert(userId: string, userAgent: string, ipAddress: string): Promise<void> {
        const location = await this.getLocationFromIp(ipAddress);
        const message = `🔐 Новый вход в аккаунт\n\n🖥️ Устройство: ${userAgent}\n📍 Местоположение: ${location}\n🕒 Время: ${new Date().toLocaleString()}\n\nЕсли это были не вы, немедленно смените пароль и завершите все сессии.`;
        await this.sendNotification(userId, message);
    }

    async sendPasswordChangedAlert(userId: string): Promise<void> {
        const message = `🔑 Пароль вашего аккаунта был изменён.\n\nЕсли вы не совершали это действие, немедленно свяжитесь с поддержкой.`;
        await this.sendNotification(userId, message);
    }

    async sendSessionRevokedAlert(userId: string, deviceInfo: string): Promise<void> {
        const message = `❌ Сессия на устройстве "${deviceInfo}" была завершена.\n\nЕсли вы не совершали это действие, проверьте список активных сессий в настройках.`;
        await this.sendNotification(userId, message);
    }

    private async findSystemChat(userId: string): Promise<Chat | null> {
        const chat = await this.chatRepository
            .createQueryBuilder('chat')
            .innerJoin('chat.participants', 'p1', 'p1.userId = :userId', { userId })
            .innerJoin('chat.participants', 'p2', 'p2.userId = :systemId', { systemId: SYSTEM_USER_ID })
            .getOne();
        return chat || null;
    }

    private async createSystemChat(userId: string): Promise<Chat> {
        const chat = this.chatRepository.create({
            type: 'dialog',
            title: 'Тук-Тук',
            isPrivate: true,
        });
        await this.chatRepository.save(chat);
        await this.participantRepository.save([
            this.participantRepository.create({ chatId: chat.id, userId, role: 'member' }),
            this.participantRepository.create({ chatId: chat.id, userId: SYSTEM_USER_ID, role: 'owner' }),
        ]);
        return chat;
    }
}