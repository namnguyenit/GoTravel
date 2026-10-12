import React, { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { authService } from '../../composition';
import { BrandWordmark } from '@/shared/presentation/components';
import { RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const returnPath = params.get('returnTo') || (location.state as { returnTo?: string } | null)?.returnTo || '/';
  const targetUrl = authService.getLoginUrl(returnPath);

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--gt-border)] bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size="lg" />
        </div>
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]">
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
          className="mt-6 inline-block text-xs font-bold text-[var(--gt-coral)] hover:underline"
        >
          Bấm vào đây nếu trình duyệt không tự chuyển hướng →
        </a>
      </div>
    </div>
  );
};
