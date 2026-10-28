import { Injectable } from '@nestjs/common';
import { SendMessageDto } from './messages.dto';

@Injectable()
export class MessagesService {
  async listConversations(userId: string) {
    return { conversations: [], userId };
  }
  async listMessages(userId: string, peerUserId: string) {
    return { messages: [], userId, peerUserId };
  }
  async send(senderId: string, dto: SendMessageDto) {
    return { id: 'new', senderId, ...dto, createdAt: new Date() };
  }
}
