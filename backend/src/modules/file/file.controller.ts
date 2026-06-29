import { Request, Response } from 'express';
import { FileService } from './file.service';
import { UploadFileDto } from './dto/upload-file.dto';
import multer from 'multer';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const upload = multer({ storage: multer.memoryStorage() });

export class FileController {
    constructor(private fileService: FileService) { }

    // Обратите внимание: uploadFile теперь массив middleware
    uploadFile = [
        upload.single('file'),
        async (req: Request, res: Response) => {
            const userId = (req as any).user?.userId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const dto = plainToInstance(UploadFileDto, req.body);
            const errors = await validate(dto);
            if (errors.length) {
                return res.status(400).json({ errors });
            }

            try {
                const file = await this.fileService.uploadFile(
                    userId,
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    dto
                );
                res.status(201).json({ fileId: file.id, url: `/file/${file.id}` });
            } catch (error: any) {
                res.status(400).json({ message: error.message });
            }
        }
    ];

    getFile = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { fileId } = req.params;
        try {
            const { stream, mimeType, size } = await this.fileService.getFileStream(fileId, userId);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', size);
            stream.pipe(res);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };

    getThumbnail = async (req: Request, res: Response) => {
        const userId = (req as any).user?.userId;
        const { fileId } = req.params;
        try {
            const { stream, mimeType } = await this.fileService.getThumbnailStream(fileId, userId);
            res.setHeader('Content-Type', mimeType);
            stream.pipe(res);
        } catch (error: any) {
            res.status(404).json({ message: error.message });
        }
    };
}