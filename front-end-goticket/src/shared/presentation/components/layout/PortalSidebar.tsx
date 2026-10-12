import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface PortalNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  show?: boolean;
  badge?: string | number;
}

export interface PortalNavGroup {
  groupTitle?: string;
  items: PortalNavItem[];
}

interface PortalSidebarProps {
  groups: PortalNavGroup[];
  isOpen?: boolean;
  onClose?: () => void;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  groups,
  isOpen = false,
  onClose,
  headerSlot,
  footerSlot,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200/80 flex flex-col
          transform transition-transform duration-200 ease-out md:translate-x-0
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {headerSlot && (
          <div className="p-4 border-b border-gray-100">
            {headerSlot}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => item.show !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                {group.groupTitle && (
                  <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {group.groupTitle}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) => `
                        flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                        ${
                          isActive
                            ? 'bg-[#FFF0F2] text-[#FF385C] shadow-2xs font-bold'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {footerSlot && (
          <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
            {footerSlot}
          </div>
        )}
      </aside>
    </>
  );
};
