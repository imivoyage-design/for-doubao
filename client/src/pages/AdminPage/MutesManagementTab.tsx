import { useState, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Ban, Users, AlertTriangle } from 'lucide-react';
import * as adminApi from '@/api/admin';
import type { MutedUser } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';

interface MutesManagementProps {
  formatDate: (dateStr: string) => string;
}

export const MutesManagementTab = ({ formatDate }: MutesManagementProps) => {
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [loadingMutes, setLoadingMutes] = useState(false);
  const [muteUserId, setMuteUserId] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('');
  const [submittingMute, setSubmittingMute] = useState(false);
  const [muteError, setMuteError] = useState<string | null>(null);

  const fetchMutedUsers = useCallback(async () => {
    setLoadingMutes(true);
    try {
      const data = await adminApi.listMutes();
      setMutedUsers(data);
    } catch (err: unknown) {
      logger.error('Failed to fetch muted users', err);
    } finally {
      setLoadingMutes(false);
    }
  }, []);

  const handleMuteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muteUserId.trim()) {
      toast.error('请输入用户 ID 或用户名');
      return;
    }
    setSubmittingMute(true);
    setMuteError(null);
    try {
      const expiresAt = muteDuration
        ? new Date(Date.now() + parseInt(muteDuration, 10) * 60 * 60 * 1000).toISOString()
        : undefined;
      await adminApi.muteUser({
        userId: muteUserId.trim(),
        reason: muteReason.trim() || undefined,
        expiresAt,
      });
      toast.success(`已成功禁言 ${muteUserId.trim()}`);
      setMuteUserId('');
      setMuteReason('');
      setMuteDuration('');
      await fetchMutedUsers();
    } catch (err: unknown) {
      logger.error('Failed to mute user', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '禁言失败，请检查用户 ID 或用户名';
      toast.error(msg);
      setMuteError(msg);
    } finally {
      setSubmittingMute(false);
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    if (!(await showConfirm('确定要解除该用户的禁言吗？'))) return;
    try {
      await adminApi.unmuteUser(userId);
      toast.success('已解除禁言');
      setMutedUsers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err: unknown) {
      logger.error('Failed to unmute user', err);
      const msg =
        (err as any)?.response?.data?.error?.message || '解除禁言失败，请稍后重试';
      toast.error(msg);
    }
  };

  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    setLoaded(true);
    fetchMutedUsers();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Ban className="size-4 text-red-500" />
          手动禁言（按用户 ID 或用户名）
        </h3>
        <form onSubmit={handleMuteUser} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">用户 ID 或用户名</label>
              <Input
                value={muteUserId}
                onChange={(e) => setMuteUserId(e.target.value)}
                placeholder="请输入用户 ID 或用户名"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                禁言时长（小时，可选）
              </label>
              <Input
                value={muteDuration}
                onChange={(e) => setMuteDuration(e.target.value)}
                placeholder="留空表示永久禁言"
                type="number"
                min="1"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">禁言原因（可选）</label>
              <Input
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="如：违规发布广告"
              />
            </div>
          </div>
          {muteError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{muteError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submittingMute || !muteUserId.trim()}
              className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto"
            >
              <Ban className="size-4" />
              {submittingMute ? '提交中...' : '禁言用户'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="px-6 py-3 text-sm font-semibold text-slate-800 border-b border-slate-100 flex items-center gap-2">
          <Users className="size-4" />
          当前禁言列表（{mutedUsers.length}）
        </h3>
        {loadingMutes ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : mutedUsers.length === 0 ? (
          <div className="p-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无禁言用户</EmptyTitle>
                <EmptyDescription>当前没有被禁言的用户</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="divide-y divide-slate-100">
                <div className="px-6 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 bg-slate-50">
                  <div className="col-span-3">用户</div>
                  <div className="col-span-3">原因</div>
                  <div className="col-span-2">操作人</div>
                  <div className="col-span-2">禁言时间</div>
                  <div className="col-span-1">到期时间</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>
                {mutedUsers.map((mute) => (
                  <div
                    key={mute.id}
                    className="px-6 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-slate-50"
                  >
                    <div className="col-span-3 font-medium text-slate-800">
                      {mute.nickname || mute.userName}
                      <div className="text-xs text-slate-400">@{mute.username || mute.userId}</div>
                    </div>
                    <div className="col-span-3 text-slate-600 text-sm truncate">
                      {mute.reason || '-'}
                    </div>
                    <div className="col-span-2 text-slate-600">{mute.mutedByName}</div>
                    <div className="col-span-2 text-slate-500 text-xs">
                      {formatDate(mute.createdAt)}
                    </div>
                    <div className="col-span-1 text-xs">
                      {mute.expiresAt ? (
                        <span className="text-amber-600">{formatDate(mute.expiresAt)}</span>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          永久
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleUnmuteUser(mute.userId)}
                      >
                        解除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-slate-100">
              {mutedUsers.map((mute) => (
                <div key={mute.id} className="px-4 py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm break-words">
                        {mute.nickname || mute.userName}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        @{mute.username || mute.userId}
                      </div>
                    </div>
                    {mute.expiresAt ? (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                        到期：{formatDate(mute.expiresAt)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        永久
                      </Badge>
                    )}
                  </div>

                  {mute.reason && (
                    <div className="text-xs text-slate-600 mt-2 break-words">
                      原因：{mute.reason}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>操作人：{mute.mutedByName}</span>
                    <span>{formatDate(mute.createdAt)}</span>
                  </div>

                  <div className="flex justify-end mt-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleUnmuteUser(mute.userId)}
                    >
                      解除禁言
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
