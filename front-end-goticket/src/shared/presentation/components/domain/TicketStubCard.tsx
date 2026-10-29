import React from 'react';
import { Bus, MapPin, User, QrCode } from 'lucide-react';
import { StatusBadge } from '../feedback/StatusBadge';
import { MoneyText } from '../data-display/MoneyText';

interface TicketStubCardProps {
  ticketCode?: string;
  passengerName: string;
  seatCode: string;
  origin: string;
  destination: string;
  departureTime?: string;
  departureDate?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  price?: number | string;
  status?: string;
  qrSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export const TicketStubCard: React.FC<TicketStubCardProps> = ({
  ticketCode,
  passengerName,
  seatCode,
  origin,
  destination,
  departureTime,
  departureDate,
  pickupAddress,
  dropoffAddress,
  price,
  status = 'CONFIRMED',
  qrSlot,
  actionsSlot,
  className = '',
}) => {
  return (
    <div
      className={`relative bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 shadow-md overflow-hidden flex flex-col md:flex-row ${className}`}
    >
      {/* Left / Main Stub */}
      <div className="flex-1 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100/80">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-500">Vé lên xe</span>
            {ticketCode && (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-gray-200/60 text-gray-700 shadow-2xs">
                #{ticketCode.slice(-6).toUpperCase()}
              </span>
            )}
          </div>
          {status && <StatusBadge status={status} size="sm" />}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Hành khách</span>
            <span className="font-bold text-gray-900 text-sm truncate block">
              {passengerName}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Số ghế</span>
            <span className="font-black text-[var(--gt-brand)] text-base tabular-nums">
              {seatCode}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Khởi hành</span>
            <span className="font-bold text-gray-900 tabular-nums">
              {departureTime || '--:--'}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Ngày đi</span>
            <span className="font-semibold text-gray-700 tabular-nums">
              {departureDate || '--/--/----'}
            </span>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl space-y-2 border border-white/80 shadow-2xs">
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[var(--gt-brand)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-gray-900">{origin}</span>
              {pickupAddress && (
                <p className="text-gray-500 text-[11px] truncate mt-0.5">{pickupAddress}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-gray-900">{destination}</span>
              {dropoffAddress && (
                <p className="text-gray-500 text-[11px] truncate mt-0.5">{dropoffAddress}</p>
              )}
            </div>
          </div>
        </div>

        {actionsSlot && (
          <div className="pt-2 flex items-center justify-end gap-2">
            {actionsSlot}
          </div>
        )}
      </div>

      {/* Perforation Divider on Desktop */}
      <div className="hidden md:flex flex-col items-center justify-between py-3 relative w-0">
        <div className="w-4 h-4 rounded-full bg-[#FAF9F6] -mt-5 border-b border-gray-200/90 shadow-inner" />
        <div className="w-0.5 h-full border-r border-dashed border-gray-300" />
        <div className="w-4 h-4 rounded-full bg-[#FAF9F6] -mb-5 border-t border-gray-200/90 shadow-inner" />
      </div>

      {/* Right / QR Stub */}
      <div className="md:w-56 bg-white/70 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-white/60">
        {qrSlot ? (
          qrSlot
        ) : (
          <div className="p-3 bg-white rounded-2xl shadow-md border border-white/90 mb-2">
            <QrCode className="w-20 h-20 text-gray-800" />
          </div>
        )}
        <span className="text-[11px] font-semibold text-gray-500 mt-2">
          Mã vé điện tử QR
        </span>
        {price && (
          <div className="mt-2 pt-2 border-t border-gray-200/60 w-full text-center">
            <span className="text-[11px] text-gray-400 block">Thành tiền</span>
            <MoneyText amount={price} size="sm" variant="coral" />
          </div>
        )}
      </div>
    </div>
  );
};
