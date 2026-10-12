import React from 'react';

export interface TimelineItem {
  id: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  status?: 'active' | 'completed' | 'pending' | 'cancelled';
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, className = '' }) => {
  if (items.length === 0) return null;

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical line connecting nodes */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

      {items.map((item, index) => {
        const isCompleted = item.status === 'completed';
        const isActive = item.status === 'active';
        const isCancelled = item.status === 'cancelled';

        const dotBg = isCompleted
          ? 'bg-emerald-500 ring-4 ring-emerald-50 text-white'
          : isActive
          ? 'bg-[#FF385C] ring-4 ring-[#FFF0F2] text-white animate-pulse'
          : isCancelled
          ? 'bg-rose-500 ring-4 ring-rose-50 text-white'
          : 'bg-gray-300 ring-4 ring-gray-100 text-gray-500';

        return (
          <div key={item.id || index} className="relative flex items-start gap-3.5">
            {/* Timeline node */}
            <div
              className={`absolute -left-[19px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${dotBg}`}
            >
              {item.icon ? (
                <div className="scale-75">{item.icon}</div>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div className="text-sm font-bold text-gray-900 leading-snug">
                  {item.title}
                </div>
                {item.timestamp && (
                  <div className="text-xs text-gray-400 tabular-nums shrink-0">
                    {item.timestamp}
                  </div>
                )}
              </div>

              {item.subtitle && (
                <div className="text-xs font-medium text-gray-500 mt-0.5">
                  {item.subtitle}
                </div>
              )}

              {item.description && (
                <div className="text-xs text-gray-600 mt-1.5 leading-relaxed bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
