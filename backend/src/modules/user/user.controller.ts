import { Request, Response } from 'express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFavoriteTrackDto, ReorderFavoriteTracksDto } from './dto/favorite-track.dto';

export class UserController {
    constructor(private userService: UserService) { }

    getMe = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        try {
            const profile = await this.userService.getProfile(userId);
            res.json(profile);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    updateMe = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(UpdateProfileDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const profile = await this.userService.updateProfile(userId, dto);
            res.json(profile);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    getSettings = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        try {
            const settings = await this.userService.getSettings(userId);
            res.json(settings);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    checkUsername = async (req: Request, res: Response) => {
        const { username } = req.params;
        if (!username) return res.status(400).json({ message: 'Username required' });
        const available = await this.userService.checkUsername(username);
        res.json({ available });
    };

    updateSettings = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(UpdateSettingsDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        try {
            const settings = await this.userService.updateSettings(userId, dto);
            res.json(settings);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    getContacts = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const contacts = await this.userService.getContacts(userId);
        res.json(contacts);
    };

    addContact = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { contactId, localName } = req.body;
        if (!contactId) return res.status(400).json({ message: 'contactId required' });
        const contact = await this.userService.addContact(userId, contactId, localName);
        res.status(201).json(contact);
    };

    removeContact = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { contactId } = req.params;
        await this.userService.removeContact(userId, contactId);
        res.json({ success: true });
    };

    getPublicProfile = async (req: Request, res: Response) => {
        const viewerId = (req as any).user?.userId;
        const { userId } = req.params;
        try {
            const profile = await this.userService.getPublicProfile(userId, viewerId);
            res.json(profile);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    getFavoriteTracks = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const tracks = await this.userService.getFavoriteTracks(userId);
        res.json(tracks);
    };

    addFavoriteTrack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(CreateFavoriteTrackDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        const track = await this.userService.addFavoriteTrack(userId, dto);
        res.status(201).json(track);
    };

    reorderFavoriteTracks = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const dto = plainToInstance(ReorderFavoriteTracksDto, req.body);
        const errors = await validate(dto);
        if (errors.length) return res.status(400).json({ errors });
        await this.userService.reorderFavoriteTracks(userId, dto.trackIds);
        res.json({ success: true });
    };

    removeFavoriteTrack = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { trackId } = req.params;
        await this.userService.removeFavoriteTrack(userId, trackId);
        res.json({ success: true });
    };
}