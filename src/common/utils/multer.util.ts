import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

export const multerOptions = {
  storage: memoryStorage(),

  fileFilter: (req: Request, file: Express.Multer.File, callback: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      callback(null, true);
    } else {
      callback(new BadRequestException('unsupported file format'), false);
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
