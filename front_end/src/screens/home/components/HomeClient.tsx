"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import ImageNavigation from "./ImageNavigation";
import { useSafeContext } from "@/shared/hooks";
import { HomeContext } from "../providers/home.provider";
import { CarouselSection, ComplexCarouselSections, SearchInfoSection } from "@/shared/components";
import { OfferingCarouselItem } from "@/shared/components";
import { AppContext } from "@/features/app/providers/app.provider";
import { FilterService } from "@/services/filter";

type HomeOffering = {
  id?: string;
  name?: string;
  price?: number;
  description?: string;
  address?: string;
  rating?: number;
  image?: string;
  thumbnailUrl?: string;
  referenceImageUrl?: string;
  galleryUrls?: string[];
  images?: string[];
  imageUrls?: string[];
};

type LandmarkOffering = HomeOffering & {
  province?: string;
};

export default function HomeClient() {
  const router = useRouter();
  // Giữ landmarks từ TestSystem cho background
  const { imageIndex, clock, setClock, experiences, places, services, landmarks, complexes } =
    useSafeContext(HomeContext);
  const { filter } = useSafeContext(AppContext) ?? { filter: undefined };

  useEffect(() => {
    setClock(6000);
    const activeClock = clock.current;
    return () => {
      clearInterval(activeClock ?? undefined);
    };
  }, [clock, setClock]);

  const landmarkList = (landmarks ?? []) as LandmarkOffering[];
  const placeList = (places ?? []) as HomeOffering[];
  const experienceList = (experiences ?? []) as HomeOffering[];
  const serviceList = (services ?? []) as HomeOffering[];
  const landmarkRating = Number(landmarks?.[imageIndex]?.rating);

  const rankProvinceGroups = (groups: Record<string, HomeOffering[]>) => {
    return Object.entries(groups)
      .filter(([, list]) => list.length >= 6)
      .map(([name, list]) => {
        // Filter out unrated listings (those with rating === 0 or undefined)
        const ratedListings = list.filter((x) => x.rating && x.rating > 0);
        
        let score = 0;
        if (ratedListings.length > 0) {
          // Has rated listings: weight average rating heavily + count of rated listings
          const avgRating = ratedListings.reduce((sum, x) => sum + (x.rating ?? 0), 0) / ratedListings.length;
          const count = ratedListings.length;
          score = 100000 + (avgRating * 100) + count;
        } else {
          // Unrated-only listings: prioritize based on sheer listing count
          score = list.length;
        }

        // Sort items in this province by rating descending
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        return { name, list: list.slice(0, 12), score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  // 2. Top 3 địa điểm có khách sạn ưa chuộng
  const groupPlacesByProvince = (placesList: HomeOffering[]) => {
    if (!placesList) return [];
    const groups: Record<string, HomeOffering[]> = {};
    placesList.forEach(p => {
      const parts = p.address?.split(",") || [];
      const province = (parts[parts.length - 1] || p.address || "Việt Nam").trim();
      if (!groups[province]) groups[province] = [];
      groups[province].push(p);
    });
    
    return rankProvinceGroups(groups);
  };
  const topProvinces = groupPlacesByProvince(placeList);

  // 3. Top 3 các trải nghiệm ưa chuộng
  const groupExperiencesByProvince = (expList: HomeOffering[]) => {
    if (!expList) return [];
    const groups: Record<string, HomeOffering[]> = {};
    expList.forEach(e => {
      const parts = e.address?.split(",") || [];
      const province = (parts[parts.length - 1] || e.address || "Việt Nam").trim();
      if (!groups[province]) groups[province] = [];
      groups[province].push(e);
    });
    
    return rankProvinceGroups(groups);
  };
  const topExpGroups = groupExperiencesByProvince(experienceList);

  // 4. Top 3 các dịch vụ ưa chuộng
  const groupServicesByProvince = (svcList: HomeOffering[]) => {
    if (!svcList) return [];
    const groups: Record<string, HomeOffering[]> = {};
    svcList.forEach(s => {
      const parts = s.address?.split(",") || [];
      const province = (parts[parts.length - 1] || s.address || "Việt Nam").trim();
      if (!groups[province]) groups[province] = [];
      groups[province].push(s);
    });
    
    return rankProvinceGroups(groups);
  };
  const topSvcGroups = groupServicesByProvince(serviceList);

  return (
    <>
      <div className="relative w-full h-[450px] md:h-[640px] bg-zinc-950 flex items-center">
        {/* BG — giữ landmarks làm background như TestSystem */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="size-full scale-115 bg-zinc-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={landmarks?.[imageIndex]?.id}
                initial={{ opacity: 0, x: "5%" }}
                animate={{ opacity: [0, 1, 1], x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeIn" }}
                className="size-full"
              >
                <img
                  src={landmarks?.[imageIndex]?.thumbnailUrl ?? undefined}
                  alt=""
                  className="size-full object-cover opacity-90"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Lớp phủ Gradient Trái-Sang-Phải làm tối bên trái nơi đặt chữ */}
          <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          {/* Lớp phủ tối phần trên (navbar area) */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
          {/* Lớp phủ tối phần dưới (bottom transition area) */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        {/* FG */}
        <div className="relative h-full w-full max-w-[1707px] mx-auto px-6 md:px-12 flex items-center z-20">
          {/* INFO — giữ thông tin landmark từ TestSystem */}
          <div className="w-full max-w-[700px] flex items-center justify-start py-12 md:py-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={landmarks?.[imageIndex]?.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full flex flex-col items-start text-white"
              >
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-6 text-xs font-semibold">
                  {Number.isFinite(landmarkRating) && landmarkRating > 0 && (
                    <span className="border border-[#FF385C] text-[#FF385C] bg-[#FF385C]/10 px-2 py-0.5 rounded-[5px]">
                      ★ {landmarkRating}
                    </span>
                  )}
                  <span className="border border-white/40 bg-white/10 text-white px-2 py-0.5 rounded-[5px]">
                    {landmarks?.[imageIndex]?.province || "Việt Nam"}
                  </span>
                  <span className="bg-white/10 text-white px-2 py-0.5 rounded-[5px]">
                    Điểm đến nổi bật
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-[32px] md:text-[42px] font-bold leading-[1.3] md:leading-[1.5] mb-4 text-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.3)]">
                  <button
                    onClick={() => {
                      const activeLandmark = landmarks?.[imageIndex];
                      if (activeLandmark?.id) {
                        router.push(`/landmark/${activeLandmark.id}/detail`);
                      }
                    }}
                    className="hover:underline text-left cursor-pointer border-none bg-transparent text-white font-bold p-0"
                  >
                    {landmarks?.[imageIndex]?.name}
                  </button>
                </h1>

                {/* Description */}
                <p className="text-sm text-white/80 leading-[1.6] mb-8 max-w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] line-clamp-3">
                  {landmarks?.[imageIndex]?.description}
                </p>

                {/* CTA Action Group */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const activeLandmark = landmarks?.[imageIndex];
                      if (activeLandmark?.id) {
                        router.push(`/landmark/${activeLandmark.id}/detail`);
                      }
                    }}
                    className="h-12 px-6 rounded-full bg-gradient-to-r from-[#E61E4F] via-[#E61E4F] to-[#D70466] text-white font-semibold text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg hover:brightness-105 active:scale-98 transition-all duration-200 cursor-pointer border-none outline-none group"
                  >
                    {/* Compass Icon */}
                    <svg className="w-5 h-5 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                    <span>Khám phá ngay</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Thumbs Navigation */}
          <div className="absolute bottom-6 md:bottom-12 left-6 md:left-auto right-6 md:right-12 z-30">
            <ImageNavigation />
          </div>
        </div>
      </div>

      <section className="relative z-30 mx-auto mt-6 w-full max-w-[920px] px-4 sm:px-6">
        <SearchInfoSection
          filter={filter ?? {}}
          className="border-transparent shadow-[0_18px_45px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.08)]"
          onClickSearch={(value) => {
            const params = FilterService.set(value);
            router.push(`/search?${params.toString()}`);
          }}
        />
      </section>

      <div className="h-14" />

      {/* Top Địa Danh Nổi Tiếng */}
      {landmarkList.length > 0 && (
        <>
          <CarouselSection title="Địa danh nổi bật">
            {landmarkList.map((lm) => (
              <OfferingCarouselItem
                key={lm?.id}
                item={{
                  id: lm?.id,
                  name: lm?.name,
                  image: lm?.thumbnailUrl || lm?.referenceImageUrl,
                  thumbnailUrl: lm?.thumbnailUrl,
                  referenceImageUrl: lm?.referenceImageUrl,
                  galleryUrls: lm?.galleryUrls,
                  description: lm?.description,
                }}
                onSelect={(item) => {
                  if (item?.id) router.push(`/landmark/${item.id}/detail`);
                }}
                unit="/ đêm"
              />
            ))}
          </CarouselSection>
          <div className="h-10" />
        </>
      )}

      {complexes.length > 0 && (
        <ComplexCarouselSections
          complexes={complexes}
          grouped
          maxGroups={3}
          titlePrefix="Khu du lịch tại"
        />
      )}

      {/* Top 3 locations with popular hotels */}
      {topProvinces.length > 0 && (
        <>
          {topProvinces.map((group) => (
            <div key={group.name}>
              <CarouselSection title={`Khách sạn tại ${group.name}`}>
                {group.list.map((e) => (
                  <OfferingCarouselItem
                    key={e?.id}
                    item={e}
                    onSelect={(item) => {
                      if (item?.id) router.push(`/place/${item.id}/detail`);
                    }}
                    unit="/ đêm"
                  />
                ))}
              </CarouselSection>
              <div className="h-10" />
            </div>
          ))}
        </>
      )}

      {/* Top 3 popular experiences */}
      {topExpGroups.length > 0 && (
        <>
          {topExpGroups.map((group) => (
            <div key={group.name}>
              <CarouselSection title={`Trải nghiệm tại ${group.name}`}>
                {group.list.map((e) => (
                  <OfferingCarouselItem
                    key={e?.id}
                    item={e}
                    onSelect={(item) => {
                      if (item?.id) router.push(`/experience/${item.id}/detail`);
                    }}
                    unit="/ nhóm"
                  />
                ))}
              </CarouselSection>
              <div className="h-10" />
            </div>
          ))}
        </>
      )}

      {/* Top 3 popular services */}
      {topSvcGroups.length > 0 && (
        <>
          {topSvcGroups.map((group) => (
            <div key={group.name}>
              <CarouselSection title={`Dịch vụ tại ${group.name}`}>
                {group.list.map((e) => (
                  <OfferingCarouselItem
                    key={e?.id}
                    item={e}
                    onSelect={(item) => {
                      if (item?.id) router.push(`/service/${item.id}/detail`);
                    }}
                    unit="/ dịch vụ"
                  />
                ))}
              </CarouselSection>
              <div className="h-10" />
            </div>
          ))}
        </>
      )}
    </>
  );
}
