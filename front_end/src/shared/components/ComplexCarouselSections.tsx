"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { ComplexOffering } from "@/services/complex";
import CarouselSection from "./CarouselSection";
import OfferingCarouselItem from "./OfferingCarouselItem";

type ComplexCarouselSectionsProps = {
  complexes?: ComplexOffering[] | null;
  searchText?: string;
  title?: string;
  titlePrefix?: string;
  grouped?: boolean;
  maxGroups?: number;
  maxItemsPerGroup?: number;
};

const normalizeText = (value?: string) =>
  value
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim() ?? "";

const toCarouselItem = (item: ComplexOffering) => ({
  id: item.id,
  name: item.name,
  image: item.image || item.thumbnailUrl,
  thumbnailUrl: item.thumbnailUrl,
  galleryUrls: item.galleryUrls,
  description: item.description,
  address: [
    item.province,
    item.listingCount ? `${item.listingCount} dịch vụ` : undefined,
  ]
    .filter(Boolean)
    .join(" · "),
});

export default function ComplexCarouselSections({
  complexes,
  searchText,
  title = "Khu du lịch & tổ hợp gợi ý",
  titlePrefix = "Khu du lịch tại",
  grouped = false,
  maxGroups = 3,
  maxItemsPerGroup = 12,
}: ComplexCarouselSectionsProps) {
  const router = useRouter();

  const filteredComplexes = useMemo(() => {
    const list = (complexes ?? []).filter((item): item is ComplexOffering =>
      Boolean(item?.id && item?.name),
    );
    const query = normalizeText(searchText);
    if (!query) return list;

    return list.filter((item) => {
      const haystack = normalizeText(
        [item.name, item.province, item.description].filter(Boolean).join(" "),
      );
      return haystack.includes(query);
    });
  }, [complexes, searchText]);

  const groups = useMemo(() => {
    const byProvince = new Map<string, ComplexOffering[]>();

    filteredComplexes.forEach((item) => {
      const province = item.province || item.address || "Việt Nam";
      const list = byProvince.get(province) ?? [];
      list.push(item);
      byProvince.set(province, list);
    });

    return Array.from(byProvince.entries())
      .filter(([, list]) => list.length >= 6)
      .map(([name, list]) => ({
        name,
        list: list
          .sort((a, b) => (b.listingCount ?? 0) - (a.listingCount ?? 0))
          .slice(0, maxItemsPerGroup),
        score: list.reduce((sum, item) => sum + (item.listingCount ?? 0), 0),
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, maxGroups);
  }, [filteredComplexes, maxGroups, maxItemsPerGroup]);

  const openComplexSearch = (item: ComplexOffering | null | undefined) => {
    if (!item?.id) return;
    router.push(`/complex/${item.id}/detail`);
  };

  if (filteredComplexes.length === 0) return null;

  if (grouped) {
    return (
      <>
        {groups.map((group) => (
          <div key={group.name}>
            <CarouselSection title={`${titlePrefix} ${group.name}`}>
              {group.list.map((item) => (
                <OfferingCarouselItem
                  key={item.id}
                  item={toCarouselItem(item)}
                  onSelect={() => openComplexSearch(item)}
                />
              ))}
            </CarouselSection>
            <div className="h-10" />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <CarouselSection title={title}>
        {filteredComplexes.slice(0, maxItemsPerGroup).map((item) => (
          <OfferingCarouselItem
            key={item.id}
            item={toCarouselItem(item)}
            onSelect={() => openComplexSearch(item)}
          />
        ))}
      </CarouselSection>
      <div className="h-10" />
    </>
  );
}
