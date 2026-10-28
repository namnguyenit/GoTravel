import { useClientLocation } from "@/shared/context/ClientLocationContext";
export function useDiscoverLocation(enabled: boolean) {
  const location = useClientLocation();
  return { city: enabled && location.status === "ready" ? location.province : "" };
}
