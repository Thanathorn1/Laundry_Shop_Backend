import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type RegisterPayload = {
  userId?: string;
  shopId?: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class OrderGateway {
  @WebSocketServer()
  server!: Server;

  private roomForUser(userId: string) {
    return `user:${userId}`;
  }

  private roomForShop(shopId: string) {
    return `shop:${shopId}`;
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RegisterPayload,
  ) {
    const userId = typeof payload?.userId === 'string' ? payload.userId.trim() : '';
    if (userId) {
      client.join(this.roomForUser(userId));
    }

    const shopId = typeof payload?.shopId === 'string' ? payload.shopId.trim() : '';
    if (shopId) {
      client.join(this.roomForShop(shopId));
    }

    return { ok: true };
  }

  emitOrderUpdate(order: any) {
    if (!order) return;

    const customerId = order.customerId ? String(order.customerId) : '';
    const riderId = order.riderId ? String(order.riderId) : '';
    const shopId = order.shopId ? String(order.shopId) : '';

    if (customerId) {
      this.server.to(this.roomForUser(customerId)).emit('order:update', order);
    }

    if (riderId) {
      this.server.to(this.roomForUser(riderId)).emit('order:update', order);
    }

    if (shopId) {
      this.server.to(this.roomForShop(shopId)).emit('order:update', order);
    }
  }
}
