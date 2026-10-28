"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BusFront } from "lucide-react";
import { useClientLocation } from "@/shared/context/ClientLocationContext";
import { resolveProvince } from "@/shared/utils/vietnam-province";
import { useI18n } from "@/shared/i18n/I18nProvider";

type SuggestedTrip = {
  id: string;
  departureTime: string;
  fromPriceVnd?: string;
  pricePerSeat?: number;
  operator: { name: string };
  seats: { availableSeats: number };
};
const cache = new Map<string, { expiresAt: number; trips: SuggestedTrip[] }>();
const ticketOrigin = () => {
  const host = window.location.hostname;
  if (["localhost", "127.0.0.1"].includes(host)) return "http://localhost:3334";
  return host.endsWith(".nonnet123.io.vn")
    ? "https://gocar.nonnet123.io.vn"
    : "https://goticket.trungcaodev.io.vn";
};

export default function TripTravelSuggestions({
  destination,
}: {
  destination?: string | null;
}) {
  const location = useClientLocation();
  const { locale } = useI18n();
  const originProvince = location.status === "ready" ? location.province : "";
  const destinationProvince = resolveProvince(destination);
  const eligible = Boolean(
    originProvince &&
    destinationProvince &&
    originProvince !== destinationProvince,
  );
  const key = eligible ? `${originProvince}|${destinationProvince}` : "";
  const [result, setResult] = useState<{ key: string; trips: SuggestedTrip[] }>(
    { key: "", trips: [] },
  );
  useEffect(() => {
    if (!key || !destinationProvince) return;
    let active = true;
    let request: AbortController | undefined;
    const load = async () => {
      if (!active || document.visibilityState === "hidden") return;
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        setResult({ key, trips: cached.trips });
        return;
      }
      request?.abort();
      request = new AbortController();
      const controller = request;
      const timer = window.setTimeout(() => controller.abort(), 8000);
      try {
        const query = new URLSearchParams({
          discover: "true",
          originRegion: originProvince,
          destinationRegion: destinationProvince,
          limit: "12",
          sortBy: "departureTime",
          sortOrder: "asc",
        });
        const response = await fetch(`/api/v1/trips/search?${query}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Trips unavailable");
        const json = await response.json();
        if (!json.success || !Array.isArray(json.data?.data))
          throw new Error("Invalid trips");
        const trips = (json.data.data as SuggestedTrip[])
          .filter(
            (trip) =>
              /^[0-9a-f-]{36}$/i.test(trip.id) &&
              trip.seats?.availableSeats > 0 &&
              new Date(trip.departureTime).getTime() >
                Date.now() + 15 * 60_000 &&
              /^(?:[1-9]\d*)$/.test(
                String(trip.fromPriceVnd ?? trip.pricePerSeat ?? ""),
              ),
          )
          .slice(0, 3);
        if (cache.size > 30) cache.clear();
        cache.set(key, { trips, expiresAt: Date.now() + 60_000 });
        if (active) setResult({ key, trips });
      } catch {
        if (active) setResult({ key, trips: [] });
      } finally {
        window.clearTimeout(timer);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      request?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
    };
  }, [key, originProvince, destinationProvince]);

  const trips = key && result.key === key ? result.trips : [];
  if (!trips.length) return null;
  const english = locale === "en";
  const date = new Intl.DateTimeFormat(english ? "en-GB" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const money = new Intl.NumberFormat("vi-VN");
  return (
    <section
      aria-label={
        english
          ? "Bus trips to this destination"
          : "Chuyến xe đến nơi bạn đang xem"
      }
      data-no-i18n
      className="mb-7 overflow-hidden rounded-2xl border border-[#f3d4db] bg-[#fff8f9] dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <BusFront
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#d41645] dark:text-rose-300"
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-app-fg">
            {english ? "Get there with GoTicket" : "Đến đây cùng GoTicket"}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-app-muted-fg">
            <span>{originProvince}</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{destinationProvince}</span>
          </p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-[#f3d4db] dark:divide-zinc-700">
        {trips.map((trip) => {
          const departure = new Date(trip.departureTime);
          return (
            <li key={trip.id}>
              <a
                href={`${ticketOrigin()}/trips/${encodeURIComponent(trip.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${english ? "View trip" : "Xem chuyến"} ${trip.operator.name}, ${time.format(departure)} ${date.format(departure)}`}
                className="group flex min-h-20 items-center justify-between gap-3 px-4 py-3 text-app-fg transition-colors hover:bg-[#ffedf1] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#d41645] dark:hover:bg-zinc-800"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold tabular-nums">
                      {time.format(departure)}
                    </span>
                    <span className="text-xs text-app-muted-fg">
                      {date.format(departure)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-app-muted-fg">
                    {trip.operator.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#c41640] dark:text-rose-300">
                      {english ? "From " : "Từ "}{money.format(
                        BigInt(trip.fromPriceVnd ?? trip.pricePerSeat!),
                      )}{" "}
                      ₫
                    </p>
                    <p className="mt-0.5 text-xs text-app-muted-fg">
                      {english ? "View trip" : "Xem chuyến"}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-[#c41640] transition-transform group-hover:translate-x-0.5 dark:text-rose-300"
                  />
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
