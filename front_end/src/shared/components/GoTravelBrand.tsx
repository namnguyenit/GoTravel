import Image from "next/image";

/** Go brand family: original G mark with the shared lowercase wordmark. */
export default function GoTravelBrand({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5" aria-label="GoTravel" data-no-i18n>
      <Image src="/brand/gotravel-symbol.svg" alt="" width={44} height={44} unoptimized className="h-10 w-10 sm:h-11 sm:w-11" />
      <span className={`gotravel-wordmark text-[27px] leading-none text-[#222222]${compactOnMobile ? " hidden sm:inline" : ""}`}>
        go<span className="font-medium">travel</span><span className="text-[#FF385C]">.</span>
      </span>
    </span>
  );
}
