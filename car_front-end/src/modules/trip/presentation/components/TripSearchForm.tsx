import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  MapPin,
  Calendar,
  ArrowLeftRight,
  Loader2,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripSearchQueryVO } from "../../domain/value-object/trip-search-query.vo";
import { tripService } from "../../composition";

interface TripSearchFormProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDate?: string;
  onSearch: (criteria: {
    origin: string;
    destination: string;
    departureDate: string;
  }) => void;
  compact?: boolean;
}

export const TripSearchForm: React.FC<TripSearchFormProps> = ({
  initialOrigin = "",
  initialDestination = "",
  initialDate = "",
  onSearch,
  compact = false,
}) => {
  const todayStr = TripSearchQueryVO.getTodayDateString();
  const tomorrowStr = TripSearchQueryVO.getTomorrowDateString();

  const [origin, setOrigin] = useState<string>(initialOrigin);
  const [destination, setDestination] = useState<string>(initialDestination);
  const [departureDate, setDepartureDate] = useState<string>(
    initialDate || todayStr
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic Locations State
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);

  // Dropdown open states
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);
  const [showDestinationDropdown, setShowDestinationDropdown] =
    useState<boolean>(false);

  // Refs for detecting click outside
  const originContainerRef = useRef<HTMLDivElement>(null);
  const destinationContainerRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes if navigated with new params
  useEffect(() => {
    if (initialOrigin !== undefined) setOrigin(initialOrigin);
  }, [initialOrigin]);

  useEffect(() => {
    if (initialDestination !== undefined) setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialDate !== undefined) setDepartureDate(initialDate || todayStr);
  }, [initialDate, todayStr]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        originContainerRef.current &&
        !originContainerRef.current.contains(e.target as Node)
      ) {
        setShowOriginDropdown(false);
      }
      if (
        destinationContainerRef.current &&
        !destinationContainerRef.current.contains(e.target as Node)
      ) {
        setShowDestinationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch locations from route/trip service
  useEffect(() => {
    let isMounted = true;
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const locs = await tripService.getLocations();
        if (isMounted) {
          setLocations(locs);
        }
      } catch {
        if (isMounted) {
          setLocations([]);
        }
      } finally {
        if (isMounted) {
          setLoadingLocations(false);
        }
      }
    };

    fetchLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtering locations based on typed input
  const filteredOriginLocations = useMemo(() => {
    if (!origin.trim()) return locations;
    const q = origin.trim().toLowerCase();
    const matches = locations.filter((loc) => loc.toLowerCase().includes(q));
    // If the input exactly matches a single location, user clicked it to view options: show all
    if (matches.length === 1 && matches[0].toLowerCase() === q) {
      return locations;
    }
    return matches;
  }, [locations, origin]);

  const filteredDestinationLocations = useMemo(() => {
    if (!destination.trim()) return locations;
    const q = destination.trim().toLowerCase();
    const matches = locations.filter((loc) => loc.toLowerCase().includes(q));
    if (matches.length === 1 && matches[0].toLowerCase() === q) {
      return locations;
    }
    return matches;
  }, [locations, destination]);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.origin;
      delete next.destination;
      delete next.match;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);

    const validation = TripSearchQueryVO.validate({
      origin,
      destination,
      departureDate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSearch({
      origin: origin.trim(),
      destination: destination.trim(),
      departureDate: departureDate.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl bg-white shadow-xl transition-all ${
        compact ? "border border-gray-200 p-4" : "p-4 sm:p-6"
      }`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Origin Input & Dropdown */}
        <div ref={originContainerRef} className="relative sm:col-span-4">
          <label className="mb-1 block text-xs font-bold tracking-wider text-gray-500 uppercase">
            Điểm xuất phát
          </label>
          <div
            onClick={() => setShowOriginDropdown(true)}
            className={`flex cursor-text items-center space-x-2 rounded-xl border bg-gray-50/70 p-2.5 transition-colors focus-within:border-blue-500 focus-within:bg-white ${
              errors.origin || errors.match
                ? "border-red-400 bg-red-50/20"
                : showOriginDropdown
                  ? "border-blue-500 bg-white ring-2 ring-blue-100"
                  : "border-gray-200"
            }`}
          >
            {loadingLocations ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
            )}
            <input
              type="text"
              value={origin}
              onFocus={() => setShowOriginDropdown(true)}
              onChange={(e) => {
                setOrigin(e.target.value);
                setShowOriginDropdown(true);
                if (errors.origin || errors.match) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.origin;
                    delete next.match;
                    return next;
                  });
                }
              }}
              placeholder={
                loadingLocations
                  ? "Đang tải danh sách địa điểm..."
                  : locations.length === 0
                    ? "Hiện chưa có tuyến xe nào hoạt động"
                    : "Tỉnh/Thành phố xuất phát"
              }
              className="w-full bg-transparent text-sm font-semibold text-gray-900 focus:outline-hidden"
            />
            {origin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOrigin("");
                  setShowOriginDropdown(true);
                }}
                title="Xóa"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginDropdown((prev) => !prev);
              }}
              title="Chọn địa điểm"
              className="p-1 text-gray-400 transition-colors hover:text-blue-600"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  showOriginDropdown ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>
          </div>

          {/* Custom Origin Dropdown Menu */}
          {showOriginDropdown && (
            <div className="animate-in fade-in-50 zoom-in-95 absolute top-full left-0 z-50 mt-1.5 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white p-2 shadow-2xl">
              {loadingLocations ? (
                <div className="flex items-center justify-center space-x-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>Đang tải danh sách địa điểm...</span>
                </div>
              ) : locations.length === 0 ? (
                <div className="py-5 text-center text-xs text-gray-500">
                  <MapPin className="mx-auto mb-1.5 h-6 w-6 text-gray-400" />
                  <p className="font-semibold text-gray-700">
                    Hiện chưa có tuyến xe nào hoạt động
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Vui lòng quay lại sau
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                    <span>
                      Địa điểm xuất phát ({filteredOriginLocations.length})
                    </span>
                    {origin && (
                      <button
                        type="button"
                        onClick={() => setOrigin("")}
                        className="text-blue-600 hover:underline"
                      >
                        Xóa chọn
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                    {filteredOriginLocations.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        Không tìm thấy địa điểm "{origin}"
                      </div>
                    ) : (
                      filteredOriginLocations.map((loc) => {
                        const isSelected =
                          origin.trim().toLowerCase() === loc.toLowerCase();
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setOrigin(loc);
                              setShowOriginDropdown(false);
                              if (errors.origin || errors.match) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.origin;
                                  delete next.match;
                                  return next;
                                });
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-blue-50 font-semibold text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <MapPin
                                className={`h-4 w-4 shrink-0 ${
                                  isSelected ? "text-blue-600" : "text-gray-400"
                                }`}
                              />
                              <span>{loc}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-blue-600" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {locations.length > 0 && !compact && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-gray-400">Gợi ý:</span>
              {locations.slice(0, 4).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setOrigin(loc);
                    setShowOriginDropdown(false);
                    if (errors.origin || errors.match) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.origin;
                        delete next.match;
                        return next;
                      });
                    }
                  }}
                  className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
          {errors.origin && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {errors.origin}
            </p>
          )}
        </div>

        {/* Swap Button (Hidden on Mobile) */}
        <div className="hidden sm:col-span-1 sm:flex sm:items-end sm:justify-center sm:pb-1.5">
          <button
            type="button"
            onClick={handleSwap}
            title="Đổi chiều đi - đến"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-xs transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        {/* Destination Input & Dropdown */}
        <div ref={destinationContainerRef} className="relative sm:col-span-4">
          <div className="flex items-center justify-between">
            <label className="mb-1 block text-xs font-bold tracking-wider text-gray-500 uppercase">
              Điểm đến
            </label>
            <button
              type="button"
              onClick={handleSwap}
              className="mb-1 flex items-center text-[11px] font-medium text-blue-600 sm:hidden"
            >
              <ArrowLeftRight className="mr-1 h-3 w-3" />
              Đổi chiều
            </button>
          </div>
          <div
            onClick={() => setShowDestinationDropdown(true)}
            className={`flex cursor-text items-center space-x-2 rounded-xl border bg-gray-50/70 p-2.5 transition-colors focus-within:border-blue-500 focus-within:bg-white ${
              errors.destination || errors.match
                ? "border-red-400 bg-red-50/20"
                : showDestinationDropdown
                  ? "border-blue-500 bg-white ring-2 ring-blue-100"
                  : "border-gray-200"
            }`}
          >
            {loadingLocations ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-red-500" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <input
              type="text"
              value={destination}
              onFocus={() => setShowDestinationDropdown(true)}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowDestinationDropdown(true);
                if (errors.destination || errors.match) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.destination;
                    delete next.match;
                    return next;
                  });
                }
              }}
              placeholder={
                loadingLocations
                  ? "Đang tải danh sách địa điểm..."
                  : locations.length === 0
                    ? "Hiện chưa có tuyến xe nào hoạt động"
                    : "Tỉnh/Thành phố đến"
              }
              className="w-full bg-transparent text-sm font-semibold text-gray-900 focus:outline-hidden"
            />
            {destination && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDestination("");
                  setShowDestinationDropdown(true);
                }}
                title="Xóa"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDestinationDropdown((prev) => !prev);
              }}
              title="Chọn địa điểm"
              className="p-1 text-gray-400 transition-colors hover:text-blue-600"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  showDestinationDropdown ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>
          </div>

          {/* Custom Destination Dropdown Menu */}
          {showDestinationDropdown && (
            <div className="animate-in fade-in-50 zoom-in-95 absolute top-full left-0 z-50 mt-1.5 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white p-2 shadow-2xl">
              {loadingLocations ? (
                <div className="flex items-center justify-center space-x-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  <span>Đang tải danh sách địa điểm...</span>
                </div>
              ) : locations.length === 0 ? (
                <div className="py-5 text-center text-xs text-gray-500">
                  <MapPin className="mx-auto mb-1.5 h-6 w-6 text-gray-400" />
                  <p className="font-semibold text-gray-700">
                    Hiện chưa có tuyến xe nào hoạt động
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Vui lòng quay lại sau
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                    <span>
                      Địa điểm đến ({filteredDestinationLocations.length})
                    </span>
                    {destination && (
                      <button
                        type="button"
                        onClick={() => setDestination("")}
                        className="text-blue-600 hover:underline"
                      >
                        Xóa chọn
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                    {filteredDestinationLocations.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        Không tìm thấy địa điểm "{destination}"
                      </div>
                    ) : (
                      filteredDestinationLocations.map((loc) => {
                        const isSelected =
                          destination.trim().toLowerCase() ===
                          loc.toLowerCase();
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setDestination(loc);
                              setShowDestinationDropdown(false);
                              if (errors.destination || errors.match) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.destination;
                                  delete next.match;
                                  return next;
                                });
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-red-50 font-semibold text-red-700"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <MapPin
                                className={`h-4 w-4 shrink-0 ${
                                  isSelected ? "text-red-500" : "text-gray-400"
                                }`}
                              />
                              <span>{loc}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-red-600" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {locations.length > 0 && !compact && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-gray-400">Gợi ý:</span>
              {locations.slice(0, 4).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setDestination(loc);
                    setShowDestinationDropdown(false);
                    if (errors.destination || errors.match) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.destination;
                        delete next.match;
                        return next;
                      });
                    }
                  }}
                  className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
          {errors.destination && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {errors.destination}
            </p>
          )}
          {errors.match && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {errors.match}
            </p>
          )}
        </div>

        {/* Departure Date Input */}
        <div className="sm:col-span-3">
          <div className="flex items-center justify-between">
            <label className="mb-1 block text-xs font-bold tracking-wider text-gray-500 uppercase">
              Ngày khởi hành
            </label>
            <div className="mb-1 flex space-x-1 sm:hidden">
              <button
                type="button"
                onClick={() => setDepartureDate(todayStr)}
                className="text-[10px] font-medium text-blue-600 hover:underline"
              >
                Hôm nay
              </button>
              <span className="text-[10px] text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setDepartureDate(tomorrowStr)}
                className="text-[10px] font-medium text-blue-600 hover:underline"
              >
                Ngày mai
              </button>
            </div>
          </div>
          <div
            className={`flex items-center space-x-2 rounded-xl border bg-gray-50/70 p-2.5 transition-colors focus-within:border-blue-500 focus-within:bg-white ${
              errors.departureDate
                ? "border-red-400 bg-red-50/20"
                : "border-gray-200"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
            <input
              type="date"
              min={todayStr}
              value={departureDate}
              onChange={(e) => {
                setDepartureDate(e.target.value);
                if (errors.departureDate) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.departureDate;
                    return next;
                  });
                }
              }}
              className="w-full bg-transparent text-sm font-semibold text-gray-900 focus:outline-hidden"
            />
          </div>
          {errors.departureDate && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {errors.departureDate}
            </p>
          )}
        </div>
      </div>

      {/* Date Shortcuts & Submit Button */}
      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center">
        <div className="hidden items-center space-x-2 text-xs text-gray-500 sm:flex">
          <span className="text-gray-400">Chọn nhanh:</span>
          <button
            type="button"
            onClick={() => setDepartureDate(todayStr)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              departureDate === todayStr
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setDepartureDate(tomorrowStr)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              departureDate === tomorrowStr
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Ngày mai
          </button>
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-blue-600 px-7 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 sm:w-auto"
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Tìm Chuyến Xe</span>
        </Button>
      </div>
    </form>
  );
};
