import { BookingService } from '../application/service/booking.service';
import type { IBookingService } from '../application/port/booking.service.interface';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';

export const bookingService: IBookingService = new BookingService(httpClient);
