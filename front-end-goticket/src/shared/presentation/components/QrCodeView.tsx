import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard ISO/IEC 18004 QR Code Component using official `qrcode` engine.
 * Supports arbitrary data length (including 117+ byte check-in tokens and JWTs),
 * Error correction level M, and responsive SVG vector rendering.
 */
export const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 180,
  className = '',
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !value.trim()) {
      setSvgMarkup('');
      setError('Mã vé không hợp lệ hoặc chưa được cấp');
      return;
    }

    let isMounted = true;
    QRCode.toString(value.trim(), {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      width: size,
    })
      .then((svg) => {
        if (isMounted) {
          setSvgMarkup(svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Lỗi mã hóa mã QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-gray-50 border border-red-200 rounded-xl text-xs text-red-600 p-3 text-center ${className}`}
      >
        <span>{error}</span>
      </div>
    );
  }

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl ${className}`}
      >
        <div className="w-5 h-5 border-2 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`inline-block select-none overflow-hidden [&>svg]:w-full [&>svg]:h-full ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
