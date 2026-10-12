\set ON_ERROR_STOP on

BEGIN;

INSERT INTO issued_tickets(
  id, order_id, order_item_id, trip_id, seat_id, passenger_name,
  pickup_stop_id, dropoff_stop_id, token_hash, status,
  token_generation, revision, checked_in_at, checked_in_by, created_at, updated_at
)
VALUES
  ('62000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', md5('41000000-0000-4000-8000-000000000001:A01')::uuid::text, 'Nguyễn Minh Anh', '44000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', :'ticket1_hash', 'ACTIVE', 1, 1, NULL, NULL, now() - interval '1 day', now()),
  ('62000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000009', md5('41000000-0000-4000-8000-000000000001:A01')::uuid::text, 'Lê Hoàng Chi', '44000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', :'ticket3_hash', 'CHECKED_IN', 1, 1, current_date - interval '3 days' + interval '7 hours 45 minutes', '30000000-0000-4000-8000-000000000001', now() - interval '5 days', now() - interval '3 days'),
  ('62000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000004', md5('41000000-0000-4000-8000-000000000002:A02')::uuid::text, 'Phạm Gia Duy', '44000000-0000-4000-8000-000000000007', '44000000-0000-4000-8000-000000000008', :'ticket4_hash', 'VOID', 1, 1, NULL, NULL, now() - interval '3 days', now() - interval '2 days'),
  ('62000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000005', md5('41000000-0000-4000-8000-000000000003:A01')::uuid::text, 'Võ Thanh Hà', '44000000-0000-4000-8000-000000000009', '44000000-0000-4000-8000-000000000010', :'ticket5_hash', 'ACTIVE', 1, 1, NULL, NULL, now() - interval '2 hours', now())
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id, order_item_id = EXCLUDED.order_item_id,
  trip_id = EXCLUDED.trip_id, seat_id = EXCLUDED.seat_id,
  passenger_name = EXCLUDED.passenger_name,
  pickup_stop_id = EXCLUDED.pickup_stop_id,
  dropoff_stop_id = EXCLUDED.dropoff_stop_id,
  token_hash = EXCLUDED.token_hash, status = EXCLUDED.status,
  token_generation = EXCLUDED.token_generation, revision = EXCLUDED.revision,
  checked_in_at = EXCLUDED.checked_in_at, checked_in_by = EXCLUDED.checked_in_by,
  updated_at = now();

INSERT INTO transport_audit(id, actor_id, trip_id, action, detail, created_at)
VALUES
  ('65000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', 'DEMO_SEED', '{"orderId":"60000000-0000-4000-8000-000000000001"}', now()),
  ('65000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000009', 'CHECK_IN', '{"ticketId":"62000000-0000-4000-8000-000000000003","source":"GOTICKET_DEMO_SEED"}', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

COMMIT;

