import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ban, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import * as adminApi from '@/api/admin';
import type { AdminUser } from '@shared/api.interface';

interface MuteDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MUTE_OPTIONS = [
  { value: 'permanent', label: '永久禁言', hours: null },
  { value: '1day', label: '禁言 1 天', hours: 24 },
  { value: '7days', label: '禁言 7 天', hours: 24 * 7 },
  { value: '30days', label: '禁言 30 天', hours: 24 * 30 },
];

export const MuteUserDialog = ({ user, open, onOpenChange, onSuccess }: MuteDialogProps) => {
  const [duration, setDuration] = useState('permanent');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const option = MUTE_OPTIONS.find((o) => o.value === duration);
      const expiresAt = option?.hours
        ? new Date(Date.now() + option.hours * 60 * 60 * 1000).toISOString()
        : undefined;
      await adminApi.muteUser({
        userId: user.userId,
        reason: reason.trim() || undefined,
        expiresAt,
      });
      setReason('');
      setDuration('permanent');
      toast.success(`已成功禁言 ${user?.nickname || '用户'}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error('Failed to mute user', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '禁言失败，请稍后重试';
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-red-500" />
            禁言用户
          </DialogTitle>
          <DialogDescription>
            将对 <span className="font-medium text-slate-700">{user?.nickname}</span>{' '}
            <span className="text-slate-400">@{user?.username}</span> 执行禁言操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">禁言时长</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">禁言原因（可选）</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：违规发布广告"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
          )}
        </div>

        <DialogFooter className="flex-row sm:flex-col sm:items-stretch">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 gap-2"
          >
            <Ban className="size-4" />
            {submitting ? '提交中...' : '确认禁言'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface UserManagementProps {
  users: AdminUser[];
  loading: boolean;
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  onMute: (user: AdminUser) => void;
  onUnmute: (user: AdminUser) => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const UserManagementTable = ({
  users,
  loading,
  searchKeyword,
  onSearchChange,
  onMute,
  onUnmute,
  total,
  page,
  pageSize,
  onPageChange,
}: UserManagementProps) => {
  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索昵称或用户名..."
            className="pl-10"
          />
          {searchKeyword && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500">共 {total} 位用户</div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          {searchKeyword ? '没有找到匹配的用户' : '暂无用户'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-50 text-xs font-medium text-slate-500">
              <div className="col-span-3">用户</div>
              <div className="col-span-2">注册时间</div>
              <div className="col-span-3">状态</div>
              <div className="col-span-2">角色</div>
              <div className="col-span-2 text-right">操作</div>
            </div>
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div
                  key={u.userId}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-sm hover:bg-slate-50"
                >
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{u.nickname}</div>
                    <div className="text-xs text-slate-400 truncate">@{u.username}</div>
                  </div>
                  <div className="col-span-2 text-slate-500 text-xs">
                    {formatDate(u.createdAt)}
                  </div>
                  <div className="col-span-3">
                    {u.isMuted ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="destructive" className="w-fit text-xs">
                          已禁言
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {u.muteExpiresAt ? `到期：${formatDate(u.muteExpiresAt)}` : '永久'}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-600">
                        正常
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        u.role === 'admin'
                          ? 'border-indigo-200 text-indigo-600 bg-indigo-50'
                          : ''
                      }`}
                    >
                      {u.role === 'admin' ? '管理员' : '普通用户'}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right">
                    {u.isMuted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => onUnmute(u)}
                      >
                        解禁
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => onMute(u)}
                      >
                        禁言
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {users.map((u) => (
              <div
                key={u.userId}
                className="border border-slate-200 rounded-lg p-3.5 bg-white"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 break-words">
                      {u.nickname}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      @{u.username}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {u.isMuted ? (
                      <Badge variant="destructive" className="text-xs">
                        已禁言
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-50 text-green-600"
                      >
                        正常
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      u.role === 'admin'
                        ? 'border-indigo-200 text-indigo-600 bg-indigo-50'
                        : ''
                    }`}
                  >
                    {u.role === 'admin' ? '管理员' : '普通用户'}
                  </Badge>
                  <span>注册于 {formatDate(u.createdAt)}</span>
                </div>

                {u.isMuted && u.muteExpiresAt && (
                  <div className="text-xs text-amber-600 mt-1.5">
                    到期：{formatDate(u.muteExpiresAt)}
                  </div>
                )}

                <div className="flex justify-end mt-3">
                  {u.isMuted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => onUnmute(u)}
                    >
                      解禁
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => onMute(u)}
                    >
                      禁言
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
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
    </div>
  );
};
