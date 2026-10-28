interface TripStopItem {
  id: string;
  orderIndex?: number;
  order?: number;
  pickupAllowed?: boolean;
  dropoffAllowed?: boolean;
  stopType?: 'PICKUP' | 'DROPOFF' | 'BOTH';
  type?: 'PICKUP' | 'DROPOFF' | 'BOTH';
}

// Backend permissions and route order determine valid stops, never name/province heuristics.
export const orderedTripStops = <T extends TripStopItem>(stops: T[]) => [...stops].sort(
  (a, b) => Number(a.orderIndex ?? a.order ?? 0) - Number(b.orderIndex ?? b.order ?? 0),
);
export const canPickupAt = (stop: TripStopItem) =>
  stop.pickupAllowed !== false && (stop.stopType ?? stop.type) !== 'DROPOFF';
export const canDropoffAt = (stop: TripStopItem) =>
  stop.dropoffAllowed !== false && (stop.stopType ?? stop.type) !== 'PICKUP';
export const isValidStopPair = (stops: TripStopItem[], pickupId: string, dropoffId: string) => {
  const ordered = orderedTripStops(stops);
  const pickup = ordered.findIndex((stop) => stop.id === pickupId);
  const dropoff = ordered.findIndex((stop) => stop.id === dropoffId);
  return pickup >= 0 && dropoff > pickup && canPickupAt(ordered[pickup]) && canDropoffAt(ordered[dropoff]);
};
