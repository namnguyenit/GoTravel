import React from 'react';
import { X } from 'lucide-react';

export interface FilterChip {
  id: string;
  label: string;
  valueDisplay: string;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  chips,
  onRemove,
  onClearAll,
  className = '',
}) => {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 pt-1 ${className}`}>
      <span className="text-xs text-gray-500 font-medium">Đang lọc:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--gt-brand-soft)] text-[var(--gt-brand)] border border-[var(--gt-brand)]/20 font-medium"
        >
          <span className="text-gray-500 font-normal">{chip.label}:</span>
          <span className="font-bold">{chip.valueDisplay}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.id)}
            className="hover:bg-[var(--gt-brand)]/15 rounded-full p-0.5 text-[var(--gt-brand)] transition-colors"
            aria-label={`Xóa bộ lọc ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 ml-1"
        >
          Xóa tất cả
        </button>
      )}
    </div>
  );
};
