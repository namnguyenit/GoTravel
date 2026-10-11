import { ConflictException } from '@nestjs/common';
import { TransportService } from './transport.service';
import type { TransportRepository } from '../domain/transport.repository';
import type { TransportIntegrations } from './transport-integrations.port';
import type { TransportTrip } from '../domain/transport.types';
import type { StaffService } from '../../staff/application/staff.service';

const trip: TransportTrip = {
  id: 'trip', operatorId: 'operator', operatorUserId: 'owner', routeId: 'route',
  origin: 'Hà Nội', destination: 'Đà Nẵng',
  departureAt: new Date(Date.now() + 24 * 60 * 60_000),
  arrivalAt: new Date(Date.now() + 36 * 60 * 60_000),
  priceVnd: '250000', offerListingId: 'offer', status: 'ON_SALE',
  totalSeats: 1,
  seats: [{ id: 'seat', code: 'A1', level: 1, seatClass: 'STANDARD' }],
  stops: [{ id: 'start', name: 'Hà Nội', order: 1 },
    { id: 'end', name: 'Đà Nẵng', order: 2 }],
};

describe('TransportService', () => {
  const repo = { findTrip: jest.fn(), issueTickets: jest.fn(), voidTickets: jest.fn(),
    requestTripCancellation: jest.fn(), markTripCancellationProgress: jest.fn(),
    hasTripCancellation: jest.fn(), ticketForCheckIn: jest.fn(), markCheckedIn: jest.fn() };
  const integrations = { getFulfillment: jest.fn(), getOrderStatus: jest.fn(),
    setSaleEnabled: jest.fn(), requestTripCancellation: jest.fn() };
  const staff = { verify: jest.fn() };
  const service = new TransportService(repo as unknown as TransportRepository,
    integrations as unknown as TransportIntegrations, staff as unknown as StaffService);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findTrip.mockResolvedValue(trip);
    repo.hasTripCancellation.mockResolvedValue(false);
  });

  it('quotes only valid stop direction with a server price', async () => {
    const quoted = await service.quote('trip', [{ seatId: 'seat', name: 'Khách A',
      pickupStopId: 'start', dropoffStopId: 'end' }]);
    expect(quoted.totalAmount).toBe('250000');
    await expect(service.quote('trip', [{ seatId: 'seat', name: 'Khách A',
      pickupStopId: 'end', dropoffStopId: 'start' }])).rejects.toThrow();
  });

  it('does not issue a ticket until Cart and Inventory agree on sold seats', async () => {
    integrations.getFulfillment.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'FULFILLMENT_PENDING', paymentMethod: 'ONLINE',
      items: [{ orderItemId: 'item', seatId: 'seat', passengerName: 'Khách A',
        pickupStopId: 'start', dropoffStopId: 'end' }] });
    integrations.getOrderStatus.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'HELD', seatIds: ['seat'] });
    await expect(service.issueTickets('order', [{ orderItemId: 'item', seatId: 'seat',
      passengerName: 'Khách A', pickupStopId: 'start', dropoffStopId: 'end' }]))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repo.issueTickets).not.toHaveBeenCalled();
  });

  it('voids only a paid cancellation and passes exact order item ids', async () => {
    integrations.getFulfillment.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'CONFIRMED', items: [{ orderItemId: 'item' }] });
    await expect(service.voidTickets('order')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.voidTickets).not.toHaveBeenCalled();
    integrations.getFulfillment.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'CANCELLATION_PENDING', items: [{ orderItemId: 'item' }] });
    await service.voidTickets('order');
    expect(repo.voidTickets).toHaveBeenCalledWith('order', 'trip', ['item']);
  });

  it('disables inventory sales before recording a durable trip cancellation', async () => {
    integrations.setSaleEnabled.mockResolvedValue(undefined);
    repo.requestTripCancellation.mockResolvedValue(undefined);
    integrations.requestTripCancellation.mockResolvedValue({ safeToCancel: false,
      completed: false, pendingOrders: 1, pendingRefunds: 0 });
    repo.markTripCancellationProgress.mockResolvedValue(undefined);

    await service.requestTripCancellation('trip', 'owner', 'Xe không thể khởi hành');

    expect(integrations.setSaleEnabled).toHaveBeenCalledWith('trip', false);
    expect(repo.requestTripCancellation).toHaveBeenCalledWith('trip', 'owner', 'Xe không thể khởi hành');
    expect(integrations.setSaleEnabled.mock.invocationCallOrder[0])
      .toBeLessThan(repo.requestTripCancellation.mock.invocationCallOrder[0]);
    expect(repo.markTripCancellationProgress).toHaveBeenCalledWith('trip', false, false, 1, 0);
  });

  it('checks in only a confirmed ticket backed by sold inventory', async () => {
    repo.ticketForCheckIn.mockResolvedValue({ id: 'ticket', orderId: 'order',
      orderItemId: 'item', tripId: 'trip', status: 'ACTIVE',
      departureAt: new Date(Date.now() + 60 * 60_000) });
    staff.verify.mockResolvedValue({ operatorId: 'operator' });
    integrations.getFulfillment.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'CONFIRMED', paymentMethod: 'ONLINE',
      items: [{ orderItemId: 'item', seatId: 'seat', passengerName: 'Khách A',
        pickupStopId: 'start', dropoffStopId: 'end' }] });
    integrations.getOrderStatus.mockResolvedValue({ orderId: 'order', tripId: 'trip',
      status: 'SOLD', seatIds: ['seat'] });

    await expect(service.checkIn('signed-ticket', 'staff')).resolves.toEqual({
      ticketId: 'ticket', status: 'CHECKED_IN',
    });
    expect(staff.verify).toHaveBeenCalledWith('staff', 'trip', 'CHECK_IN');
    expect(repo.markCheckedIn).toHaveBeenCalledWith('ticket', 'staff');
  });
});
