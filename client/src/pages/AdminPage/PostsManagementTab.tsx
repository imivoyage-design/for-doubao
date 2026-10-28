import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Edit3, Trash2, CheckCircle, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '@/api/admin';
import type { Post, Category } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

interface PostsManagementProps {
  posts: Post[];
  categories: Category[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPostsChange: (posts: Post[]) => void;
  formatDate: (dateStr: string) => string;
}

export const PostsManagementTab = ({
  posts,
  categories,
  loading,
  page,
  totalPages,
  onPageChange,
  onPostsChange,
  formatDate,
}: PostsManagementProps) => {
  const [editingCategoryPostId, setEditingCategoryPostId] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

  const handleDeletePost = async (postId: string) => {
    if (!(await showConfirm('确定要删除这篇帖子吗？此操作不可撤销。'))) return;
    try {
      await adminApi.deletePost(postId);
      onPostsChange(posts.filter((p) => p.id !== postId));
      toast.success('帖子已删除');
    } catch (err: unknown) {
      logger.error('Failed to delete post as admin', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '删除帖子失败，请稍后重试';
      toast.error(msg);
    }
  };

  const handleStartEditCategory = (post: Post) => {
    setEditingCategoryPostId(post.id);
    setEditCategoryValue(post.categoryId);
  };

  const handleSaveCategory = async (postId: string) => {
    if (!editCategoryValue) return;
    try {
      await adminApi.updatePostCategory(postId, editCategoryValue);
      onPostsChange(
        posts.map((p) => {
          if (p.id === postId) {
            const cat = categories.find((c) => c.id === editCategoryValue);
            return { ...p, categoryId: editCategoryValue, categoryName: cat?.name || p.categoryName };
          }
          return p;
        }),
      );
      toast.success('分类已更新');
      setEditingCategoryPostId(null);
    } catch (err: unknown) {
      logger.error('Failed to update post category', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '更新分类失败，请稍后重试';
      toast.error(msg);
    }
  };

  return (
    <Card>
      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="size-6" />
              </EmptyMedia>
              <EmptyTitle>暂无帖子</EmptyTitle>
              <EmptyDescription>当前没有任何帖子</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="divide-y divide-slate-100">
              <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 bg-slate-50">
                <div className="col-span-5">标题</div>
                <div className="col-span-2">作者</div>
                <div className="col-span-2">分类</div>
                <div className="col-span-2">发布时间</div>
                <div className="col-span-1 text-right">操作</div>
              </div>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="px-6 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-slate-50"
                >
                  <div className="col-span-5 truncate font-medium text-slate-800">
                    {post.title}
                  </div>
                  <div className="col-span-2 truncate text-slate-600">
                    {post.authorName}
                  </div>
                  <div className="col-span-2">
                    {editingCategoryPostId === post.id ? (
                      <Select value={editCategoryValue} onValueChange={setEditCategoryValue}>
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{post.categoryName}</Badge>
                    )}
                  </div>
                  <div className="col-span-2 text-slate-500 text-xs">
                    {formatDate(post.createdAt)}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    {editingCategoryPostId === post.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleSaveCategory(post.id)}
                        >
                          <CheckCircle className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => setEditingCategoryPostId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleStartEditCategory(post)}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-slate-100">
            {posts.map((post) => (
              <div key={post.id} className="px-4 py-3">
                <div className="font-medium text-slate-800 text-sm line-clamp-2">
                  {post.title}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span className="truncate">{post.authorName}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {editingCategoryPostId === post.id ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <Select value={editCategoryValue} onValueChange={setEditCategoryValue}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleSaveCategory(post.id)}
                      >
                        <CheckCircle className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setEditingCategoryPostId(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-xs">
                        {post.categoryName}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleStartEditCategory(post)}
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-slate-500 flex items-center px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
