import { AppDataSource } from '../../database/data-source';
import { User } from '../../database/entities/User';
import { Contact } from '../../database/entities/Contact';
import { FavoriteTrack } from '../../database/entities/FavoriteTrack';
import { UserSettings } from '../../database/entities/UserSettings';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ContactService } from '../contact/contact.service';
import { CreateFavoriteTrackDto, ReorderFavoriteTracksDto } from './dto/favorite-track.dto';

export class UserService {
    private userRepository = AppDataSource.getRepository(User);
    private userSettingsRepository = AppDataSource.getRepository(UserSettings);
    private contactRepository = AppDataSource.getRepository(Contact);
    private contactService = new ContactService();
    private favoriteTrackRepository = AppDataSource.getRepository(FavoriteTrack);

    async checkUsername(username: string): Promise<boolean> {
        const user = await this.userRepository.findOneBy({ username });
        return !user; // true = доступно
    }

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['settings'],
        });
        if (!user || user.isDeleted) {
            throw new Error('User not found');
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl || null,
            bio: user.bio || null,
            createdAt: user.createdAt,
            lastActivityAt: user.lastActivityAt,
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new Error('User not found');

        if (dto.username) {
            const existing = await this.userRepository.findOneBy({ username: dto.username });
            if (existing && existing.id !== userId) {
                throw new Error('Username already taken');
            }
            user.username = dto.username;
        }
        if (dto.firstName !== undefined) user.firstName = dto.firstName;
        if (dto.lastName !== undefined) user.lastName = dto.lastName;
        if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
        if (dto.bio !== undefined) user.bio = dto.bio;

        await this.userRepository.save(user);
        return this.getProfile(userId);
    }

    async getSettings(userId: string) {
        const settings = await this.userSettingsRepository.findOne({
            where: { userId },
        });
        if (!settings) throw new Error('Settings not found');
        return settings;
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        let settings = await this.userSettingsRepository.findOne({ where: { userId } });
        if (!settings) {
            settings = this.userSettingsRepository.create({ userId });
        }

        if (dto.sessionLifetimeDays !== undefined) settings.sessionLifetimeDays = dto.sessionLifetimeDays;
        if (dto.autoDeleteMonths !== undefined) settings.autoDeleteMonths = dto.autoDeleteMonths;
        if (dto.privacy) settings.privacy = { ...settings.privacy, ...dto.privacy };
        if (dto.interface) settings.interface = { ...settings.interface, ...dto.interface };

        await this.userSettingsRepository.save(settings);
        return settings;
    }

    async getContacts(userId: string) {
        const contacts = await this.contactRepository.find({
            where: { ownerId: userId },
            relations: ['contact'],
        });
        return contacts.map(c => ({
            id: c.id,
            contactId: c.contactId,
            username: c.contact.username,
            localName: c.localName || c.contact.username,
            createdAt: c.createdAt,
        }));
    }

    async addContact(ownerId: string, contactId: string, localName?: string) {
        if (ownerId === contactId) throw new Error('Cannot add self as contact');
        const existing = await this.contactRepository.findOneBy({ ownerId, contactId });
        if (existing) throw new Error('Contact already exists');
        const contact = this.contactRepository.create({ ownerId, contactId, localName });
        return this.contactRepository.save(contact);
    }

    async removeContact(ownerId: string, contactId: string) {
        const result = await this.contactRepository.delete({ ownerId, contactId });
        if (result.affected === 0) throw new Error('Contact not found');
    }

    async getPublicProfile(targetUserId: string, viewerId?: string): Promise<any> {
        const target = await this.userRepository.findOne({
            where: { id: targetUserId, isDeleted: false },
            relations: ['settings'],
        });
        if (!target) throw new Error('User not found');

        const privacy = target.settings?.privacy || {};
        const isContact = viewerId ? await this.contactService.isContact(viewerId, targetUserId) : false;

        const canView = (field: keyof typeof privacy): boolean => {
            const rule = privacy[field] || 'everyone';
            if (rule === 'everyone') return true;
            if (rule === 'contacts') return isContact;
            return false;
        };

        const result: any = {
            id: target.id,
            username: target.username,
        };

        if (canView('profilePhoto')) {
            result.avatarUrl = target.avatarUrl;
        }
        if (canView('bio')) {
            result.bio = target.bio;
        }

        if (canView('lastSeen')) {
            result.lastSeen = target.lastActivityAt;
        } else if (viewerId && target.lastActivityAt) {
            result.lastSeenApprox = this.getApproximateLastSeen(target.lastActivityAt);
        }

        return result;
    }

    private getApproximateLastSeen(date: Date): string {
        const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) return 'недавно';
        if (diffDays <= 7) return 'на этой неделе';
        if (diffDays <= 30) return 'в этом месяце';
        return 'давно';
    }

    async getFavoriteTracks(userId: string): Promise<FavoriteTrack[]> {
        return this.favoriteTrackRepository.find({
            where: { userId },
            order: { order: 'ASC' },
        });
    }

    async addFavoriteTrack(userId: string, dto: CreateFavoriteTrackDto): Promise<FavoriteTrack> {
        // Получаем текущий максимальный order
        const maxOrder = await this.favoriteTrackRepository
            .createQueryBuilder('track')
            .select('MAX(track.order)', 'max')
            .where('track.userId = :userId', { userId })
            .getRawOne();
        const newOrder = (maxOrder?.max ?? -1) + 1;

        const track = this.favoriteTrackRepository.create({
            userId,
            trackName: dto.trackName,
            artistName: dto.artistName,
            order: newOrder,
        });
        return this.favoriteTrackRepository.save(track);
    }

    async reorderFavoriteTracks(userId: string, trackIds: string[]): Promise<void> {
        // Обновляем order для каждого трека
        for (let i = 0; i < trackIds.length; i++) {
            await this.favoriteTrackRepository.update(
                { id: trackIds[i], userId },
                { order: i }
            );
        }
    }

    async removeFavoriteTrack(userId: string, trackId: string): Promise<void> {
        await this.favoriteTrackRepository.delete({ id: trackId, userId });
    }
}