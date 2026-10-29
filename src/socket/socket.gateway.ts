import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Live Stream Client Connected:${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Live Stream Client Disconnected:${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomName: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomName.room);
    console.log(`Client ${client.id} Joined room ${roomName.room}`);
    return { status: 'success', joined: roomName };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() roomName: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(roomName.room);
    console.log(`Client ${client.id} Left room ${roomName.room}`);
    return { status: 'success', left: roomName };
  }
}
