import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req: Request, file: Express.Multer.File, callback: any) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${file.originalname}-${uniqueSuffix}${ext}`);
    },
  }),

  fileFilter: (req: Request, file: Express.Multer.File, callback: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
      callback(null, true);
    } else {
      callback(new BadRequestException('unsupported file format'), false);
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
