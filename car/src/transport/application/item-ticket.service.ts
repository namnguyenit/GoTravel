import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  ItemOperationPlan,
  ItemTicketRepository,
} from '../domain/item-operation';
import type { TransportIntegrations } from './transport-integrations.port';
@Injectable()
export class ItemTicketService {
  constructor(
    @Inject('ItemTicketRepository')
    private readonly repository: ItemTicketRepository,
    @Inject('TransportIntegrations')
    private readonly integrations: TransportIntegrations,
  ) {}
  async apply(operationId: string, action: 'prepare' | 'commit' | 'abort') {
    const trusted = await this.integrations.itemOperation(operationId);
    if (!trusted || trusted.plan.operationId !== operationId)
      throw new ConflictException('Cart chưa xác nhận operation');
    if (
      action === 'prepare' &&
      !['PREPARED', 'HELD', 'WAITING_FUNDS'].includes(trusted.state)
    )
      throw new ConflictException('Operation không còn prepare');
    if (action === 'commit') {
      if (
        ![
          'COMMITTING',
          'TICKET_COMMITTED',
          'SETTLING',
          'REFUND_PENDING',
          'COMPLETED',
        ].includes(trusted.state)
      )
        throw new ConflictException('Cart chưa commit operation');
      const inventory = await this.integrations.itemInventory(operationId);
      if (
        inventory.operationId !== operationId ||
        !['COMMITTED', 'COMPLETED'].includes(inventory.state)
      )
        throw new ConflictException('Inventory chưa bảo đảm ghế');
    }
    if (
      action === 'abort' &&
      !['ABORTING', 'ABORT_REFUND_PENDING', 'ABORTED'].includes(trusted.state)
    )
      throw new ConflictException('Cart chưa yêu cầu abort');
    return this.repository.apply(
      trusted.plan as unknown as ItemOperationPlan,
      action,
    );
  }
}
