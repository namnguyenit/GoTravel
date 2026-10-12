import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/presentation/context/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SurfaceCard, Button } from '../components';

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
        className="mt-5 min-h-11 rounded-xl bg-coral hover:bg-coral-dark px-5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
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
        <div className="w-8 h-8 border-3 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface rounded-2xl border border-line text-center shadow-card">
        <div className="w-12 h-12 bg-coral-soft text-coral rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-serif font-bold text-ink mb-2">Yêu cầu đăng nhập</h3>
        <p className="text-sm text-muted mb-6">
          Vui lòng đăng nhập qua hệ sinh thái GoTravel ID để tiếp tục thao tác.
        </p>
        <button
          type="button"
          onClick={() => login(`${location.pathname}${location.search}${location.hash}`)}
          className="w-full py-2.5 bg-coral hover:bg-coral-dark text-white font-medium rounded-xl transition-colors shadow-xs"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export const OperatorGuard: React.FC = () => {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  if (!user.isVendor() && !user.isAdmin()) {
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
          <Link
            to="/become-operator"
            className="w-full py-2.5 bg-coral hover:bg-coral-dark text-white font-medium rounded-xl transition-colors"
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

  return <Outlet />;
};

export const StaffGuard: React.FC = () => {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  if (!user.isStaff() && !user.isVendor() && !user.isAdmin()) {
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

  return <Outlet />;
};

export const AdminGuard: React.FC = () => {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }
  if (!user.isAdmin()) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface rounded-2xl border border-line text-center shadow-card">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-serif font-bold text-ink mb-2">Yêu cầu quyền Quản trị viên</h3>
        <p className="text-sm text-muted mb-6">
          Bạn cần đăng nhập bằng tài khoản có vai trò `ROLE_ADMIN` để truy cập trang này.
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

  return <Outlet />;
};
