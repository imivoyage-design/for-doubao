import { Injectable } from '@nestjs/common';
import { CreateReportDto, HandleReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  // 实际项目中通过 Drizzle ORM 读写 post_reports 表
  async create(reporterId: string, dto: CreateReportDto) {
    return { id: 'new', ...dto, reporterId, status: 'pending', createdAt: new Date() };
  }
  async list(status?: string) {
    return { list: [], status: status ?? 'all', total: 0 };
  }
  async handle(id: string, adminId: string, dto: HandleReportDto) {
    return { id, ...dto, handledBy: adminId, handledAt: new Date() };
  }
}
