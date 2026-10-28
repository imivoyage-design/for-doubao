# 校园线上论坛（Campus Forum）

毕业设计项目：校园线上论坛系统。前后端分离架构，面向校园师生提供发帖、评论、点赞、收藏、分类浏览及后台管理功能。

## 技术栈

| 端 | 技术 |
|---|---|
| 运行时 | Node.js ≥ 22 |
| 后端框架 | NestJS 10（TypeScript） |
| ORM | Drizzle ORM |
| 数据库 | PostgreSQL |
| 参数校验 | class-validator + class-transformer |
| 前端框架 | React 19（TypeScript） |
| 构建工具 | Vite 5 |
| 路由 | React Router DOM v6 |
| 样式 | Tailwind CSS + shadcn/ui |
| 表单 | React Hook Form + Zod |
| 图标 | Lucide React |

## 功能模块

### 普通用户
- 注册 / 登录（JWT 认证）
- 首页内直接发帖（标题、内容、分类、图片）
- 帖子列表（按分类筛选、最新 / 热门排序）
- 帖子详情（浏览量、图片预览）
- 点赞 / 取消点赞、收藏 / 取消收藏
- 评论 / 回复
- **举报**：对帖子或评论提交举报（垃圾/辱骂/广告/其他）
- **私信**：与其他用户一对一聊天，未读消息提示
- **用户等级**：根据发帖数、获赞数显示等级徽章
- **个人主页**：查看用户的过往帖子与收藏、个人简介与头像
- 个人空间：修改昵称、头像、简介；查看我的帖子与收藏

### 管理员（默认账号 admin / admin123）
- 用户管理：搜索用户、禁言 / 解禁
- 帖子管理：修改帖子分类、删除帖子
- **举报管理**：查看举报列表，删除违规内容 / 禁言用户 / 忽略
- 禁言期间：被禁言用户无法发帖、无法评论（前端禁用 + 后端双重拦截）

## 目录结构

```
campus-forum-js/
├── client/                  # React 前端
│   ├── src/
│   │   ├── api/             # 后端接口封装
│   │   ├── components/      # 通用组件（含 shadcn/ui）
│   │   ├── pages/           # 页面
│   │   │   ├── HomePage/         # 首页（含发帖）
│   │   │   ├── PostDetailPage/   # 帖子详情
│   │   │   ├── LoginPage/        # 登录
│   │   │   ├── RegisterPage/     # 注册
│   │   │   ├── ProfilePage/      # 个人空间
│   │   │   ├── CreatePostPage/   # 发帖
│   │   │   └── AdminPage/        # 管理后台
│   │   └── main.tsx
│   └── vite.config.ts       # 开发代理 /api → 后端
├── server/                  # NestJS 后端
│   ├── main.ts              # 启动入口
│   ├── app.module.ts        # 根模块
│   ├── modules/             # 业务模块
│   │   ├── auth/            # 注册/登录/JWT
│   │   ├── users/           # 用户
│   │   ├── posts/           # 帖子
│   │   ├── comments/       # 评论
│   │   ├── likes/           # 点赞
│   │   ├── favorites/       # 收藏
│   │   ├── categories/      # 分类
│   │   └── admin/           # 管理后台
│   └── database/
│       └── schema.ts        # Drizzle 表结构
├── shared/
│   └── api.interface.ts     # 前后端共享类型
└── package.json
```

## 运行步骤

### 环境要求
- Node.js ≥ 22
- PostgreSQL 8+

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

在 PostgreSQL 中创建数据库，并在 `.env` 中配置连接信息（DATABASE_URL 等）。

### 3. 启动开发环境

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server   # 后端，默认端口 3000
npm run dev:client   # 前端，Vite 默认端口 5173
```

前端通过 Vite 代理 `/api` 访问后端。

### 4. 生产构建

```bash
npm run build        # 构建前后端
npm run start        # 启动生产服务
```

## 主要接口

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | /api/auth/register | 注册 | 公开 |
| POST | /api/auth/login | 登录，返回 JWT | 公开 |
| GET | /api/auth/me | 当前用户 | 登录 |
| GET | /api/categories | 分类列表 | 公开 |
| GET | /api/posts | 帖子列表 | 公开 |
| POST | /api/posts | 发帖 | 登录 |
| GET | /api/posts/:id | 帖子详情 | 公开 |
| POST | /api/posts/:id/like | 点赞 | 登录 |
| POST | /api/posts/:id/favorite | 收藏 | 登录 |
| GET | /api/comments?postId= | 评论列表 | 公开 |
| POST | /api/comments | 发表评论 | 登录 |
| GET | /api/admin/users | 用户列表 | 管理员 |
| POST | /api/admin/users/mute | 禁言 | 管理员 |
| DELETE | /api/admin/posts/:id | 删除帖子 | 管理员 |

## 设计说明

- **认证**：JWT，登录后 token 存于请求头，受保护接口统一校验
- **点赞 / 收藏计数**：基于中间表唯一索引防重复操作，计数同步更新
- **禁言机制**：用户记录禁言状态，发帖、评论接口前置校验，被禁言直接拒绝
- **前后端共享类型**：`shared/api.interface.ts` 统一前后端 API 契约
