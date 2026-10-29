import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filtersSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  onReset?: () => void;
  totalCount?: number;
  totalCountLabel?: string;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filtersSlot,
  actionsSlot,
  onReset,
  totalCount,
  totalCountLabel = 'kết quả',
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${className}`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200/90 rounded-full focus:outline-hidden focus:border-[var(--gt-brand)] focus:bg-white transition-all text-gray-900"
            />
          </div>
        )}

        {filtersSlot}

        {onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-gray-500 hover:text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)] rounded-full px-3 h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Đặt lại
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
        {totalCount !== undefined && (
          <div className="text-xs text-gray-500 font-medium">
            Có <strong className="text-gray-900 font-bold tabular-nums">{totalCount}</strong> {totalCountLabel}
          </div>
        )}
        {actionsSlot}
      </div>
    </div>
  );
};
