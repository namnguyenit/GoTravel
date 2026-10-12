import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  inputLabel: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isTextarea?: boolean;
  required?: boolean;
  loading?: boolean;
  onSubmit: (value: string) => void | Promise<void>;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  isTextarea = false,
  required = true,
  loading = false,
  onSubmit,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
    }
  }, [open, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setError('Vui lòng nhập thông tin yêu cầu');
      return;
    }
    setError(null);
    void onSubmit(value.trim());
  };

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] p-6 border-gray-100 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1.5 mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-gray-600">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-1.5 my-4">
            <label className="text-xs font-bold text-gray-700 block">
              {inputLabel} {required && <span className="text-rose-500">*</span>}
            </label>
            {isTextarea ? (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                rows={3}
                disabled={loading}
                className="w-full rounded-2xl border border-gray-200 p-3 text-xs sm:text-sm text-gray-900 focus:outline-hidden focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/15 transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                disabled={loading}
                className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-xs sm:text-sm text-gray-900 focus:outline-hidden focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/15 transition-all"
              />
            )}
            {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
          </div>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-full px-5 text-xs font-semibold h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-full px-5 text-xs font-bold h-10 bg-[#FF385C] hover:bg-[#E61E4F] text-white transition-all"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
