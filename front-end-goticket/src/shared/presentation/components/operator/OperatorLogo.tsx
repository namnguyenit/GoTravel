import { useEffect, useState } from "react";
export function OperatorLogo({
  src,
  name,
  className = "h-12 w-12",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : words[0]?.slice(0, 2) || "NX"
  ).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`Logo ${name}`}
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-label={name}
          className="px-1 text-sm font-bold text-[var(--gt-brand-ink)]"
        >
          {initials}
        </span>
      )}
    </span>
  );
}
