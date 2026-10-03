import { SearchService } from './search.service';
import { CategoryMode } from './search.dto';

describe('SearchService availability pagination', () => {
  it('fills the first page from later available listings and avoids duplicates on the next page', async () => {
    const listings = Array.from({ length: 130 }, (_, index) => ({
      id: `listing-${index}`,
      category: CategoryMode.STAY,
    }));
    const listingRepo = {
      search: jest.fn(async ({ limit, offset }: { limit: number; offset: number }) =>
        listings.slice(offset, offset + limit),
      ),
    };
    const inventoryClient = {
      checkBatchAvailability: jest.fn(async ({ listingIds }: { listingIds: string[] }) => ({
        availableListingIds: listingIds.filter(
          (id) => Number(id.slice('listing-'.length)) >= 100,
        ),
      })),
    };
    const cache = { get: jest.fn(async () => undefined), set: jest.fn(async () => undefined) };
    const service = new SearchService(
      listingRepo as any,
      {} as any,
      {} as any,
      inventoryClient as any,
      cache as any,
    );
    const query = {
      category: CategoryMode.STAY,
      limit: 20,
      checkIn: '2026-10-15',
      checkOut: '2026-10-17',
    };

    const first = await service.searchListings({ ...query, offset: 0 });
    const second = await service.searchListings({ ...query, offset: 20 });

    expect(first.total).toBe(20);
    expect(first.data.map((item: { id: string }) => item.id)).toEqual(
      listings.slice(100, 120).map((item) => item.id),
    );
    expect(second.total).toBe(10);
    expect(second.data.map((item: { id: string }) => item.id)).toEqual(
      listings.slice(120, 130).map((item) => item.id),
    );
    expect(listingRepo.search).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 100 }),
    );
  });
});
