import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 20) {
      setError('用户名长度应在 3-20 个字符之间');
      return;
    }
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setError('昵称长度应在 2-20 个字符之间');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await register(username.trim(), trimmedPassword, nickname.trim());
      logger.info('Register success, auto login');
      await login(username.trim(), trimmedPassword);
      navigate('/');
    } catch (err: unknown) {
      logger.error('Register failed', err);
      const responseData = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      const message = responseData?.message ?? '';
      const displayMessage = message || '注册失败，请稍后重试';
      setError(displayMessage);
      toast.error(displayMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <GraduationCap className="size-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">创建账号</h1>
          <p className="text-sm text-slate-500 mt-2">加入校园论坛，开启你的交流之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              用户名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 个字符"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              昵称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2-20 个字符"
              autoComplete="nickname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              密码 <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              确认密码 <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <UserPlus className="size-4" />
            {submitting ? '注册中...' : '注 册'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          已有账号？{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            去登录
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
