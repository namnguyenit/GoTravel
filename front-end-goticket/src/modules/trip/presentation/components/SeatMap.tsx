import React, { useState } from 'react';
import type { SeatEntity } from '../../domain/entity/seat.entity';
import { Armchair, Check, Clock, Ban } from 'lucide-react';
import { SeatLegend } from '@/shared/presentation/components/domain/SeatLegend';

interface SeatMapProps {
  seats: SeatEntity[];
  selectedSeatIds: string[];
  maxSelectable?: number;
  onToggleSeat: (seat: SeatEntity) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  maxSelectable = 10,
  onToggleSeat,
}) => {
  // Check if trip has multiple decks
  const decks = Array.from(new Set(seats.map((s) => s.deck))).sort();
  const [activeDeck, setActiveDeck] = useState<number>(decks[0] || 1);

  // Filter seats for current active deck
  const currentDeckSeats = seats.filter((s) => s.deck === activeDeck);

  // Find min/max rows and columns for grid layout
  const rows = currentDeckSeats.map((s) => s.row);
  const cols = currentDeckSeats.map((s) => s.column);
  const minRow = rows.length > 0 ? Math.min(...rows) : 0;
  const maxRow = rows.length > 0 ? Math.max(...rows) : 0;
  const minCol = cols.length > 0 ? Math.min(...cols) : 0;
  const maxCol = cols.length > 0 ? Math.max(...cols) : 0;

  const rowCount = Math.max(1, maxRow - minRow + 1);
  const colCount = Math.max(1, maxCol - minCol + 1);

  // Map seats into a 2D lookup: row -> col -> SeatEntity
  const seatGrid: Record<number, Record<number, SeatEntity>> = {};
  for (const seat of currentDeckSeats) {
    if (!seatGrid[seat.row]) seatGrid[seat.row] = {};
    seatGrid[seat.row][seat.column] = seat;
  }

  const handleSeatClick = (seat: SeatEntity) => {
    if (!seat.isAvailable() && !selectedSeatIds.includes(seat.id)) {
      return; // Not clickable if held, sold, or blocked
    }
    if (!selectedSeatIds.includes(seat.id) && selectedSeatIds.length >= maxSelectable) {
      alert(`Bạn chỉ có thể chọn tối đa ${maxSelectable} ghế cho một lượt đặt vé.`);
      return;
    }
    onToggleSeat(seat);
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 p-5 sm:p-7 space-y-6 shadow-md">
      {/* Deck Selector if multi-deck */}
      {decks.length > 1 && (
        <div className="flex items-center justify-center gap-2 border-b border-gray-100/80 pb-4">
          {decks.map((deckNumber) => (
            <button
              key={deckNumber}
              type="button"
              onClick={() => setActiveDeck(deckNumber)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeDeck === deckNumber
                  ? 'bg-[#FF385C] text-white shadow-xs glow-coral-sm'
                  : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              Tầng {deckNumber}
            </button>
          ))}
        </div>
      )}

      {/* Front of vehicle indicator */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 text-xs font-semibold text-gray-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center text-gray-900 shadow-2xs">
            🛞
          </div>
          <span className="font-bold text-gray-800">Tài xế</span>
        </div>
        <span className="uppercase tracking-wider text-[11px] font-extrabold text-gray-400">
          Đầu xe (Tầng {activeDeck})
        </span>
        <div className="text-right text-[11px] font-bold text-gray-500">Cửa lên xe 🚪</div>
      </div>

      {/* Seat Grid Layout */}
      <div className="flex justify-center overflow-x-auto py-2">
        <div className="inline-grid gap-3.5 p-6 bg-white/75 backdrop-blur-lg rounded-3xl border border-white/80 shadow-inner">
          {Array.from({ length: rowCount }, (_, rIdx) => {
            const rowNum = minRow + rIdx;
            return (
              <div key={rowNum} className="flex gap-3 justify-center">
                {Array.from({ length: colCount }, (_, cIdx) => {
                  const colNum = minCol + cIdx;
                  const seat = seatGrid[rowNum]?.[colNum];

                  if (!seat) {
                    // Empty walkway or blank space
                    return <div key={colNum} className="w-12 h-14 sm:w-14 sm:h-16" />;
                  }

                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isAvailable = seat.isAvailable();
                  const isHeld = seat.isHeld();
                  const isSold = seat.isSold();
                  const isBlocked = seat.isBlocked();

                  let buttonClass = 'bg-white/95 border-gray-200/80 text-gray-800 hover:border-[#FF385C] hover:bg-[#FFF0F2] shadow-2xs';
                  if (isSelected) {
                    buttonClass = 'bg-[#FF385C] border-[#FF385C] text-white ring-4 ring-[#FF385C]/25 shadow-lg scale-105 glow-coral-sm';
                  } else if (isHeld) {
                    buttonClass = 'bg-amber-50/90 border-amber-300 text-amber-800 cursor-not-allowed opacity-80';
                  } else if (isSold) {
                    buttonClass = 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed';
                  } else if (isBlocked) {
                    buttonClass = 'bg-rose-50/80 border-rose-200 text-rose-600 cursor-not-allowed opacity-70';
                  }

                  return (
                    <button
                      key={colNum}
                      type="button"
                      disabled={!isAvailable && !isSelected}
                      onClick={() => handleSeatClick(seat)}
                      aria-label={seat.getAccessibleLabel(isSelected)}
                      aria-pressed={isSelected}
                      className={`
                        w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center p-1
                        transition-all duration-150 relative group cursor-pointer
                        ${buttonClass}
                      `}
                    >
                      {/* Seat Code */}
                      <span className="text-xs font-black tabular-nums leading-none">{seat.code}</span>

                      {/* Icon or state indicator */}
                      <div className="mt-1">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isHeld ? (
                          <Clock className="w-3 h-3 text-amber-700" />
                        ) : isSold ? (
                          <span className="text-[10px] font-bold">Hết</span>
                        ) : isBlocked ? (
                          <Ban className="w-3 h-3 text-rose-600" />
                        ) : (
                          <Armchair className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#FF385C]" />
                        )}
                      </div>

                      {/* Seat class indicator dot */}
                      {seat.seatClass === 'VIP' && !isSelected && isAvailable && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF385C]" title="Ghế VIP" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <SeatLegend />
    </div>
  );
};
