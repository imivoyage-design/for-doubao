import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PenSquare, LogIn, Send, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/api/posts';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@shared/api.interface';
import PostImageUploader from './PostImageUploader';

interface CreatePostCardProps {
  categories: Category[];
  onPosted?: () => void;
}

const CreatePostCard = ({ categories, onPosted }: CreatePostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [postFormOpen, setPostFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(
     categories.length > 0 ? categories[0].id : '',
   );
   const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
   const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !newCategoryId) {
      setPostError('请填写标题、内容并选择分类');
      return;
    }
    setSubmitting(true);
    setPostError(null);
    try {
       const post = await api.createPost({
         title: newTitle.trim(),
         content: newContent.trim(),
         categoryId: newCategoryId,
         imageUrls: newImageUrls.length > 0 ? newImageUrls : undefined,
       });
        setNewTitle('');
        setNewContent('');
        setNewImageUrls([]);
        setPostFormOpen(false);
        onPosted?.();
      } catch (err: unknown) {
       logger.error('Failed to create post', err);
       const msg = (err as { message?: string; response?: { data?: { message?: string } } })?.response?.data?.message
         ?? (err as Error)?.message
         ?? '';
       if (msg.includes('禁言')) {
         toast.error(msg || '您已被禁言，无法发布内容');
       } else {
         setPostError('发布失败，请稍后重试');
       }
     } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      {user ? (
        postFormOpen ? (
          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <PenSquare className="size-4 text-indigo-600" />
                发布新帖
              </h3>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setPostFormOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            {user.isMuted && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">您已被禁言，无法发布内容</div>
                  {user.muteReason && (
                    <div className="text-red-500 mt-0.5">原因：{user.muteReason}</div>
                  )}
                </div>
              </div>
            )}
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="帖子标题..."
              maxLength={100}
              disabled={user.isMuted}
            />
            <div className="flex gap-2">
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: Category) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <Textarea
               value={newContent}
               onChange={(e) => setNewContent(e.target.value)}
               placeholder="分享你的想法..."
               rows={5}
               disabled={user.isMuted}
             />
             <PostImageUploader
               images={newImageUrls}
               onChange={setNewImageUrls}
               disabled={user.isMuted}
             />
            {postError && (
              <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
                {postError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPostFormOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={submitting || !newTitle.trim() || !newContent.trim() || user.isMuted}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Send className="size-4" />
                {submitting ? '发布中...' : '发布帖子'}
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setPostFormOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left group"
          >
            <div className="size-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <PenSquare className="size-4 text-indigo-500" />
            </div>
            <span className="text-slate-400 group-hover:text-indigo-600 transition-colors text-sm">
              有什么想分享的？点击发布新帖...
            </span>
          </button>
        )
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
              <PenSquare className="size-4 text-slate-400" />
            </div>
            <span className="text-sm text-slate-500">登录后即可发布帖子</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/login')}
          >
            <LogIn className="size-4" />
            登录
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CreatePostCard;
