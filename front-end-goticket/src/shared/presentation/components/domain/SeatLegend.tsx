import React from 'react';

export const SeatLegend: React.FC<{ className?: string }> = ({ className = '' }) => {
  const items = [
    {
      label: 'Ghế trống',
      element: (
        <div className="w-5 h-5 rounded-lg border-2 border-gray-300 bg-white" />
      ),
    },
    {
      label: 'Đang chọn',
      element: (
        <div className="w-5 h-5 rounded-lg bg-[#FF385C] border-2 border-[#FF385C] shadow-2xs" />
      ),
    },
    {
      label: 'Đang giữ (tạm thời)',
      element: (
        <div className="w-5 h-5 rounded-lg bg-amber-100 border-2 border-amber-400" />
      ),
    },
    {
      label: 'Đã bán / Khóa',
      element: (
        <div className="w-5 h-5 rounded-lg bg-gray-200 border-2 border-gray-300 opacity-60" />
      ),
    },
  ];

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-6 bg-white/80 backdrop-blur-md rounded-full border border-white/80 text-xs font-semibold text-gray-700 shadow-2xs ${className}`}
    >
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {item.element}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
