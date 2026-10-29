import React, { useEffect } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginDestination } from '../../application/auth-navigation';
import { authService } from '../../composition';
import { BrandWordmark } from '@/shared/presentation/components';
import { RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const { user, loading, sessionError, refreshSession } = useAuth();
  const [params] = useSearchParams();
  const returnPath = params.get('returnTo') || (location.state as { returnTo?: string } | null)?.returnTo || '/';
  const targetUrl = authService.getLoginUrl(returnPath);

  useEffect(() => {
    if (!loading && !user && !sessionError) window.location.replace(targetUrl);
  }, [targetUrl, loading, user, sessionError]);

  if (user && !loading && !sessionError) return <Navigate to={loginDestination(user, returnPath)} replace />;
  if (sessionError) return <div role="alert" className="p-10 text-center"><p>{sessionError}</p><button type="button" onClick={() => void refreshSession()} className="mt-4 rounded-full border px-5 py-2">Thử lại</button></div>;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--gt-border)] bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size="lg" />
        </div>
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gt-brand-soft)] text-[var(--gt-brand)]">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-[var(--gt-ink)]">
          Đang chuyển đến Cổng đăng nhập GoTravel ID...
        </h2>
        <p className="mt-2 text-xs text-[var(--gt-muted)]">
          Hệ thống đang chuyển hướng bạn an toàn đến cổng xác thực tài khoản chung.
        </p>

        <a
          href={targetUrl}
          className="mt-6 inline-block text-xs font-bold text-[var(--gt-brand)] hover:underline"
        >
          Bấm vào đây nếu trình duyệt không tự chuyển hướng →
        </a>
      </div>
    </div>
  );
};
