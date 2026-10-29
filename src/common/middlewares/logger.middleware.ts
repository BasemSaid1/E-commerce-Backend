import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { appendFile } from 'node:fs/promises';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    const startTime = Date.now();

    res.on('finish', async () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      const logMessage = `[${method}] ${originalUrl} ${statusCode} ${duration}ms - IP ${ip} (${userAgent})`;

      this.logger.log(logMessage);

      await appendFile(
        'src/common/logs/http.log',
        `${new Date().toISOString()} ${logMessage}\n`,
      );
    });

    next();
  }
}
