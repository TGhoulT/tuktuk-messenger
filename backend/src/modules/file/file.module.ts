// src/modules/file/file.module.ts
import { FileController } from './file.controller';
import { FileService } from './file.service';

export const fileModule = {
    controllers: [FileController],
    services: [FileService],
};

export { FileController, FileService };