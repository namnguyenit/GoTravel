import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/presentation/context/AuthContext';
import {
  CalendarDays,
  QrCode,
  Store,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import {
  PortalTopbar,
  PortalSidebar,
  type PortalNavGroup,
} from '@/shared/presentation/components';

export const StaffLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navGroups: PortalNavGroup[] = [
    {
      groupTitle: 'Công việc phân công',
      items: [
        {
          label: 'Chuyến được phân công',
          to: '/staff/trips',
          icon: CalendarDays,
          show: true,
        },
        {
          label: 'Soát vé & Check-in',
          to: '/staff/check-in',
          icon: QrCode,
          show: user?.hasCapability('CHECK_IN') || user?.isAdmin() || user?.isVendor(),
        },
        {
          label: 'Bán vé tại quầy',
          to: '/staff/counter',
          icon: Store,
          show: user?.hasCapability('SELL_CASH') || user?.isAdmin() || user?.isVendor(),
        },
        {
          label: 'Ca thu tiền mặt',
          to: '/staff/shifts',
          icon: Wallet,
          show: user?.hasCapability('CASH_VIEW') || user?.hasCapability('SELL_CASH') || user?.isAdmin() || user?.isVendor(),
        },
        {
          label: 'Đơn hàng được phân công',
          to: '/staff/orders',
          icon: ShoppingBag,
          show: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--gt-canvas)] flex flex-col font-sans">
      <PortalTopbar
        roleBadge="Nhân viên"
        scopeTitle={user?.operatorName || 'Nhân viên nhà xe'}
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
                Quyền thao tác
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {user?.staffCapabilities && user.staffCapabilities.length > 0 ? (
                  user.staffCapabilities.map((cap) => (
                    <span
                      key={cap}
                      className="inline-block px-2 py-0.5 bg-[var(--gt-surface-soft)] border border-[var(--gt-border)] text-[var(--gt-ink)] text-[10px] font-bold rounded-full"
                    >
                      {cap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--gt-muted)]">Chưa gán quyền đặc thù</span>
                )}
              </div>
            </div>
          }
          footerSlot={
            <div className="text-[11px] text-[var(--gt-muted)]">
              <p className="font-semibold text-[var(--gt-ink)]">GoTicket Staff Portal</p>
              <p className="mt-0.5">Liên hệ quản lý nhà xe để bổ sung quyền</p>
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
