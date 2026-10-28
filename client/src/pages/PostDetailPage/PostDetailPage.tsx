import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image } from '@client/src/components/ui/image';
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
 import {
   Heart,
   MessageSquare,
   Bookmark,
   Eye,
   ArrowLeft,
   Trash2,
   Send,
   MessageCircle,
   AlertCircle,
   X,
   ChevronLeft,
   ChevronRight,
 } from 'lucide-react';
import { toast } from 'sonner';
import * as postsApi from '@/api/posts';
import * as commentsApi from '@/api/comments';
import * as likesApi from '@/api/likes';
import * as favoritesApi from '@/api/favorites';
import * as categoriesApi from '@/api/categories';
import * as adminApi from '@/api/admin';
import type { Post, Comment, Category } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

   const [selectedCategory, setSelectedCategory] = useState('');
   const [showCategoryEdit, setShowCategoryEdit] = useState(false);
   const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    try {
      const data = await postsApi.getPost(id);
      setPost(data);
      setLikeCount(data.likeCount);
      setFavoriteCount(data.favoriteCount);
      setSelectedCategory(data.categoryId);
    } catch (err: unknown) {
      logger.error('Failed to fetch post', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError('帖子不存在或已删除');
      } else {
        setError('加载帖子失败，请稍后重试');
      }
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await commentsApi.listComments(id);
      setComments(data);
    } catch (err: unknown) {
      logger.error('Failed to fetch comments', err);
    }
  }, [id]);

  const fetchLikeStatus = useCallback(async () => {
    if (!id) return;
    try {
      const { liked: l } = await likesApi.getLikeStatus(id);
      setLiked(l);
    } catch {
      // ignore
    }
  }, [id]);

  const fetchFavoriteStatus = useCallback(async () => {
    if (!id) return;
    try {
      const { favorited: f } = await favoritesApi.getFavoriteStatus(id);
      setFavorited(f);
    } catch {
      // ignore
    }
  }, [id]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.listCategories();
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setError('帖子不存在或已删除');
      setLoading(false);
      return;
    }
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchPost(),
        fetchComments(),
        fetchLikeStatus(),
        fetchFavoriteStatus(),
        fetchCategories(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [id, fetchPost, fetchComments, fetchLikeStatus, fetchFavoriteStatus, fetchCategories]);

  const handleToggleLike = async () => {
    if (!id) return;
    try {
      const result = await likesApi.toggleLike(id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err: unknown) {
      logger.error('Failed to toggle like', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const result = await favoritesApi.toggleFavorite(id);
      setFavorited(result.favorited);
      setFavoriteCount(result.favoriteCount);
    } catch (err: unknown) {
      logger.error('Failed to toggle favorite', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const newComment = await commentsApi.createComment({
        postId: id,
        content: commentText.trim(),
        parentId: replyTo?.commentId,
      });
      // Refresh comments
      await fetchComments();
      setCommentText('');
      setReplyTo(null);
      // Update comment count
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      logger.info('Comment created', newComment.id);
    } catch (err: unknown) {
      logger.error('Failed to create comment', err);
      const msg = (err as { message?: string; response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? '';
      if (msg.includes('禁言')) {
        toast.error(msg || '您已被禁言，无法发表评论');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!id || !post) return;
    if (!await showConfirm('确定要删除这篇帖子吗？')) return;
    try {
      if (isAdmin) {
        await adminApi.deletePost(id);
      } else {
        await postsApi.deletePost(id);
      }
      navigate('/');
    } catch (err: unknown) {
      logger.error('Failed to delete post', err);
    }
  };

  const handleUpdateCategory = async (newCategoryId: string) => {
    if (!id) return;
    try {
      await adminApi.updatePostCategory(id, newCategoryId);
      setSelectedCategory(newCategoryId);
      setPost((prev) => {
        if (!prev) return prev;
        const cat = categories.find((c) => c.id === newCategoryId);
        return { ...prev, categoryId: newCategoryId, categoryName: cat?.name || prev.categoryName };
      });
      setShowCategoryEdit(false);
    } catch (err: unknown) {
      logger.error('Failed to update category', err);
    }
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

  const isAuthor = post && currentUser && post.authorName === currentUser.nickname;

  const renderComment = (comment: Comment, depth = 0) => (
    <div
      key={comment.id}
      className={`py-3 border-b border-slate-100 last:border-0 ${
        depth > 0 ? 'ml-6 pl-3 border-l-2 border-slate-100' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-800">{comment.authorName}</span>
        <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">{comment.content}</p>
      <button
        onClick={() =>
          setReplyTo({ commentId: comment.id, authorName: comment.authorName })
        }
        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
      >
        <MessageCircle className="size-3.5" />
        回复
      </button>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="p-6 animate-pulse">
          <div className="h-7 bg-slate-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-slate-100 rounded w-full mb-2" />
          <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500">{error || '帖子不存在'}</p>
        <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </Card>
    );
  }

   return (
     <div className="space-y-6">
       {/* 返回按钮 */}
       <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
         <ArrowLeft className="size-4" />
         返回
       </Button>

      {/* 帖子内容 */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{post.categoryName}</Badge>
            {isAdmin && (
              <>
                {showCategoryEdit ? (
                  <Select value={selectedCategory} onValueChange={handleUpdateCategory}>
                    <SelectTrigger className="w-40 h-8 text-xs">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryEdit(true)}
                  >
                    修改分类
                  </Button>
                )}
              </>
            )}
          </div>
          {(isAdmin || isAuthor) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePost}
              className="gap-1"
            >
              <Trash2 className="size-4" />
              删除帖子
            </Button>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-3">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 flex-wrap">
          <span>{post.authorName}</span>
          <span>{formatDate(post.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Eye className="size-4" />
            {post.viewCount} 浏览
          </span>
        </div>

         <div className="prose prose-slate max-w-none mb-6 whitespace-pre-wrap text-slate-700">
           {post.content}
         </div>

         {post.images && post.images.length > 0 && (
           <div className={`grid gap-3 mb-6 ${
             post.images.length === 1
               ? 'grid-cols-1'
               : post.images.length === 2
               ? 'grid-cols-2'
               : 'grid-cols-2 sm:grid-cols-3'
           }`}>
             {post.images.map((url, idx) => (
               <button
                 key={idx}
                 type="button"
                 onClick={() => setPreviewImageIndex(idx)}
                 className="relative aspect-square rounded-md overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
               >
                 <Image
                   src={url}
                   alt={`图片${idx + 1}`}
                   className="w-full h-full object-cover"
                 />
               </button>
             ))}
           </div>
         )}

        {/* 操作栏 */}
        <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
            }`}
          >
            <Heart className={`size-5 ${liked ? 'fill-current' : ''}`} />
            {likeCount}
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              favorited ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'
            }`}
          >
            <Bookmark className={`size-5 ${favorited ? 'fill-current' : ''}`} />
            {favoriteCount}
          </button>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <MessageSquare className="size-5" />
            {post.commentCount}
          </div>
        </div>
      </Card>

      {/* 评论区 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MessageSquare className="size-5" />
          评论 ({comments.length})
        </h3>

        {/* 评论输入 */}
        <div className="mb-6">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
              <span>回复 @{replyTo.authorName}</span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-indigo-600 hover:underline"
              >
                取消
              </button>
            </div>
          )}
          {/* 禁言提示 */}
          {currentUser?.isMuted && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md mb-3">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">您已被禁言，无法发表评论</div>
                {currentUser.muteReason && (
                  <div className="text-red-500 mt-0.5">原因：{currentUser.muteReason}</div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? `回复 @${replyTo.authorName}...` : '写下你的评论...'}
              className="resize-none"
              rows={3}
              disabled={currentUser?.isMuted}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment || currentUser?.isMuted}
              className="self-end bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              <Send className="size-4" />
              发表
            </Button>
          </div>
        </div>

        {/* 评论列表 */}
        {comments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare className="size-6" />
              </EmptyMedia>
              <EmptyTitle>暂无评论</EmptyTitle>
              <EmptyDescription>快来发表第一条评论吧</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => renderComment(comment))}
          </div>
         )}
       </Card>

       {previewImageIndex !== null && post?.images && post.images.length > 0 && (
         <div
           className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
           onClick={() => setPreviewImageIndex(null)}
         >
           <button
             type="button"
             onClick={() => setPreviewImageIndex(null)}
             className="absolute top-4 right-4 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
             aria-label="关闭预览"
           >
             <X className="size-5" />
           </button>
           <button
             type="button"
             onClick={(e) => {
               e.stopPropagation();
               if (previewImageIndex > 0) setPreviewImageIndex(previewImageIndex - 1);
             }}
             className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
             disabled={previewImageIndex === 0}
             aria-label="上一张"
           >
             <ChevronLeft className="size-5" />
           </button>
           <button
             type="button"
             onClick={(e) => {
               e.stopPropagation();
               if (previewImageIndex < post.images.length - 1) {
                 setPreviewImageIndex(previewImageIndex + 1);
               }
             }}
             className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
             disabled={previewImageIndex === post.images.length - 1}
             aria-label="下一张"
           >
             <ChevronRight className="size-5" />
           </button>
           <Image
             src={post.images[previewImageIndex]}
             alt={`图片${previewImageIndex + 1}`}
             className="max-w-full max-h-[85vh] object-contain"
           />
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">
             {previewImageIndex + 1} / {post.images.length}
           </div>
         </div>
       )}
     </div>
   );
 };

export default PostDetailPage;
