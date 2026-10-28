"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveProvince } from "@/shared/utils/vietnam-province";

type ClientLocation = {
  province: string;
  city: string;
  status: "pending" | "ready" | "denied" | "unavailable";
};
const empty: ClientLocation = { province: "", city: "", status: "pending" };
const LocationContext = createContext<ClientLocation>(empty);
const cacheKey = "go.client-province.v1";
const cacheAge = 15 * 60_000;

/** Device coordinates stay in memory; only the consented province/city is cached in this tab. */
export function ClientLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ClientLocation>(empty);
  useEffect(() => {
    let active = true;
    let watchId: number | undefined;
    let permission: PermissionStatus | undefined;
    let denied = false;
    let controller: AbortController | undefined;
    let generation = 0;
    let lastFix: { latitude: number; longitude: number; at: number } | undefined;
    const clearCache = () => { try { sessionStorage.removeItem(cacheKey); } catch {} };
    const reset = (status: ClientLocation["status"]) => {
      clearCache(); lastFix = undefined;
      if (active) setLocation({ province: "", city: "", status });
    };
    const stop = () => {
      generation++;
      lastFix = undefined;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      watchId = undefined;
      controller?.abort(); controller = undefined;
    };
    const hydrate = () => {
      try {
        const cache = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
        const province = resolveProvince(cache?.province);
        if (province && typeof cache?.at === "number" && cache.at <= Date.now() && Date.now() - cache.at < cacheAge)
          setLocation({ province, city: typeof cache.city === "string" ? cache.city.slice(0,120) : "", status: "ready" });
      } catch { clearCache(); }
    };
    const onPosition = async (position: GeolocationPosition) => {
      if (!active || denied || document.visibilityState === "hidden") return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      const now = Date.now();
      if (lastFix && (now-lastFix.at < 60_000 ||
        (Math.abs(latitude-lastFix.latitude)<0.01 && Math.abs(longitude-lastFix.longitude)<0.01 && now-lastFix.at<10*60_000))) return;
      lastFix = { latitude, longitude, at: now };
      const current = ++generation;
      controller?.abort();
      const request = new AbortController(); controller = request;
      const timer = window.setTimeout(() => request.abort(), 6000);
      try {
        // This provider requires the live device position. Never call the IP fallback after denial.
        const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
        url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: "vi" }).toString();
        const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: request.signal });
        if (!response.ok) throw new Error("Location lookup unavailable");
        const data = await response.json();
        if (!active || generation !== current) return;
        const province = data.countryCode === "VN"
          ? resolveProvince(data.principalSubdivision) || resolveProvince(data.city) : undefined;
        if (!province) { reset("unavailable"); return; }
        const city = typeof data.city === "string" ? data.city.slice(0,120) : "";
        setLocation({ province, city, status: "ready" });
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ province, city, at: Date.now() })); } catch {}
      } catch {
        if (active && generation === current) reset("unavailable");
      } finally { window.clearTimeout(timer); }
    };
    const start = () => {
      if (!active || denied || document.visibilityState === "hidden" || watchId !== undefined) return;
      watchId = navigator.geolocation.watchPosition(onPosition, error => {
        if (!active) return;
        if (error.code === 1) { denied = true; stop(); reset("denied"); }
        else reset("unavailable");
      }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };
    if (!navigator.geolocation || !window.isSecureContext) { reset("unavailable"); return; }
    document.addEventListener("visibilitychange", visibilityChanged);
    const initialize = async () => {
      try {
        permission = await navigator.permissions.query({ name: "geolocation" });
        if (!active) return;
        denied = permission.state === "denied";
        if (denied) reset("denied");
        else { if (permission.state === "granted") hydrate(); start(); }
        permission.onchange = () => {
          denied = permission?.state === "denied";
          stop();
          if (denied) reset("denied"); else { reset("pending"); start(); }
        };
      } catch { if (active) start(); }
    };
    void initialize();
    return () => {
      active = false; stop();
      if (permission) permission.onchange = null;
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);
  return <LocationContext.Provider value={location}>{children}</LocationContext.Provider>;
}
export const useClientLocation = () => useContext(LocationContext);
