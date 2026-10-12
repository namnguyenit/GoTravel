import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface IdTextProps {
  id: string;
  prefix?: string;
  truncateLength?: number;
  showCopy?: boolean;
  className?: string;
}

export const IdText: React.FC<IdTextProps> = ({
  id,
  prefix,
  truncateLength = 8,
  showCopy = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!id) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const displayId =
    truncateLength > 0 && id.length > truncateLength
      ? `${id.slice(0, truncateLength)}…`
      : id;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md ${className}`}
      title={id}
    >
      {prefix && <span className="text-gray-400 font-sans text-[11px]">{prefix}</span>}
      <span className="font-semibold text-gray-800">{displayId}</span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-700 transition-colors p-0.5"
          aria-label="Sao chép mã"
          title="Sao chép"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </span>
  );
};
