import { MoneyVo } from '@/shared/domain/money.vo';
import { DateVo } from '@/shared/domain/date.vo';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type ItemState =
  | 'ACTIVE'
  | 'AMENDING'
  | 'EXCHANGING'
  | 'OPERATION_PENDING'
  | 'CANCELLED'
  | 'VOID'
  | 'EXCHANGED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'NO_SHOW'
  | 'ABORTED';

export type BoardingStatus =
  | 'ACTIVE'
  | 'CHECKED_IN'
  | 'NO_SHOW'
  | 'VOID';

export interface OrderCustomerInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface OrderItemProps {
  itemId: string;
  listingId?: string;
  hostId?: string;
  transportTripId: string;
  transportSeatId: string;
  transportSeatCode: string;
  passengerName: string;
  pickupStopId?: string;
  dropoffStopId?: string;
  transportTicketId?: string;
  transportBoardingStatus?: BoardingStatus | string;
  transportCheckInToken?: string;
  transportTicketRevision?: number;
  transportItemState?: ItemState | string;
  transportFareVnd?: string;
  transportDepartureAt?: string;
  listingTitle?: string;
}

export class OrderItemEntity {
  private readonly props: OrderItemProps;

  constructor(props: OrderItemProps) {
    this.props = props;
  }

  get itemId(): string {
    return this.props.itemId;
  }

  get listingId(): string | undefined {
    return this.props.listingId;
  }

  get transportTripId(): string {
    return this.props.transportTripId;
  }

  get transportSeatId(): string {
    return this.props.transportSeatId;
  }

  get transportSeatCode(): string {
    return this.props.transportSeatCode;
  }

  get passengerName(): string {
    return this.props.passengerName;
  }

  get pickupStopId(): string | undefined {
    return this.props.pickupStopId;
  }

  get dropoffStopId(): string | undefined {
    return this.props.dropoffStopId;
  }

  get transportTicketId(): string | undefined {
    return this.props.transportTicketId;
  }

  get transportBoardingStatus(): string {
    return this.props.transportBoardingStatus || 'ACTIVE';
  }

  get transportCheckInToken(): string | undefined {
    return this.props.transportCheckInToken;
  }

  get transportTicketRevision(): number {
    return this.props.transportTicketRevision ?? 1;
  }

  get transportItemState(): string {
    return this.props.transportItemState || 'ACTIVE';
  }

  get transportFareVnd(): MoneyVo {
    return new MoneyVo(this.props.transportFareVnd || '0');
  }

  get transportDepartureAt(): string | undefined {
    return this.props.transportDepartureAt;
  }

  get listingTitle(): string | undefined {
    return this.props.listingTitle;
  }

  public isCancelable(): boolean {
    return this.transportItemState === 'ACTIVE' && this.transportBoardingStatus === 'ACTIVE';
  }

  public isExchangeable(): boolean {
    return this.transportItemState === 'ACTIVE' && this.transportBoardingStatus === 'ACTIVE';
  }

  static fromApiResponse(raw: any): OrderItemEntity {
    return new OrderItemEntity({
      itemId: raw.itemId || raw.id || '',
      listingId: raw.listingId,
      hostId: raw.hostId,
      transportTripId: raw.transportTripId || raw.tripId || '',
      transportSeatId: raw.transportSeatId || raw.seatId || '',
      transportSeatCode: raw.transportSeatCode || raw.seatCode || '',
      passengerName: raw.passengerName || '',
      pickupStopId: raw.pickupStopId,
      dropoffStopId: raw.dropoffStopId,
      transportTicketId: raw.transportTicketId || raw.ticketId,
      transportBoardingStatus: raw.transportBoardingStatus,
      transportCheckInToken: raw.transportCheckInToken,
      transportTicketRevision: raw.transportTicketRevision,
      transportItemState: raw.transportItemState,
      transportFareVnd: raw.transportFareVnd || String(raw.totalPrice || raw.unitPrice || '0'),
      transportDepartureAt: raw.transportDepartureAt,
      listingTitle: raw.listingTitle,
    });
  }
}

export interface OrderProps {
  orderId: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus | string;
  orderKind: string;
  paymentMethod?: string;
  totalAmount: MoneyVo;
  currency: string;
  customerInfo: OrderCustomerInfo;
  expiresAt?: string;
  createdAt: string;
  items: OrderItemEntity[];
}

export class OrderEntity {
  private readonly props: OrderProps;

  constructor(props: OrderProps) {
    this.props = props;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get orderNumber(): string {
    return this.props.orderNumber || this.props.orderId;
  }

  get status(): string {
    return this.props.status;
  }

  get orderKind(): string {
    return this.props.orderKind;
  }

  get paymentMethod(): string | undefined {
    return this.props.paymentMethod;
  }

  get totalAmount(): MoneyVo {
    return this.props.totalAmount;
  }

  get customerInfo(): OrderCustomerInfo {
    return this.props.customerInfo;
  }

  get expiresAt(): string | undefined {
    return this.props.expiresAt;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get items(): OrderItemEntity[] {
    return this.props.items;
  }

  public isPending(): boolean {
    return ['PENDING', 'PAYMENT_PENDING'].includes(this.props.status);
  }

  public isConfirmed(): boolean {
    return ['CONFIRMED', 'COMPLETED'].includes(this.props.status);
  }

  public isCancelled(): boolean {
    return this.props.status === 'CANCELLED';
  }

  public isHoldActive(now: Date = new Date()): boolean {
    if (!this.isPending()) return false;
    if (!this.props.expiresAt) return true;
    const expiry = DateVo.parseLocalDateTime(this.props.expiresAt);
    return expiry.getTime() > now.getTime();
  }

  public getRemainingSeconds(now: Date = new Date()): number {
    if (!this.props.expiresAt) return 0;
    const expiry = DateVo.parseLocalDateTime(this.props.expiresAt);
    const diff = Math.floor((expiry.getTime() - now.getTime()) / 1000);
    return Math.max(0, diff);
  }

  static fromApiResponse(raw: any): OrderEntity {
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items = rawItems.map((item: any) => OrderItemEntity.fromApiResponse(item));

    return new OrderEntity({
      orderId: raw.orderId || raw.id || '',
      userId: raw.userId || '',
      orderNumber: raw.orderNumber || raw.orderId || '',
      status: (raw.status as OrderStatus) || 'PENDING',
      orderKind: raw.orderKind || 'GOCAR_TICKET',
      paymentMethod: raw.paymentMethod,
      totalAmount: new MoneyVo(raw.totalAmount || raw.transportActiveFareAmount || 0),
      currency: raw.currency || 'VND',
      customerInfo: {
        fullName: raw.customerInfo?.fullName || '',
        email: raw.customerInfo?.email || '',
        phone: raw.customerInfo?.phone || '',
      },
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt || new Date().toISOString(),
      items,
    });
  }
}
