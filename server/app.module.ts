import { APP_FILTER } from '@nestjs/core';
import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';
import cookieParser from 'cookie-parser';
import { AuthMiddleware } from './modules/auth/auth.middleware';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { LikesModule } from './modules/likes/likes.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    CategoriesModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    FavoritesModule,
    AdminModule,
    UsersModule,
    AuthModule,
    ReportsModule,
    MessagesModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
}) 
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(cookieParser())
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
  }
}
