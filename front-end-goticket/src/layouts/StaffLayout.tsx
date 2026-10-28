import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/presentation/context/AuthContext';
import {
  CalendarDays,
  QrCode,
  Store,
  ShoppingBag,
} from 'lucide-react';
import {
  PortalTopbar,
  PortalSidebar,
  type PortalNavGroup,
} from '@/shared/presentation/components';

export const StaffLayout: React.FC = () => {
  const { user, selectStaffOperator } = useAuth();
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
          show: user?.hasCapability('CHECK_IN'),
        },
        {
          label: 'Bán vé tại quầy',
          to: '/staff/counter',
          icon: Store,
          show: user?.hasCapability('SELL_CASH'),
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
              {user && user.staffAssignments.length > 1 && <label className="my-3 block text-xs font-semibold">Nhà xe đang tác nghiệp
                <select aria-label="Nhà xe đang tác nghiệp" value={user.operatorId || ''} onChange={e => selectStaffOperator?.(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-2 text-sm">
                  {user.staffAssignments.map(a => <option key={a.operatorId} value={a.operatorId}>{a.operatorName}</option>)}
                </select>
              </label>}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {user?.staffCapabilities && user.staffCapabilities.some(cap => !['CLOSE_SHIFT', 'CASH_VIEW'].includes(cap)) ? (
                  user.staffCapabilities.filter(cap => !['CLOSE_SHIFT', 'CASH_VIEW'].includes(cap)).map((cap) => (
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
