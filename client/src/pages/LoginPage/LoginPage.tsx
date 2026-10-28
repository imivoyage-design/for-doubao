import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请填写用户名和密码');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      logger.info('Login success');
      navigate('/');
    } catch (err: unknown) {
      logger.error('Login failed', err);
      const responseData = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      const message = responseData?.message ?? '';
      const displayMessage = message || '登录失败，请检查用户名和密码';
      setError(displayMessage);
      toast.error(displayMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <GraduationCap className="size-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
          <p className="text-sm text-slate-500 mt-2">登录校园论坛，继续你的交流</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              用户名
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              密码
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <LogIn className="size-4" />
            {submitting ? '登录中...' : '登 录'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          还没有账号？{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            立即注册
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
