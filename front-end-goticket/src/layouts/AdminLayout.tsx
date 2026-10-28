import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/presentation/context/AuthContext';
import {
  Shield,
  Building2,
  UserCheck,
  AlertOctagon,
  RotateCcw,
  Ban,
  Scale,
  Coins,
  LayoutDashboard,
} from 'lucide-react';
import {
  PortalTopbar,
  PortalSidebar,
  type PortalNavGroup,
} from '@/shared/presentation/components';

export const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navGroups: PortalNavGroup[] = [
    {
      groupTitle: 'Tổng quan',
      items: [
        { label: 'Tổng quan Vận tải', to: '/admin', icon: LayoutDashboard, end: true },
      ],
    },
    {
      groupTitle: 'Nhà xe & Nội dung',
      items: [
        { label: 'Quản lý Nhà xe', to: '/admin/operators', icon: Building2 },
        { label: 'Duyệt đơn KYC Nhà xe', to: '/admin/applications', icon: UserCheck },
      ],
    },
    {
      groupTitle: 'Đơn hàng & Nghiệp vụ',
      items: [
        { label: 'Đơn vé & Tra cứu', to: '/admin/orders', icon: AlertOctagon },
        { label: 'Khiếu nại & Hoàn tiền', to: '/admin/refunds', icon: RotateCcw },
        { label: 'Hủy chuyến xe', to: '/admin/cancellations', icon: Ban },
      ],
    },
    {
      groupTitle: 'Tài chính & Đối soát',
      items: [
        { label: 'Đối soát & Outbox', to: '/admin/reconciliation', icon: Scale },
        { label: 'Quyết toán & Hoa hồng', to: '/admin/payouts', icon: Coins },
      ],
    },
    {
      groupTitle: 'Hệ thống & Chính sách',
      items: [
        { label: 'Tài khoản & Phân quyền', to: '/admin/accounts', icon: Shield },
        { label: 'Chính sách hệ thống', to: '/admin/policies', icon: Scale },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--gt-canvas)] flex flex-col font-sans relative overflow-x-hidden selection:bg-[var(--gt-coral)]/20 selection:text-[var(--gt-coral)]">
      {/* Ambient optical chromatic orbs */}
      <div className="fixed top-[-100px] left-[-80px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#FF385C]/10 via-[#FF6B8B]/5 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="fixed top-[20%] right-[-120px] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-blue-400/8 via-sky-300/5 to-transparent blur-[130px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] left-[25%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-400/8 via-rose-300/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      <PortalTopbar
        roleBadge="Quản trị"
        scopeTitle="Hệ thống Vận tải GoTicket"
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <PortalSidebar
          groups={navGroups}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          headerSlot={
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-[var(--gt-muted)]">
                Phân hệ Quản trị
              </p>
              <p className="text-sm font-bold text-[var(--gt-ink)] mt-0.5 truncate">
                {user?.fullName || 'Quản trị viên'}
              </p>
            </div>
          }
          footerSlot={
            <div className="text-[11px] text-[var(--gt-muted)]">
              <p className="font-semibold text-[var(--gt-ink)]">GoTicket System Admin</p>
              <p className="mt-0.5">Trung tâm điều hành nền tảng &copy; 2026</p>
            </div>
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
