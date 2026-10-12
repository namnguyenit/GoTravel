import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerPopoverProps {
  value: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  error?: string;
  variant?: 'capsule' | 'compact';
}

const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const formatDateString = (year: number, month: number, day: number): string => {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return 'Ngày đi';
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return dateStr;
};

const getTodayString = (): string => {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
};


export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  value,
  minDate = getTodayString(),
  onChange,
  error,
  variant = 'capsule',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = parseDateString(value || minDate);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const parsed = parseDateString(value);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dateStr = formatDateString(viewYear, viewMonth, day);
    onChange(dateStr);
    setIsOpen(false);
  };

  // Days in month calculation
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Monday = 0, Sunday = 6
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const todayStr = getTodayString();

  const minParsed = parseDateString(minDate);
  const isPrevDisabled =
    viewYear < minParsed.getFullYear() ||
    (viewYear === minParsed.getFullYear() && viewMonth <= minParsed.getMonth());

  return (
    <div ref={rootRef} className="relative w-full">
      {/* Trigger Button */}
      {variant === 'capsule' ? (
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className={`h-14 px-5 rounded-full input-pill-island flex items-center gap-3 transition-all cursor-pointer select-none ${
            error
              ? 'ring-2 ring-red-400 bg-red-50/40'
              : isOpen
              ? 'ring-2 ring-[#FF385C]/30 bg-white shadow-md'
              : 'bg-white/95 hover:bg-white'
          }`}
        >
          <Calendar className="h-5 w-5 shrink-0 text-gray-700 pointer-events-none" />
          <span className="text-base font-semibold text-[#111827] pointer-events-none truncate">
            {formatDisplayDate(value)}
          </span>
        </div>
      ) : (
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
            error
              ? 'bg-red-50/50 ring-2 ring-red-400'
              : isOpen
              ? 'bg-white ring-2 ring-[#FF385C]/30'
              : 'hover:bg-gray-50'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0 text-[#FF385C]" />
          <span className="text-sm font-bold text-[#1A1D20]">
            {formatDisplayDate(value)}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-1 px-4 text-[11px] font-medium text-red-600">{error}</p>
      )}

      {/* Popover Dropdown matching LocationCombobox styling */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 absolute top-full left-0 lg:right-0 lg:left-auto z-50 mt-2.5 w-[310px] sm:w-[330px] rounded-[28px] border border-white/80 bg-white/95 backdrop-blur-2xl p-4 shadow-[0_24px_50px_rgba(15,23,42,0.18)] select-none">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100/90 mb-3">
            <button
              type="button"
              disabled={isPrevDisabled}
              onClick={handlePrevMonth}
              aria-label="Tháng trước"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isPrevDisabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-[#111827] text-sm sm:text-base">
              Tháng {viewMonth + 1}, {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Tháng sau"
              className="w-8 h-8 rounded-full text-gray-700 hover:bg-gray-100 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[11px] font-bold py-1 ${
                  idx === 6 ? 'text-[#FF385C]' : 'text-gray-400'
                }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-9 h-9 sm:w-10 sm:h-10" />
            ))}

            {/* Days of month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = formatDateString(viewYear, viewMonth, day);
              const isPast = dateStr < minDate;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#FF385C] text-white font-bold shadow-md shadow-[#FF385C]/35 scale-105'
                      : isPast
                      ? 'text-gray-300 cursor-not-allowed'
                      : isToday
                      ? 'ring-1.5 ring-[#FF385C] text-[#FF385C] font-bold hover:bg-[#FFF0F2]'
                      : 'text-[#111827] hover:bg-[#FFF0F2] hover:text-[#FF385C] cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
