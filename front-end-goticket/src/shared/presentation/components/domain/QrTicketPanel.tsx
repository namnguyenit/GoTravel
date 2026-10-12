import React from 'react';
import { QrCodeView } from '../QrCodeView';
import { Copy, Printer, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrTicketPanelProps {
  token: string;
  ticketId?: string;
  passengerName?: string;
  seatCode?: string;
  onPrint?: () => void;
  className?: string;
}

export const QrTicketPanel: React.FC<QrTicketPanelProps> = ({
  token,
  ticketId,
  passengerName,
  seatCode,
  onPrint,
  className = '',
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs text-center flex flex-col items-center max-w-sm mx-auto ${className}`}
    >
      <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-xs mb-4">
        <QrCodeView value={token} size={180} />
      </div>

      <div className="space-y-1">
        <h4 className="font-extrabold text-gray-900 text-base">
          Mã vé điện tử QR
        </h4>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Xuất trình mã này cho nhân viên nhà xe khi lên xe để soát vé nhanh chóng.
        </p>
      </div>

      {(passengerName || seatCode) && (
        <div className="mt-4 py-2.5 px-4 bg-[#FAF9F6] rounded-xl border border-gray-200/60 w-full flex items-center justify-between text-xs">
          {passengerName && (
            <span className="font-semibold text-gray-700 truncate">{passengerName}</span>
          )}
          {seatCode && (
            <span className="font-extrabold text-[#FF385C] px-2 py-0.5 bg-[#FFF0F2] rounded-md">
              Ghế {seatCode}
            </span>
          )}
        </div>
      )}

      <div className="mt-5 w-full flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="rounded-full text-xs font-semibold h-9 px-4 border-gray-200"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
          {copied ? 'Đã chép mã' : 'Chép mã check-in'}
        </Button>

        {onPrint && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="rounded-full text-xs font-semibold h-9 px-4 border-gray-200 text-gray-700"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            In vé
          </Button>
        )}
      </div>
    </div>
  );
};
