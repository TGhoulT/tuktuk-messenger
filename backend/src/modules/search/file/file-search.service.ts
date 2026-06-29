import { AppDataSource } from '../../../database/data-source';
import { File } from '../../../database/entities/File';

export class FileSearchService {
    private fileRepository = AppDataSource.getRepository(File);

    async searchFiles(
        userId: string,
        query: string,
        limit: number = 20,
        cursor?: Date,
    ) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return { files: [], total: 0 };

        // Используем ILIKE (регистронезависимый поиск) с индексом pg_trgm
        const qb = this.fileRepository
            .createQueryBuilder('file')
            .where('file.ownerId = :userId', { userId })
            .andWhere('file.originalName ILIKE :query', { query: `%${cleanQuery}%` });

        if (cursor) {
            qb.andWhere('file.createdAt < :cursor', { cursor });
        }

        qb.orderBy('file.createdAt', 'DESC').take(limit);

        const files = await qb.getMany();
        const result = files.map(file => ({
            id: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            createdAt: file.createdAt,
        }));

        return {
            files: result,
            total: result.length,
            nextCursor: result.length === limit ? result[result.length - 1].createdAt : null,
        };
    }
}