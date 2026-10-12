import React from 'react';

interface StickyActionBarProps {
  children: React.ReactNode;
  summarySlot?: React.ReactNode;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  summarySlot,
  className = '',
}) => {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-4 sm:px-6 py-3.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] ${className}`}
    >
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {summarySlot && <div className="w-full sm:w-auto">{summarySlot}</div>}
        <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};
