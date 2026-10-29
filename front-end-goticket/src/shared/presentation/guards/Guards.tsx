import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, StaffPortalProvider } from '../../../modules/auth/presentation/context/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SurfaceCard, Button } from '../components';
import { accountHome } from '../../../modules/auth/application/auth-navigation';
import { httpClient } from '../../infrastructure/http/HttpPort';
import type { StaffCapability } from '../../../modules/auth/domain/entity/user-session.entity';

export const CapabilityGuard: React.FC<{ anyOf: StaffCapability[]; children: React.ReactNode }> = ({ anyOf, children }) => {
  const { user } = useAuth();
  if (!user || !anyOf.some(capability => user.hasCapability(capability))) return <div role="alert" className="mx-auto my-12 max-w-lg space-y-4 px-6 text-center">
    <h2 className="text-lg font-bold">Bạn chưa được phân quyền cho chức năng này</h2>
    <p className="text-sm text-muted">Liên hệ quản lý nhà xe để được phân công. Bạn vẫn có thể xem các công việc khác được phép.</p>
    <Link to="/staff/trips" className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold">Về chuyến được phân công</Link>
  </div>;
  return <>{children}</>;
};

const SessionUnavailable: React.FC = () => {
  const { sessionError, refreshSession, loading } = useAuth();
  return (
    <div role="alert" className="mx-auto my-12 max-w-lg px-6 text-center">
      <h2 className="text-lg font-bold text-ink">Chưa thể kiểm tra đăng nhập</h2>
      <p className="mt-2 text-sm text-muted">{sessionError}</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void refreshSession()}
        className="mt-5 min-h-11 rounded-xl bg-brand hover:bg-brand-dark px-5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
};

export const AuthGuard: React.FC = () => {
  const { user, loading, login, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface rounded-2xl border border-line text-center shadow-card">
        <div className="w-12 h-12 bg-brand-soft text-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-serif font-bold text-ink mb-2">Yêu cầu đăng nhập</h3>
        <p className="text-sm text-muted mb-6">
          Vui lòng đăng nhập qua hệ sinh thái GoTravel ID để tiếp tục thao tác.
        </p>
        <button
          type="button"
          onClick={() => login(`${location.pathname}${location.search}${location.hash}`)}
          className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl transition-colors shadow-xs"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export const OperatorGuard: React.FC = () => {
  const { user, loading, sessionError, refreshSession } = useAuth();
  const location = useLocation();
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user?.isVendor()) return;
    const controller = new AbortController();
    setProfileStatus('');
    setProfileError('');
    void httpClient.get<{ status: string }>('/api/v1/operators/me/profile', {
      cache: 'no-store', signal: controller.signal,
    }).then(profile => {
      if (!controller.signal.aborted) setProfileStatus(profile.status || 'UNKNOWN');
    }).catch(error => {
      if (!controller.signal.aborted) setProfileError(error instanceof Error ? error.message : 'Không tải được hồ sơ nhà xe.');
    });
    return () => controller.abort();
  }, [user?.id, user?.isVendor(), attempt]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return <AuthGuard />;
  }

  if (user.isAdmin() && !user.isVendor()) return <Navigate to="/admin" replace />;
  if (!user.isVendor()) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface rounded-2xl border border-line text-center shadow-card">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-serif font-bold text-ink mb-2">Chưa kích hoạt kênh Nhà xe</h3>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Tài khoản của bạn chưa được cấp quyền quản lý Nhà xe (`TICKET_VENDOR`). Bạn có thể nộp hồ sơ đăng ký mở bán vé.
        </p>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => void refreshSession()} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold">
            Đã được duyệt? Cập nhật quyền truy cập
          </button>
          <Link
            to="/become-operator"
            className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl transition-colors"
          >
            Đăng ký mở bán vé xe
          </Link>
          <Link
            to="/"
            className="w-full py-2.5 border border-line text-ink font-medium rounded-xl hover:bg-canvas transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (profileError || (profileStatus && profileStatus !== 'ACTIVE')) {
    return <div role="alert" className="mx-auto my-16 max-w-lg space-y-4 px-6 text-center">
      <h2 className="text-lg font-bold">Chưa thể mở kênh Nhà xe</h2>
      <p className="text-sm text-muted">{profileError || 'Nhà xe đang tạm ngừng hoạt động. Vui lòng liên hệ quản trị viên để được hỗ trợ.'}</p>
      <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-xl bg-brand px-5 font-semibold text-white">Tải lại hồ sơ nhà xe</button>
      <Link to="/" className="block text-sm underline">Về trang chủ</Link>
    </div>;
  }
  if (!profileStatus) return <div role="status" className="p-12 text-center text-muted">Đang tải hồ sơ nhà xe…</div>;
  return <Outlet />;
};

export const StaffGuard: React.FC = () => {
  const { user, loading, sessionError, refreshSession } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return <AuthGuard />;
  }

  if (user.isAdmin() && !user.isStaff() && !user.isVendor()) return <Navigate to="/admin" replace />;
  if (!user.isStaff() && !user.isVendor()) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface rounded-2xl border border-line text-center shadow-card">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-serif font-bold text-ink mb-2">Từ chối truy cập (403)</h3>
        <p className="text-sm text-muted mb-6">
          Khu vực này chỉ dành cho nhân viên điều độ hoặc soát vé được nhà xe phân công.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
      </div>
    );
  }

  if (user.staffAssignmentError || !user.staffAssignments.length) return <div role="alert" className="mx-auto my-16 max-w-lg space-y-4 px-6 text-center">
    <h2 className="text-lg font-bold">Chưa có phân công nhân viên để tác nghiệp</h2>
    <p className="text-sm text-gray-600">{user.staffAssignmentError || 'Liên hệ nhà xe để được phân công. Quyền chủ nhà xe không thay thế phân công trong kênh nhân viên.'}</p>
    <button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => void refreshSession()}>Tải lại phân công</button>
    <Link to={user.isVendor() ? '/operator' : '/'} className="block text-sm underline">Về trang của tôi</Link>
  </div>;
  return <StaffPortalProvider><Outlet /></StaffPortalProvider>;
};

export const AdminGuard: React.FC = () => {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return <AuthGuard />;
  }
  if (!user.isAdmin()) return <Navigate to={accountHome(user)} replace />;

  return <Outlet />;
};
