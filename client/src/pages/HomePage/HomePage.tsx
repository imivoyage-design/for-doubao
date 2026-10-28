import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image } from '@client/src/components/ui/image';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Eye,
  Heart,
  MessageSquare,
  Bookmark,
  Search,
  Clock,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/api/posts';
import * as categoriesApi from '@/api/categories';
import CreatePostCard from './CreatePostCard';
import type { Category, Post } from '@shared/api.interface';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const page = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const categoryId = searchParams.get('categoryId') || '';
  const keyword = searchParams.get('keyword') || '';
  const sortBy = (searchParams.get('sortBy') as 'latest' | 'hot') || 'latest';

  const [searchInput, setSearchInput] = useState(keyword);
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const currentCategoryName = categoryId
    ? categories.find((c: Category) => c.id === categoryId)?.name || ''
    : '全部帖子';

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.listCategories();
      setCategories(data);
    } catch (err: unknown) {
      logger.error('Failed to fetch categories', err);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listPosts({
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        page,
        pageSize,
        sortBy,
      });
      setPosts(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch posts', err);
      setError('加载帖子失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [categoryId, keyword, page, sortBy]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const totalPages = Math.ceil(total / pageSize);

  const handleCategoryClick = (catId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (catId) {
      newParams.set('categoryId', catId);
    } else {
      newParams.delete('categoryId');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
    setCategoryExpanded(false);
  };

  const handleSortChange = (sort: 'latest' | 'hot') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sortBy', sort);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('keyword', searchInput.trim());
    } else {
      newParams.delete('keyword');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const truncateContent = (content: string, maxLen: number) => {
    const plain = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => page > 1 && handlePageChange(page - 1)}
              className={page <= 1 ? 'pointer-events-none opacity-50 cursor-pointer' : 'cursor-pointer'}
            />
          </PaginationItem>
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === page}
                  onClick={() => handlePageChange(p)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => page < totalPages && handlePageChange(page + 1)}
              className={page >= totalPages ? 'pointer-events-none opacity-50 cursor-pointer' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-56 shrink-0">
        <Card className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer md:cursor-default"
            onClick={() => setCategoryExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800">分类</h3>
              {categoryId && (
                <Badge
                  variant="secondary"
                  className="text-xs font-normal truncate max-w-[120px]"
                >
                  {currentCategoryName}
                </Badge>
              )}
            </div>
            <button
              type="button"
              className="md:hidden text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={categoryExpanded ? '收起分类' : '展开分类'}
            >
              {categoryExpanded ? (
                <ChevronUp className="size-5" />
              ) : (
                <ChevronDown className="size-5" />
              )}
            </button>
          </div>
          <div className="hidden md:block mt-3">
            <div className="space-y-1">
              <button
                onClick={() => handleCategoryClick('')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  !categoryId
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                全部帖子
              </button>
              {categories.map((cat: Category) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    categoryId === cat.id
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {categoryExpanded && (
              <motion.div
                key="mobile-categories"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="md:hidden overflow-hidden"
              >
                <div className="space-y-1 pt-3">
                  <button
                    onClick={() => handleCategoryClick('')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      !categoryId
                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    全部帖子
                  </button>
                  {categories.map((cat: Category) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        categoryId === cat.id
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </aside>

      <div className="flex-1 min-w-0">
        <CreatePostCard categories={categories} onPosted={fetchPosts} />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索帖子关键词..."
                className="pl-10"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'latest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('latest')}
              className={sortBy === 'latest' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              <Clock className="size-4" />
              最新
            </Button>
            <Button
              variant={sortBy === 'hot' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('hot')}
              className={sortBy === 'hot' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              <TrendingUp className="size-4" />
              最热
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-red-500">{error}</Card>
        ) : posts.length === 0 ? (
          <Card className="p-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无帖子</EmptyTitle>
                <EmptyDescription>
                  {keyword ? '没有找到匹配的帖子，试试其他关键词' : '快来发布第一篇帖子吧'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post: Post) => (
                <Card
                  key={post.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (post.id) navigate(`/post/${post.id}`);
                  }}
                >
                   <div className="flex items-start gap-3">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-2 flex-wrap">
                         <h3 className="text-lg font-semibold text-slate-900 truncate">
                           {post.title}
                         </h3>
                         <Badge variant="secondary" className="shrink-0">
                           {post.categoryName}
                         </Badge>
                       </div>
                       <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                         {truncateContent(post.content, 100)}
                       </p>
                       <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                         <span>{post.authorName}</span>
                         <span>{formatDate(post.createdAt)}</span>
                         <span className="flex items-center gap-1">
                           <Eye className="size-3.5" />
                           {post.viewCount}
                         </span>
                         <span className="flex items-center gap-1">
                           <Heart className="size-3.5" />
                           {post.likeCount}
                         </span>
                         <span className="flex items-center gap-1">
                           <MessageSquare className="size-3.5" />
                           {post.commentCount}
                         </span>
                         <span className="flex items-center gap-1">
                           <Bookmark className="size-3.5" />
                           {post.favoriteCount}
                         </span>
                       </div>
                     </div>
                     {post.images && post.images.length > 0 && (
                       <div className="shrink-0 size-20 sm:size-24 rounded-md overflow-hidden bg-slate-100">
                         <Image
                           src={post.images[0]}
                           alt={post.title}
                           className="w-full h-full object-cover"
                         />
                       </div>
                     )}
                   </div>
                </Card>
              ))}
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
