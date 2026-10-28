import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { AlertTriangle, FileText, Users, UserCog, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Post, Category, AdminUser } from '@shared/api.interface';
import * as postsApi from '@/api/posts';
import * as categoriesApi from '@/api/categories';
import * as adminApi from '@/api/admin';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';
import { PostsManagementTab } from './PostsManagementTab';
import { MutesManagementTab } from './MutesManagementTab';
import { UserManagementTable, MuteUserDialog } from './UserManagement';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('users');

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const pageSize = 20;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const [muteDialogUser, setMuteDialogUser] = useState<AdminUser | null>(null);
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);

  const fetchPosts = useCallback(async (page: number) => {
    setLoadingPosts(true);
    try {
      const response = await postsApi.listPosts({
        page,
        pageSize,
        sortBy: 'latest',
      });
      setPosts(response.items);
      setPostsTotal(response.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch posts for admin', err);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.listCategories();
      setCategories(data);
    } catch (err: unknown) {
      logger.error('Failed to fetch categories for admin', err);
    }
  }, []);

  const fetchUsers = useCallback(async (page: number, keyword: string) => {
    setUsersLoading(true);
    try {
      const response = await adminApi.listUsers({ page, pageSize, keyword: keyword || undefined });
      setUsers(response.items);
      setUsersTotal(response.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch users for admin', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts(postsPage);
    } else if (activeTab === 'users') {
      fetchUsers(usersPage, searchDebounced);
    }
  }, [activeTab, postsPage, usersPage, searchDebounced, fetchPosts, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchKeyword);
      setUsersPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleMuteClick = (u: AdminUser) => {
    setMuteDialogUser(u);
    setMuteDialogOpen(true);
  };

  const handleUnmuteClick = async (u: AdminUser) => {
    if (!(await showConfirm(`确定要解除 ${u.nickname} 的禁言吗？`))) return;
    try {
      await adminApi.unmuteUser(u.userId);
      toast.success(`已解除 ${u.nickname} 的禁言`);
      setUsers((prev) =>
        prev.map((item) =>
          item.userId === u.userId
            ? { ...item, isMuted: false, muteReason: null, muteExpiresAt: null }
            : item,
        ),
      );
    } catch (err: unknown) {
      logger.error('Failed to unmute user', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '解除禁言失败，请稍后重试';
      toast.error(msg);
    }
  };

  const handleMuteSuccess = () => {
    if (!muteDialogUser) return;
    const userId = muteDialogUser.userId;
    setUsers((prev) =>
      prev.map((item) =>
        item.userId === userId
          ? { ...item, isMuted: true, muteReason: null, muteExpiresAt: null }
          : item,
      ),
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPostsPages = Math.ceil(postsTotal / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">管理后台</h1>

      {authLoading && (
        <Card className="p-8 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
        </Card>
      )}
      {!authLoading && !isAdmin && (
        <Card className="p-8 text-center">
          <AlertTriangle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-800 mb-1">无访问权限</h2>
          <p className="text-sm text-slate-500 mb-4">
            您没有管理后台的访问权限，请使用管理员账号登录
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            去登录
          </Button>
        </Card>
      )}
      {!authLoading && isAdmin && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5">
              <UserCog className="size-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="size-4" />
              帖子管理
            </TabsTrigger>
            <TabsTrigger value="mutes" className="gap-1.5">
              <Ban className="size-4" />
              禁言管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="p-4 sm:p-5">
              <UserManagementTable
                users={users}
                loading={usersLoading}
                searchKeyword={searchKeyword}
                onSearchChange={setSearchKeyword}
                onMute={handleMuteClick}
                onUnmute={handleUnmuteClick}
                total={usersTotal}
                page={usersPage}
                pageSize={pageSize}
                onPageChange={setUsersPage}
              />
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            <PostsManagementTab
              posts={posts}
              categories={categories}
              loading={loadingPosts}
              page={postsPage}
              totalPages={totalPostsPages}
              onPageChange={setPostsPage}
              onPostsChange={setPosts}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="mutes" className="mt-4">
            <MutesManagementTab formatDate={formatDate} />
          </TabsContent>
        </Tabs>
      )}

      <MuteUserDialog
        user={muteDialogUser}
        open={muteDialogOpen}
        onOpenChange={setMuteDialogOpen}
        onSuccess={handleMuteSuccess}
      />
    </div>
  );
};

export default AdminPage;
