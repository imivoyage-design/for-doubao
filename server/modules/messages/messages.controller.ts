import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './messages.dto';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // 会话列表
  @Get('conversations')
  async conversations(@Req() req: ForumRequest) {
    if (!req.user) throw new UnauthorizedException('请先登录');
    return this.messagesService.listConversations(req.user.userId);
  }

  // 与某用户的聊天记录
  @Get('conversations/:peerUserId/messages')
  async messages(@Req() req: ForumRequest, @Param('peerUserId') peerUserId: string) {
    if (!req.user) throw new UnauthorizedException('请先登录');
    return this.messagesService.listMessages(req.user.userId, peerUserId);
  }

  // 发送私信
  @Post('send')
  async send(@Req() req: ForumRequest, @Body() dto: SendMessageDto) {
    if (!req.user) throw new UnauthorizedException('请先登录');
    return this.messagesService.send(req.user.userId, dto);
  }
}
