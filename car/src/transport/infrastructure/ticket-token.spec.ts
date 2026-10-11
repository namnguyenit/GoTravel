import { ticketToken, ticketTokenHash, verifyTicketToken } from './ticket-token';

describe('ticket token', () => {
  const ticketId = '123e4567-e89b-42d3-a456-426614174000';
  const orderItemId = '123e4567-e89b-42d3-a456-426614174001';
  const prior = process.env.TICKET_SIGNING_KEY;

  beforeAll(() => { process.env.TICKET_SIGNING_KEY = 'test-key-with-at-least-thirty-two-bytes'; });
  afterAll(() => {
    if (prior === undefined) delete process.env.TICKET_SIGNING_KEY;
    else process.env.TICKET_SIGNING_KEY = prior;
  });

  it('is deterministic and rejects tampering', () => {
    const token = ticketToken(ticketId, orderItemId);
    expect(verifyTicketToken(token)).toEqual({ ticketId, orderItemId });
    expect(ticketTokenHash(token)).toHaveLength(64);
    expect(() => verifyTicketToken('2' + token.slice(1))).toThrow();
  });
});
