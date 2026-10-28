import React, { useMemo } from 'react';
import type { SeatEntity } from '../../domain/entity/seat.entity';
import type { TripStopItem } from '../../application/port/trip.service.interface';
import { User, MapPin } from 'lucide-react';
import { orderedTripStops, canPickupAt, canDropoffAt } from '../../domain/value-object/trip-stops';

export interface PassengerInput {
  seatId: string;
  name: string;
  pickupStopId: string;
  dropoffStopId: string;
}

interface PassengerFormProps {
  selectedSeats: SeatEntity[];
  passengers: Record<string, PassengerInput>;
  stops: TripStopItem[];
  origin?: string;
  destination?: string;
  onChangePassenger: (seatId: string, updated: Partial<PassengerInput>) => void;
}

export const PassengerForm: React.FC<PassengerFormProps> = ({
  selectedSeats,
  passengers,
  stops,
  origin,
  destination,
  onChangePassenger,
}) => {
  const ordered = useMemo(() => orderedTripStops(stops), [stops]);
  const pickupStops = ordered.filter(canPickupAt);
  const dropoffStops = ordered.filter(canDropoffAt);

  if (selectedSeats.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-8 sm:p-12 text-center text-gray-500">
        <p className="text-sm font-semibold">Vui lòng chọn ít nhất một ghế trống trên sơ đồ để nhập thông tin hành khách.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-[#111827]">
          Thông tin hành khách ({selectedSeats.length} người)
        </h3>
        <span className="text-xs text-gray-400 font-medium">Tối đa 10 người / lượt</span>
      </div>

      <div className="space-y-4">
        {selectedSeats.map((seat, index) => {
          // Đảm bảo stopId hợp lệ theo danh sách lọc
          const defaultPickupId = pickupStops[0]?.id || '';
          const defaultDropoffId = dropoffStops[dropoffStops.length - 1]?.id || dropoffStops[0]?.id || '';

          const rawPass = passengers[seat.id];
          const validPickupId =
            rawPass?.pickupStopId && pickupStops.some((s) => s.id === rawPass.pickupStopId)
              ? rawPass.pickupStopId
              : defaultPickupId;
          const validDropoffId =
            rawPass?.dropoffStopId && dropoffStops.some((s) => s.id === rawPass.dropoffStopId)
              ? rawPass.dropoffStopId
              : defaultDropoffId;

          const pass = {
            seatId: seat.id,
            name: rawPass?.name || '',
            pickupStopId: validPickupId,
            dropoffStopId: validDropoffId,
          };

          return (
            <div
              key={seat.id}
              className="p-5 sm:p-6 bg-white/85 backdrop-blur-md rounded-3xl border border-white/80 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center font-black text-xs border border-[#FF385C]/20 shadow-2xs">
                    {index + 1}
                  </div>
                  <span className="font-bold text-sm text-[#111827]">
                    Hành khách ghế <span className="text-[#FF385C] font-black">{seat.code}</span> (Tầng {seat.deck})
                  </span>
                </div>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-white/80 backdrop-blur-xs border border-gray-200/60 text-gray-700 shadow-2xs">
                  {seat.seatClass === 'VIP' ? 'Hạng VIP' : 'Hạng Tiêu chuẩn'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Passenger Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Họ và tên hành khách <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={pass.name}
                      onChange={(e) => onChangePassenger(seat.id, { name: e.target.value })}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Pickup Stop */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Điểm đón {origin ? `(${origin})` : ''} <span className="text-rose-500">*</span>
                    </label>
                    {pickupStops.length > 1 && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        Có trung chuyển ({pickupStops.length})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#FF385C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={pass.pickupStopId}
                      onChange={(e) => onChangePassenger(seat.id, { pickupStopId: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium cursor-pointer"
                    >
                      {pickupStops.map((stop, idx) => {
                        const isMain = idx === 0;
                        const labelPrefix = isMain ? '📍 [Bến chính] ' : '🚐 [Trung chuyển đón] ';
                        return (
                          <option key={stop.id} value={stop.id}>
                            {labelPrefix}
                            {stop.name}
                            {stop.address ? ` (${stop.address})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Dropoff Stop */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Điểm trả {destination ? `(${destination})` : ''} <span className="text-rose-500">*</span>
                    </label>
                    {dropoffStops.length > 1 && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        Có trung chuyển ({dropoffStops.length})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={pass.dropoffStopId}
                      onChange={(e) => onChangePassenger(seat.id, { dropoffStopId: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium cursor-pointer"
                    >
                      {dropoffStops.map((stop, idx) => {
                        const isMain = idx === dropoffStops.length - 1;
                        const labelPrefix = isMain ? '🏁 [Bến chính] ' : '🚐 [Trung chuyển trả] ';
                        return (
                          <option key={stop.id} value={stop.id}>
                            {labelPrefix}
                            {stop.name}
                            {stop.address ? ` (${stop.address})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
