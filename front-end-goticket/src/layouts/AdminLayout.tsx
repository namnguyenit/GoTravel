import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/presentation/context/AuthContext';
import {
  Shield,
  Building2,
  UserCheck,
  FileCheck2,
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
        { label: 'Kiểm duyệt Offer / Bài đăng', to: '/admin/offers', icon: FileCheck2 },
      ],
    },
    {
      groupTitle: 'Đơn hàng & Nghiệp vụ',
      items: [
        { label: 'Đơn hàng cần xử lý', to: '/admin/orders', icon: AlertOctagon },
        { label: 'Hoàn tiền & Nghiệp vụ vé', to: '/admin/refunds', icon: RotateCcw },
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
    <div className="min-h-screen bg-[var(--gt-canvas)] flex flex-col font-sans">
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
