import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service.js';
import { SocketGateway } from './socket.gateway.js';

@Global()
@Module({
  providers: [SocketService, SocketGateway],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
