// import { Module } from '@nestjs/common';
// import { MailService } from './mail.service.js';
// import { MailerModule } from '@nestjs-modules/mailer';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { join } from 'node:path';
// import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';

// @Module({
//   imports: [
//     MailerModule.forRootAsync({
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService) => ({
//         transport: {
//           service: 'gmail',
//           auth: {
//             user: configService.get<string>('MAIL_USER'),
//             pass: configService.get<string>('MAIL_PASS'),
//           },
//           default: {
//             from: `"No Reply" <${configService.get<string>('MAIL_USER')}>`,
//           },
//           template: {
//             dir: join(__dirname, 'templates'),
//             adaptor: new EjsAdapter(),
//             options: { strict: false },
//           },
//         },
//       }),
//       inject: [ConfigService],
//     }),
//   ],
//   providers: [MailService],
//   exports: [MailService],
// })
// export class MailModule {}

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
          service: 'gmail',
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
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
