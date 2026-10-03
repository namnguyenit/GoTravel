import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisCacheService } from '../cache/redis-cache.service';
import { InventoryClient } from '../inventory/inventory.client';
import { LocationResolver } from './location-resolver';
import { LandmarkRepository } from './repositories/landmark.repository';
import { ListingRepository } from './repositories/listing.repository';
import { CategoryMode, SearchQueryDto } from './search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly listingRepo: ListingRepository,
    private readonly landmarkRepo: LandmarkRepository,
    private readonly locationResolver: LocationResolver,
    private readonly inventoryClient: InventoryClient,
    private readonly cacheService: RedisCacheService,
  ) {}

  private getTodayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  async suggestLocations(query: string) {
    if (!query) return [];
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `autocomplete:locations:${normalizedQuery}:limit15`;

    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`[Cache HIT] autocomplete ${cacheKey}`);
      return cached;
    }
    this.logger.debug(`[Cache MISS] autocomplete ${cacheKey}`);

    const startTime = Date.now();
    const results = await this.locationResolver.suggestLocations(query);
    this.logger.debug(
      `DB Query duration (autocomplete): ${Date.now() - startTime}ms`,
    );

    await this.cacheService.set(cacheKey, results, 300);
    return results;
  }

  async searchListings(dto: SearchQueryDto) {
    const dtoHash = createHash('md5').update(JSON.stringify(dto)).digest('hex');
    const cacheKey = `search:listings:${dtoHash}`;

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`[Cache HIT] search ${cacheKey}`);
      return cached;
    }
    this.logger.debug(`[Cache MISS] search ${cacheKey}`);

    let lat = dto.lat;
    let lng = dto.lng;
    let radiusMeters = dto.radiusMeters || 5000;
    const category = dto.category || CategoryMode.ALL;
    const keyword = dto.q?.trim();
    let province: string | undefined;
    let complexId: string | undefined;
    const hasBbox =
      dto.minLat !== undefined &&
      dto.maxLat !== undefined &&
      dto.minLng !== undefined &&
      dto.maxLng !== undefined;

    if (lat == null && lng == null && dto.locationQuery) {
      const resolved = await this.locationResolver.resolveLocation(
        dto.locationQuery,
      );
      if (resolved?.resolvedType === 'PROVINCE') {
        province = resolved.province;
      } else if (resolved?.resolvedType === 'COMPLEX') {
        complexId = resolved.complexId;
        lat = resolved.latitude;
        lng = resolved.longitude;
      } else if (resolved && resolved.latitude && resolved.longitude) {
        lat = resolved.latitude;
        lng = resolved.longitude;
        radiusMeters = resolved.radiusMeters || radiusMeters;
      }
    }

    if (lat == null && lng == null && dto.landmarkId) {
      const landmark = await this.landmarkRepo.findById(dto.landmarkId);
      if (landmark) {
        lat = landmark.latitude;
        lng = landmark.longitude;
        radiusMeters = landmark.radius_meters || radiusMeters;
        province = landmark.province || province;
      }
    }

    const hasCoordinates = lat != null && lng != null;
    const hasKeyword = Boolean(keyword);
    const hasResolvedFilter = Boolean(province || complexId);
    const canBrowseByCategory =
      !hasCoordinates && category !== CategoryMode.ALL;

    if (
      !hasCoordinates &&
      !hasBbox &&
      !canBrowseByCategory &&
      !hasKeyword &&
      !hasResolvedFilter
    ) {
      return {
        mode: category === CategoryMode.ALL ? 'GROUPED' : 'MIXED',
        data: [],
        total: 0,
        message: 'No coordinates found for the search context',
      };
    }

    const searchParams = {
      ...(hasCoordinates ? { lat, lng, radiusMeters } : {}),
      ...(hasBbox
        ? {
            minLat: dto.minLat,
            maxLat: dto.maxLat,
            minLng: dto.minLng,
            maxLng: dto.maxLng,
          }
        : {}),
      q: keyword,
      province,
      complexId,
      category,
      subCategory: dto.subCategory,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      minRating: dto.minRating,
      amenities: dto.amenities ? dto.amenities.split(',') : undefined,
      sortBy: dto.sortBy,
    };

    const availabilityStart = dto.checkIn || this.getTodayIso();
    const availabilityEnd = dto.checkOut || availabilityStart;
    const pageLimit = dto.limit || 20;
    const pageOffset = dto.offset || 0;
    const requiredAvailableCount = pageOffset + pageLimit;
    const batchSize = 50;
    const availableItems: any[] = [];
    let rawOffset = 0;

    // Availability lives in another service. Apply pagination after checking
    // inventory so an unavailable first batch cannot hide later listings.
    while (availableItems.length < requiredAvailableCount) {
      const candidates = await this.listingRepo.search({
        ...searchParams,
        limit: batchSize,
        offset: rawOffset,
      });
      if (candidates.length === 0) break;
      rawOffset += candidates.length;

      const inventoryRes = await this.inventoryClient.checkBatchAvailability({
        listingIds: candidates.map((candidate) => candidate.id),
        startDate: availabilityStart,
        endDate: availabilityEnd,
        requiredQuantity: dto.guests || 1,
      });
      const availableSet = new Set(inventoryRes.availableListingIds || []);
      availableItems.push(
        ...candidates
          .filter((candidate) => availableSet.has(candidate.id))
          .map((candidate) => ({ ...candidate, isAvailable: true })),
      );

      if (candidates.length < batchSize) break;
    }

    const finalItems = availableItems.slice(pageOffset, requiredAvailableCount);

    let result: any;
    if (category === CategoryMode.ALL) {
      result = {
        mode: 'GROUPED',
        data: [
          {
            sectionTitle: 'Nơi lưu trú',
            category: 'STAY',
            items: finalItems.filter((i) => i.category === 'STAY'),
          },
          {
            sectionTitle: 'Trải nghiệm',
            category: 'EXP',
            items: finalItems.filter((i) => i.category === 'EXP'),
          },
          {
            sectionTitle: 'Dịch vụ',
            category: 'SVC',
            items: finalItems.filter((i) => i.category === 'SVC'),
          },
        ],
        total: finalItems.length,
      };
    } else {
      result = {
        mode: 'MIXED',
        data: finalItems,
        total: finalItems.length,
      };
    }

    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  async searchMap(dto: SearchQueryDto) {
    const result = await this.searchListings(dto);
    const items =
      result.mode === 'GROUPED'
        ? result.data.flatMap((section: any) => section.items || [])
        : result.data || [];

    const data = items
      .filter((item: any) => item.latitude != null && item.longitude != null)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        latitude: item.latitude,
        longitude: item.longitude,
        price: item.basePrice,
        priceUnit: item.priceUnit,
        averageRating: item.averageRating,
        thumbnailUrl: item.thumbnailUrl,
        complexId: item.complexId || item.complex_id,
      }));

    return {
      mode: 'MAP',
      total: data.length,
      data,
    };
  }
}
