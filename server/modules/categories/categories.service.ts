import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { categories } from '@server/database/schema';
import { asc } from 'drizzle-orm';
import type { Category } from '@shared/api.interface';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async findAll(): Promise<Category[]> {
    try {
      const rows = await this.db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          sortOrder: categories.sortOrder,
        })
        .from(categories)
        .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        sortOrder: row.sortOrder ?? 0,
      }));
    } catch (error) {
      this.logger.error('获取分类列表失败', JSON.stringify(error));
      throw error;
    }
  }
}
