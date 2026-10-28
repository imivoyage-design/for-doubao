import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  FileText,
  Heart,
  MessageSquare,
  Bookmark,
  Eye,
  Trash2,
  Settings,
} from 'lucide-react';
import * as usersApi from '@/api/users';
import * as postsApi from '@/api/posts';
import { useAuth } from '@/contexts/AuthContext';
import EditProfilePanel from './EditProfilePanel';
import type { UserProfileInfo, Post } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Image } from '@client/src/components/ui/image';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myFavorites, setMyFavorites] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const [myPostsPage, setMyPostsPage] = useState(1);
  const [myPostsTotal, setMyPostsTotal] = useState(0);
  const [favPage, setFavPage] = useState(1);
  const [favTotal, setFavTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('posts');

  const pageSize = 10;

  const fetchProfile = useCallback(async () => {
    try {
      const data = await usersApi.getProfile();
      setProfile(data);
    } catch (err: unknown) {
      logger.error('Failed to fetch profile', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchMyPosts = useCallback(async (page: number) => {
    if (!profile?.userId) return;
    setLoadingPosts(true);
    try {
      const response = await usersApi.getUserPosts(profile.userId, page, pageSize);
      setMyPosts(response.items);
      setMyPostsTotal(response.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch my posts', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [profile?.userId]);

  const fetchMyFavorites = useCallback(async (page: number) => {
    setLoadingFavorites(true);
    try {
      const response = await usersApi.getMyFavorites(page, pageSize);
      setMyFavorites(response.items);
      setFavTotal(response.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch my favorites', err);
    } finally {
      setLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.userId) {
      fetchMyPosts(myPostsPage);
    }
  }, [profile?.userId, myPostsPage, fetchMyPosts]);

  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchMyFavorites(favPage);
    }
  }, [activeTab, favPage, fetchMyFavorites]);

  const handleDeletePost = async (postId: string) => {
    if (!await showConfirm('确定要删除这篇帖子吗？')) return;
    try {
      await postsApi.deletePost(postId);
      fetchMyPosts(myPostsPage);
      fetchProfile();
      toast.success('帖子已删除');
    } catch (err: unknown) {
      logger.error('Failed to delete post', err);
      toast.error('删除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  const truncateContent = (content: string, maxLen: number) => {
    const plain = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
  };

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    onPageChange: (page: number) => void,
  ) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const visiblePages = totalPages > 7
      ? Array.from({ length: 7 }, (_, i) => {
          const half = 3;
          let start = Math.max(1, currentPage - half);
          start = Math.min(start, totalPages - 6);
          return start + i;
        })
      : Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={currentPage <= 1 ? 'pointer-events-none opacity-50 cursor-pointer' : 'cursor-pointer'}
            />
          </PaginationItem>
          {visiblePages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === currentPage}
                onClick={() => onPageChange(p)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-50 cursor-pointer' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (loadingProfile) {
    return (
      <Card className="p-4 sm:p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="h-4 bg-slate-100 rounded w-48 max-w-full" />
          </div>
        </div>
      </Card>
    );
  }

  const displayName = profile?.userName || authUser?.nickname || '用户';

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-6">
        {/* Desktop layout */}
        <div className="hidden sm:flex items-center gap-5">
          <Avatar className="size-16 shrink-0">
            {profile?.avatarUrl || authUser?.avatarUrl ? (
              <Image
                src={profile?.avatarUrl || authUser?.avatarUrl || ''}
                alt={displayName}
                className="object-cover w-full h-full rounded-full"
              />
            ) : (
              <AvatarFallback className="text-xl bg-indigo-100 text-indigo-600">
                {displayName ? getInitials(displayName) : 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              {displayName}
              {authUser?.role === 'admin' && (
                <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">管理员</Badge>
              )}
              {profile?.isMuted && (
                <Badge variant="destructive" className="text-xs">已禁言</Badge>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-1 break-words">
              {profile?.bio || '这个人很懒，什么都没留下'}
            </p>
            {profile?.isMuted && profile?.muteReason && (
              <p className="text-sm text-red-500 mt-1 break-words">禁言原因：{profile.muteReason}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-6 text-center shrink-0">
            <div>
              <div className="text-xl font-bold text-slate-900">
                {profile?.postCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <FileText className="size-3.5" />
                发帖数
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {profile?.commentCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <MessageSquare className="size-3.5" />
                评论数
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {profile?.likedCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                <Heart className="size-3.5" />
                获赞数
              </div>
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-start gap-3">
            <Avatar className="size-14 shrink-0">
              {profile?.avatarUrl || authUser?.avatarUrl ? (
                <Image
                  src={profile?.avatarUrl || authUser?.avatarUrl || ''}
                  alt={displayName}
                  className="object-cover w-full h-full rounded-full"
                />
              ) : (
                <AvatarFallback className="text-lg bg-indigo-100 text-indigo-600">
                  {displayName ? getInitials(displayName) : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span className="break-words">{displayName}</span>
                {authUser?.role === 'admin' && (
                  <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">管理员</Badge>
                )}
                {profile?.isMuted && (
                  <Badge variant="destructive" className="text-xs">已禁言</Badge>
                )}
              </h2>
              <p className="text-sm text-slate-500 mt-1 break-words">
                {profile?.bio || '这个人很懒，什么都没留下'}
              </p>
              {profile?.isMuted && profile?.muteReason && (
                <p className="text-sm text-red-500 mt-1 break-words">
                  禁言原因：{profile.muteReason}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-slate-900">
                {profile?.postCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <FileText className="size-3" />
                发帖
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-slate-900">
                {profile?.commentCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MessageSquare className="size-3" />
                评论
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-slate-900">
                {profile?.likedCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Heart className="size-3" />
                获赞
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="gap-1.5 flex-1 justify-center">
            <FileText className="size-4" />
            我的帖子
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 flex-1 justify-center">
            <Bookmark className="size-4" />
            我的收藏
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 flex-1 justify-center">
            <Settings className="size-4" />
            修改资料
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {loadingPosts ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </Card>
              ))}
            </div>
          ) : myPosts.length === 0 ? (
            <Card className="p-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无帖子</EmptyTitle>
                  <EmptyDescription>你还没有发布过帖子</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {myPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="p-3 sm:p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (post.id) navigate(`/post/${post.id}`);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-900 break-words line-clamp-2">
                            {post.title}
                          </h3>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {post.categoryName}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                          {truncateContent(post.content, 80)}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>{formatDate(post.createdAt)}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3" />
                            {post.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="size-3" />
                            {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {post.commentCount}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.id);
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              {renderPagination(myPostsPage, myPostsTotal, setMyPostsPage)}
            </>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          {loadingFavorites ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </Card>
              ))}
            </div>
          ) : myFavorites.length === 0 ? (
            <Card className="p-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Bookmark className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无收藏</EmptyTitle>
                  <EmptyDescription>你还没有收藏任何帖子</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {myFavorites.map((post) => (
                  <Card
                    key={post.id}
                    className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (post.id) navigate(`/post/${post.id}`);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-900 break-words line-clamp-2">
                        {post.title}
                      </h3>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {post.categoryName}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {truncateContent(post.content, 80)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>{post.authorName}</span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" />
                        {post.viewCount}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
              {renderPagination(favPage, favTotal, setFavPage)}
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <EditProfilePanel profile={profile} onSaved={fetchProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
