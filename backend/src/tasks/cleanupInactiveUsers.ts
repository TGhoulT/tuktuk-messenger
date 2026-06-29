import cron from 'node-cron';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import { UserSettings } from '../database/entities/UserSettings';
import { MoreThan } from 'typeorm';

export function startCleanupInactiveUsers() {
    cron.schedule('0 3 * * *', async () => {
        console.log('[Cron] Checking for inactive users...');
        try {
            const settingsRepo = AppDataSource.getRepository(UserSettings);
            const userRepo = AppDataSource.getRepository(User);

            const settings = await settingsRepo.find({
                where: { autoDeleteMonths: MoreThan(0) },
                relations: ['user'],
            });

            const now = new Date();
            const toDelete: string[] = [];

            for (const setting of settings) {
                const user = setting.user;
                if (!user || user.isDeleted) continue;
                const lastActivity = user.lastActivityAt;
                if (!lastActivity) continue;

                const expiry = new Date(lastActivity);
                expiry.setMonth(expiry.getMonth() + setting.autoDeleteMonths);
                if (expiry < now) {
                    toDelete.push(user.id);
                }
            }

            if (toDelete.length) {
                await userRepo.update(toDelete, { isDeleted: true });
                console.log(`[Cron] Marked ${toDelete.length} inactive users as deleted.`);
            } else {
                console.log('[Cron] No inactive users found.');
            }
        } catch (err) {
            console.error('[Cron] Error during cleanup:', err);
        }
    });
}