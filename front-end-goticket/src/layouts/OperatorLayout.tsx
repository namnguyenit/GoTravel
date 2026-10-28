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
        { label: 'Doanh số nhân viên', to: '/operator/counter-sales', icon: Wallet },
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
    <div className="relative min-h-screen bg-[var(--gt-canvas)] flex flex-col font-sans">
      {/* Ambient optical canvas spots */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-gradient-to-b from-[#FFF0F2]/50 to-transparent blur-3xl" />
        <div className="absolute top-[30%] -right-40 h-[400px] w-[600px] rounded-full bg-gradient-to-bl from-[#FFF4EA]/40 to-transparent blur-3xl" />
        <div className="absolute top-[70%] -left-40 h-[400px] w-[600px] rounded-full bg-gradient-to-tr from-[#FFF0F2]/30 to-transparent blur-3xl" />
      </div>

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
