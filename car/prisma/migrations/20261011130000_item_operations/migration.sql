ALTER TABLE issued_tickets ADD COLUMN token_generation integer NOT NULL DEFAULT 1;
CREATE TABLE transport_item_operations (
 id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES issued_tickets(id), request_hash text NOT NULL, status text NOT NULL,
 plan jsonb NOT NULL, previous_ticket jsonb, result jsonb, created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamp(3) NOT NULL
);
CREATE INDEX transport_item_operations_ticket_status_idx ON transport_item_operations(ticket_id,status);
CREATE UNIQUE INDEX transport_ticket_one_prepared_operation ON transport_item_operations(ticket_id) WHERE status='PREPARED';

-- Recompute the price floor from the published seat snapshot where available.
UPDATE trips t SET search_price_vnd=COALESCE(
 (SELECT min(COALESCE(((t.sale_snapshot->'classPrices')->>(s->>'seatClass'))::numeric,t.price_vnd,t.price_per_seat::numeric)) FROM jsonb_array_elements(t.sale_snapshot->'seats') s),
 (SELECT min(COALESCE((t.class_prices->>s.seat_class)::numeric,t.price_vnd,t.price_per_seat::numeric)) FROM seat_templates s WHERE s.car_id=t.car_id AND s.active),
 t.price_vnd,t.price_per_seat::numeric);
