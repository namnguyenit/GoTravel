import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/presentation/context/AuthContext';
import {
  Ticket,
  User,
  LogOut,
  Shield,
  Building2,
  UserCheck,
  Menu,
  X,
  MessageSquareWarning,
  ChevronDown,
  Compass,
} from 'lucide-react';
import { BrandWordmark } from './brand/BrandWordmark';

export const Navbar: React.FC = () => {
  const { user, loading, logout, login, sessionError, refreshSession } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isSearchActive = location.pathname.startsWith('/search');
  const isTicketsActive = location.pathname.startsWith('/account/tickets');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-xs no-print">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <BrandWordmark to="/" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            to="/search"
            className={`text-sm font-semibold transition-all px-3 py-1.5 rounded-full ${
              isSearchActive
                ? 'text-[#FF385C] bg-[#FFF0F2]'
                : 'text-gray-700 hover:text-[#FF385C] hover:bg-gray-50'
            }`}
          >
            Khám phá
          </Link>
          <Link
            to="/account/tickets"
            className={`text-sm font-semibold transition-all px-3 py-1.5 rounded-full ${
              isTicketsActive
                ? 'text-[#FF385C] bg-[#FFF0F2]'
                : 'text-gray-700 hover:text-[#FF385C] hover:bg-gray-50'
            }`}
          >
            Xem vé
          </Link>
        </nav>

        {/* User / Portal Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : sessionError ? (
            <button
              type="button"
              onClick={() => void refreshSession()}
              className="min-h-11 rounded-full px-4 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              Thử lại kết nối
            </button>
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 transition-all cursor-pointer ring-1 ring-gray-200/60"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF385C] to-[#FFA07A] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 mr-1" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_24px_50px_rgba(15,23,42,0.16)] border border-white/80 py-2.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/account/tickets"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        <Ticket className="w-4 h-4 text-gray-400" />
                        Vé của tôi
                      </Link>

                      <Link
                        to="/account/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        Hồ sơ cá nhân
                      </Link>

                      <Link
                        to="/account/disputes"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        <MessageSquareWarning className="w-4 h-4 text-gray-400" />
                        Khiếu nại của tôi
                      </Link>
                    </div>

                    {(user.isVendor() || user.isStaff() || user.isAdmin() || (!user.isVendor() && !user.isStaff() && !user.isAdmin())) && (
                      <div className="border-t border-gray-100 py-1 my-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Không gian làm việc
                        </div>

                        {user.isVendor() && (
                          <Link
                            to="/operator"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-[#FF385C] font-semibold hover:bg-[#FFF0F2]"
                          >
                            <Building2 className="w-4 h-4 text-[#FF385C]" />
                            Kênh Nhà xe
                          </Link>
                        )}

                        {user.isStaff() && (
                          <Link
                            to="/staff"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-emerald-700 font-semibold hover:bg-emerald-50"
                          >
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            Cổng Nhân viên
                          </Link>
                        )}

                        {user.isAdmin() && (
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-gray-900 font-semibold hover:bg-gray-100"
                          >
                            <Shield className="w-4 h-4 text-gray-900" />
                            Quản trị hệ thống
                          </Link>
                        )}

                        {!user.isVendor() && !user.isStaff() && !user.isAdmin() && (
                          <Link
                            to="/become-operator"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Building2 className="w-4 h-4 text-gray-400" />
                            Đăng ký Nhà xe
                          </Link>
                        )}
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          void logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => login('/account/tickets')}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#FF385C] hover:bg-[#FFF0F2] transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
              <Link
                to="/become-operator"
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#111827] text-white hover:bg-[#FF385C] shadow-xs transition-colors"
              >
                Mở nhà xe
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-xl text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/60 bg-white/95 backdrop-blur-2xl px-5 py-5 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1">
              Khách hàng
            </div>
            <Link
              to="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-900 hover:bg-[#FFF0F2] hover:text-[#FF385C]"
            >
              <Compass className="w-4 h-4 text-[#FF385C]" />
              Tìm chuyến xe
            </Link>
            <Link
              to="/account/tickets"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-900 hover:bg-[#FFF0F2] hover:text-[#FF385C]"
            >
              <Ticket className="w-4 h-4 text-[#FF385C]" />
              Vé của tôi
            </Link>
          </div>

          {(user?.isVendor() || user?.isStaff() || user?.isAdmin()) && (
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1">
                Kênh điều hành
              </div>
              {user.isVendor() && (
                <Link
                  to="/operator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#FF385C] hover:bg-[#FFF0F2]"
                >
                  <Building2 className="w-4 h-4" />
                  Kênh quản lý nhà xe
                </Link>
              )}
              {user.isStaff() && (
                <Link
                  to="/staff"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <UserCheck className="w-4 h-4" />
                  Cổng nhân viên soát vé
                </Link>
              )}
              {user.isAdmin() && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  <Shield className="w-4 h-4" />
                  Quản trị Admin
                </Link>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void logout();
                }}
                className="flex items-center gap-2 text-sm text-rose-600 font-bold"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất ({user.fullName})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => login()}
                className="w-full py-3 bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-full text-sm font-bold shadow-md transition-colors"
              >
                Đăng nhập SSO
              </button>
            )}
          </div>
        </div>
      )}

      {sessionError && (
        <div
          role="alert"
          className="border-t border-rose-100 bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-800 font-medium"
        >
          {sessionError}{' '}
          <button
            type="button"
            disabled={loading}
            onClick={() => void refreshSession()}
            className="ml-2 font-bold underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
          >
            Thử lại
          </button>
        </div>
      )}
    </header>
  );
};
