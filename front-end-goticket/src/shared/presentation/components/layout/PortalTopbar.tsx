import React from 'react';
import { Link } from 'react-router-dom';
import { BrandWordmark } from '../brand/BrandWordmark';
import { Menu, X, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../../../modules/auth/presentation/context/AuthContext';

interface PortalTopbarProps {
  roleBadge: string;
  scopeTitle?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const PortalTopbar: React.FC<PortalTopbarProps> = ({
  roleBadge,
  scopeTitle,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <BrandWordmark to="/" variant="portal" badge={roleBadge} />
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-sm">
        {scopeTitle && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200/60 text-xs font-semibold text-gray-800 max-w-[240px] truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{scopeTitle}</span>
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:text-[#FF385C] hover:border-[#FF385C]/30 hover:bg-[#FFF0F2]/40 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kênh khách hàng</span>
        </Link>

        {user && (
          <div className="flex items-center gap-2 pl-1 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-gray-800 max-w-[130px] truncate">
              {user.fullName}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void logout()}
          className="p-1.5 text-gray-500 hover:text-[#B42318] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
