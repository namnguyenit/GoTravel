import { useEffect, useId, useState } from "react";
import { OperatorLogo } from "./OperatorLogo";
export function OperatorLogoInput({
  file,
  currentUrl,
  name,
  onChange,
  disabled,
  required = true,
}: {
  file: File | null;
  currentUrl?: string | null;
  name: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-800">
        Logo nhà xe {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-gray-300 bg-white p-4 sm:flex-row sm:items-center">
        <OperatorLogo
          src={preview || currentUrl}
          name={name || "Nhà xe"}
          className="h-24 w-24"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={id}
            name="logoImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={required && !currentUrl}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint`}
            className="block w-full min-w-0 text-sm text-gray-700 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--gt-brand-soft)] file:px-4 file:py-2 file:font-semibold file:text-[var(--gt-brand-ink)] disabled:opacity-60"
            onChange={(event) => {
              const next = event.target.files?.[0] || null;
              if (
                next &&
                (!["image/jpeg", "image/png", "image/webp"].includes(
                  next.type
                ) ||
                  next.size > 5 * 1024 * 1024 ||
                  next.size === 0)
              ) {
                setError("Chọn ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 5MB.");
                event.target.value = "";
                onChange(null);
                return;
              }
              setError("");
              onChange(next);
            }}
          />
          <p
            id={`${id}-hint`}
            className="text-xs leading-relaxed text-gray-600"
          >
            Chọn ảnh từ máy. JPG, PNG hoặc WebP, tối đa 5MB; khuyến nghị ảnh
            vuông 256 × 256px. Logo được hiển thị công khai cho hành khách.
          </p>
          {file && (
            <p className="text-xs font-medium break-all text-gray-700">
              Ảnh đã chọn: {file.name}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
