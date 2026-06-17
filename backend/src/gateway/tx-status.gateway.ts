import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StellarService } from '../stellar/stellar.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/status' })
export class TxStatusGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // Map of socket.id → close function from Horizon stream
  private streams = new Map<string, () => void>();

  constructor(private stellar: StellarService) {}

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() txHash: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Clean up any existing stream for this client
    this.closeStream(client.id);

    const closeStream = this.stellar.streamTransaction(
      txHash,
      (record: any) => {
        client.emit('status', {
          txHash,
          status: record.successful ? 'SUCCESS' : 'PENDING',
          ledger: record.ledger,
          created_at: record.created_at,
          fee_charged: record.fee_charged,
        });
        // Close after first confirmed status
        if (record.successful !== undefined) {
          this.closeStream(client.id);
        }
      },
      (err: any) => {
        client.emit('error', { txHash, message: err?.message ?? 'Stream error' });
      },
    );

    this.streams.set(client.id, closeStream);
    client.emit('subscribed', { txHash });
  }

  handleDisconnect(client: Socket) {
    this.closeStream(client.id);
  }

  private closeStream(clientId: string) {
    const close = this.streams.get(clientId);
    if (close) {
      close();
      this.streams.delete(clientId);
    }
  }
}
