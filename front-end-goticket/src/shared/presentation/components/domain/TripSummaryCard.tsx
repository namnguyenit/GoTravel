import React from 'react';
import { Bus, MapPin, Clock, ArrowRight } from 'lucide-react';
import { MoneyText } from '../data-display/MoneyText';

interface TripSummaryCardProps {
  origin: string;
  destination: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  operatorName?: string;
  carType?: string;
  seatCode?: string;
  pricePerSeat?: number | string;
  className?: string;
}

export const TripSummaryCard: React.FC<TripSummaryCardProps> = ({
  origin,
  destination,
  departureTime,
  arrivalTime,
  departureDate,
  operatorName,
  carType,
  seatCode,
  pricePerSeat,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3.5 ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <Bus className="w-4 h-4 text-[#FF385C]" />
          <span>{operatorName || 'Nhà xe GoTicket'}</span>
          {carType && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {carType}
            </span>
          )}
        </div>
        {departureDate && (
          <span className="font-semibold text-gray-700 tabular-nums">
            {departureDate}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-400 font-semibold uppercase">Điểm đi</div>
          <div className="text-base sm:text-lg font-black text-[#111827] truncate">
            {origin}
          </div>
          {departureTime && (
            <div className="text-xs font-bold text-[#FF385C] tabular-nums flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {departureTime}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center px-2 shrink-0">
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        <div className="min-w-0 text-right">
          <div className="text-xs text-gray-400 font-semibold uppercase">Điểm đến</div>
          <div className="text-base sm:text-lg font-black text-[#111827] truncate">
            {destination}
          </div>
          {arrivalTime && (
            <div className="text-xs font-bold text-gray-600 tabular-nums flex items-center justify-end gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {arrivalTime}
            </div>
          )}
        </div>
      </div>

      {(seatCode || pricePerSeat) && (
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          {seatCode ? (
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="text-gray-400">Vị trí ghế:</span>
              <span className="font-extrabold px-2 py-0.5 rounded-md bg-[#FFF0F2] text-[#FF385C]">
                {seatCode}
              </span>
            </div>
          ) : (
            <span />
          )}

          {pricePerSeat && (
            <div className="text-right">
              <span className="text-gray-400 mr-1.5">Giá vé:</span>
              <MoneyText amount={pricePerSeat} size="sm" variant="coral" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
