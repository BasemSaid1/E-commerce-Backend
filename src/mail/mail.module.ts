import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>('MAIL_USER')}>`,
        },
        template: {
          dir: join(process.cwd(), 'src', 'mail', 'templates'),
          adapter: new EjsAdapter({ inlineCssEnabled: false }),
          options: { strict: false },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
