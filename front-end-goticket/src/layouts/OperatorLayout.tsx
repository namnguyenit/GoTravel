import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/presentation/context/AuthContext';
import {
  LayoutDashboard,
  Bus,
  MapPin,
  Route as RouteIcon,
  CalendarDays,
  ShoppingBag,
  Store,
  Wallet,
  Users,
  BarChart3,
  Building,
} from 'lucide-react';
import {
  PortalTopbar,
  PortalSidebar,
  PortalPageContainer,
  type PortalNavGroup,
} from '@/shared/presentation/components';

export const OperatorLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navGroups: PortalNavGroup[] = [
    {
      groupTitle: 'Vận hành',
      items: [
        { label: 'Tổng quan', to: '/operator', icon: LayoutDashboard, end: true },
        { label: 'Đội xe & Sơ đồ ghế', to: '/operator/cars', icon: Bus },
        { label: 'Điểm đón/trả', to: '/operator/stops', icon: MapPin },
        { label: 'Tuyến đường', to: '/operator/routes', icon: RouteIcon },
        { label: 'Lịch trình chuyến', to: '/operator/trips', icon: CalendarDays },
      ],
    },
    {
      groupTitle: 'Bán vé & Dịch vụ',
      items: [
        { label: 'Quản lý vé & Đơn', to: '/operator/orders', icon: ShoppingBag },
        { label: 'Quầy bán vé', to: '/operator/counter', icon: Store },
        { label: 'Ca thu tiền mặt', to: '/operator/shifts', icon: Wallet },
      ],
    },
    {
      groupTitle: 'Quản trị & Báo cáo',
      items: [
        { label: 'Nhân viên & Phân công', to: '/operator/staff', icon: Users },
        { label: 'Báo cáo vận hành', to: '/operator/reports', icon: BarChart3 },
        { label: 'Hồ sơ nhà xe', to: '/operator/profile', icon: Building },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--gt-canvas)] flex flex-col font-sans">
      <PortalTopbar
        roleBadge="Nhà xe"
        scopeTitle={user?.operatorName || 'Nhà xe đối tác'}
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
                Kênh điều hành
              </p>
              <p className="text-sm font-bold text-[var(--gt-ink)] mt-0.5 truncate">
                {user?.operatorName || 'Nhà xe đối tác'}
              </p>
            </div>
          }
          footerSlot={
            <div className="text-[11px] text-[var(--gt-muted)]">
              <p className="font-semibold text-[var(--gt-ink)]">GoTicket Partner Portal</p>
              <p className="mt-0.5">Phiên bản vận hành 2026</p>
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
