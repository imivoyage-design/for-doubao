import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GraduationCap, User, Settings, LogOut, Menu, X, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from '@client/src/components/ui/image';

const Layout = () => {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-indigo-600">
            <GraduationCap className="size-6" />
            <span className="text-lg">校园论坛</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-indigo-600'
                    : 'text-slate-600 hover:text-indigo-600'
                }`
              }
            >
              首页
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            {loading ? (
              <div className="size-7 rounded-full bg-slate-100 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="size-7">
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.nickname} className="object-cover w-full h-full rounded-full" />
                      ) : (
                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                          {user.nickname ? getInitials(user.nickname) : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user.nickname || '用户'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="size-4" />
                    个人中心
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="size-4" />
                      管理后台
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="size-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/login')}
              >
                <LogIn className="size-4" />
                登录
              </Button>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 px-4 py-3 space-y-2 bg-white">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              首页
            </NavLink>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-[1200px] mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 校园论坛 - 让交流更简单
        </div>
      </footer>
    </div>
  );
};

export default Layout;
