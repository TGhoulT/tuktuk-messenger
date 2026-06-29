import { AppDataSource } from '../../database/data-source';
import { Contact } from '../../database/entities/Contact';

export class ContactService {
    private contactRepository = AppDataSource.getRepository(Contact);

    async isContact(ownerId: string, contactId: string): Promise<boolean> {
        const count = await this.contactRepository.countBy({ ownerId, contactId });
        return count > 0;
    }
}