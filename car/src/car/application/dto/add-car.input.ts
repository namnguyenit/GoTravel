import { CarType } from '../../domain/value-object/car-type.enum';

export interface AddCarInput {
  userId: string;
  name: string;
  type: CarType;
  licensePlate: string;
  totalSeats: number;
  deckCount?: number;
  seatColumns?: number;
  lowerDeckSeats?: number;
  seatClass?: string;
}
