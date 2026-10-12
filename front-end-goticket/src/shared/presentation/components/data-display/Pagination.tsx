import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-gray-500 ${className}`}
    >
      <div>
        {totalItems !== undefined ? (
          <span>
            Trang <strong className="text-gray-900 font-bold tabular-nums">{currentPage}</strong> /{' '}
            <strong className="text-gray-900 font-bold tabular-nums">{totalPages}</strong> (Tổng cộng{' '}
            <strong className="text-gray-900 font-bold tabular-nums">{totalItems}</strong> mục)
          </span>
        ) : (
          <span>
            Trang <strong className="text-gray-900 font-bold tabular-nums">{currentPage}</strong> /{' '}
            <strong className="text-gray-900 font-bold tabular-nums">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || disabled}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-full px-3.5 h-8 text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Trước
        </Button>

        <span className="px-3 py-1 bg-gray-100 rounded-full font-bold text-gray-900 tabular-nums">
          {currentPage}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || disabled}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-full px-3.5 h-8 text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Sau
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
};
