import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { ReportsService } from './reports.service';
import { CreateReportDto, HandleReportDto } from './reports.dto';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 普通用户：提交举报
  @Post()
  async create(@Req() req: ForumRequest, @Body() dto: CreateReportDto) {
    if (!req.user) throw new UnauthorizedException('请先登录');
    return this.reportsService.create(req.user.userId, dto);
  }

  // 管理员：举报列表（按状态筛选）
  @Get()
  async list(@Query('status') status?: string) {
    return this.reportsService.list(status);
  }

  // 管理员：处理举报
  @Patch(':id/handle')
  async handle(@Req() req: ForumRequest, @Param('id') id: string, @Body() dto: HandleReportDto) {
    if (!req.user) throw new UnauthorizedException('请先登录');
    if (req.user.role !== 'admin') throw new ForbiddenException('仅管理员可处理举报');
    return this.reportsService.handle(id, req.user.userId, dto);
  }
}
