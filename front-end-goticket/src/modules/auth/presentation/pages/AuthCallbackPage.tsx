import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginDestination } from '../../application/auth-navigation';

export const AuthCallbackPage = () => {
  const { user, loading, sessionError, refreshSession, login } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <p role="status" className="p-10 text-center text-sm text-gray-600">Đang xác nhận tài khoản vừa đăng nhập…</p>;
  if (user && !sessionError) return <Navigate to={loginDestination(user, params.get('returnTo'))} replace />;
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900">Chưa thể hoàn tất đăng nhập</h1>
      <p role="alert" className="mt-3 text-sm text-gray-600">{sessionError || 'GoTicket chưa nhận được phiên SSO. Vui lòng thử lại.'}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => void refreshSession()} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold">Kiểm tra lại phiên</button>
        <button type="button" onClick={() => login(params.get('returnTo') || undefined)} className="rounded-full bg-[var(--gt-brand)] px-5 py-2 text-sm font-semibold text-white">Đăng nhập lại</button>
      </div>
    </div>
  );
};
