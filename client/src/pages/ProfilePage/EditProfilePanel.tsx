import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { User, Save } from 'lucide-react';
import * as authApi from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfileInfo } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

interface EditProfilePanelProps {
  profile: UserProfileInfo | null;
  onSaved: () => void;
}

const EditProfilePanel = ({ profile, onSaved }: EditProfilePanelProps) => {
  const { refreshUser } = useAuth();

  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setEditNickname(profile.userName);
      setEditBio(profile.bio || '');
      setEditAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNickname.trim()) {
      setProfileError('昵称不能为空');
      return;
    }
    if (editNickname.trim().length < 2 || editNickname.trim().length > 20) {
      setProfileError('昵称长度应在 2-20 个字符之间');
      return;
    }
    if (editBio.length > 200) {
      setProfileError('个人简介不能超过 200 个字符');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    try {
      await authApi.updateProfile({
        nickname: editNickname.trim(),
        bio: editBio.trim() || undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
      });
      toast.success('个人信息已更新');
      await refreshUser();
      onSaved();
    } catch (err: unknown) {
      logger.error('Failed to update profile', err);
      const responseData = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      const message = responseData?.message ?? '';
      const displayMessage = message || '保存失败，请稍后重试';
      setProfileError(displayMessage);
      toast.error(displayMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <User className="size-4 text-indigo-600" />
        修改个人信息
      </h3>
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            昵称
          </label>
          <Input
            value={editNickname}
            onChange={(e) => setEditNickname(e.target.value)}
            placeholder="2-20 个字符"
            maxLength={20}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            头像 URL
          </label>
          <Input
            value={editAvatarUrl}
            onChange={(e) => setEditAvatarUrl(e.target.value)}
            placeholder="填写头像图片链接（可选）"
          />
          {editAvatarUrl.trim() && (
            <div className="mt-2">
              <Avatar className="size-12">
                <Image
                  src={editAvatarUrl.trim()}
                  alt="预览"
                  className="object-cover w-full h-full rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </Avatar>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            个人简介
          </label>
          <Textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="介绍一下自己吧（最多 200 字）"
            rows={4}
            maxLength={200}
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {editBio.length}/200
          </p>
        </div>
        {profileError && (
          <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
            {profileError}
          </div>
        )}
        <Button
          type="submit"
          disabled={savingProfile}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full sm:w-auto"
        >
          <Save className="size-4" />
          {savingProfile ? '保存中...' : '保存修改'}
        </Button>
      </form>
    </Card>
  );
};

export default EditProfilePanel;
