import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Send } from 'lucide-react';
import * as postsApi from '@/api/posts';
import * as categoriesApi from '@/api/categories';
import * as usersApi from '@/api/users';
import type { Category, UserProfileInfo } from '@shared/api.interface';
import PostImageUploader from '../HomePage/PostImageUploader';

const CreatePostPage = () => {
  const navigate = useNavigate();

   const [title, setTitle] = useState('');
   const [content, setContent] = useState('');
   const [categoryId, setCategoryId] = useState('');
   const [imageUrls, setImageUrls] = useState<string[]>([]);
   const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, userProfile] = await Promise.all([
          categoriesApi.listCategories(),
          usersApi.getProfile(),
        ]);
        setCategories(cats);
        setProfile(userProfile);
        if (cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }
      } catch (err: unknown) {
        logger.error('Failed to load create post data', err);
        setError('加载数据失败');
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('请填写完整信息');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
       const post = await postsApi.createPost({
         title: title.trim(),
         content: content.trim(),
         categoryId,
         imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
       });
      logger.info('Post created', post.id);
      navigate(`/post/${post.id}`);
    } catch (err: unknown) {
      logger.error('Failed to create post', err);
      setError('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const isMuted = profile?.isMuted;

  if (isMuted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <Alert variant="warning">
            <AlertTriangle className="size-5" />
            <AlertTitle className="text-lg font-semibold">您已被禁言</AlertTitle>
            <AlertDescription className="mt-2">
              {profile.muteReason || '抱歉，您暂时无法发布帖子。如有疑问请联系管理员。'}
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">发布新帖</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              标题 <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入帖子标题"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-slate-400 text-right">{title.length}/100</p>
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              分类 <span className="text-red-500">*</span>
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

           {/* 内容 */}
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1.5">
               内容 <span className="text-red-500">*</span>
             </label>
             <Textarea
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="请输入帖子内容..."
               rows={12}
               className="resize-none"
             />
             <p className="mt-1 text-xs text-slate-400 text-right">
               {content.length} 字
             </p>
           </div>

           {/* 图片 */}
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1.5">
               图片
             </label>
             <PostImageUploader
               images={imageUrls}
               onChange={setImageUrls}
             />
           </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim() || !categoryId}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Send className="size-4" />
              {submitting ? '发布中...' : '发布帖子'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreatePostPage;
