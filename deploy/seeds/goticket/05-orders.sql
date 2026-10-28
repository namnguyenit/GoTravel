\set ON_ERROR_STOP on

BEGIN;

INSERT INTO transport_cash_shifts(
  id, actor_id, operator_id, commission_rate, commission_version, opened_at,
  closed_at, gross_amount, cash_refund_amount, expected_amount, counted_amount,
  variance, commission_due, settlement_sent_at
)
VALUES
  ('63000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 0.050000, 'demo-v1', now() - interval '2 hours', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  actor_id = EXCLUDED.actor_id,
  operator_id = EXCLUDED.operator_id,
  commission_rate = EXCLUDED.commission_rate,
  commission_version = EXCLUDED.commission_version;

INSERT INTO orders(
  id, user_id, host_id, order_kind, payment_method, transport_trip_id,
  transport_hold_id, transport_idempotency_key, transport_request_hash,
  transport_cashier_id, transport_cash_shift_id, transport_departure_at,
  transport_policy_version, transport_full_refund_hours,
  transport_partial_refund_hours, transport_partial_fee_rate,
  transport_cancellation_fee, transport_refund_due,
  transport_cancellation_reason, order_number, status, total_amount, currency,
  customer_info, expires_at, ticket_email_sent, ticket_email_sent_at,
  ticket_email_recipient, ticket_email_attempts, created_at, updated_at
)
VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'GOCAR_TICKET', 'ONLINE', '45000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'demo-confirmed-online', repeat('1',64), NULL, NULL, current_date + interval '1 day 8 hours', 'demo-v1', 24, 6, 0.300000, 0, 0, NULL, 'GCT-DEMO-0001', 'CONFIRMED', 420000, 'VND', '{"fullName":"Nguyễn Minh Anh","email":"goticket.customer01@example.test","phone":"0901000001"}', NULL, true, now() - interval '1 day', 'goticket.customer01@example.test', 1, now() - interval '1 day', now()),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'GOCAR_TICKET', 'ONLINE', '45000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'demo-payment-pending', repeat('2',64), NULL, NULL, current_date + interval '2 days 7 hours', 'demo-v1', 24, 6, 0.300000, 0, 0, NULL, 'GCT-DEMO-0002', 'PAYMENT_PENDING', 280000, 'VND', '{"fullName":"Trần Quốc Bảo","email":"goticket.customer02@example.test","phone":"0901000002"}', now() + interval '15 minutes', false, NULL, 'goticket.customer02@example.test', 0, now(), now()),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'GOCAR_TICKET', 'ONLINE', '45000000-0000-4000-8000-000000000009', '51000000-0000-4000-8000-000000000003', 'demo-completed-online', repeat('3',64), NULL, NULL, current_date - interval '3 days' + interval '8 hours', 'demo-v1', 24, 6, 0.300000, 0, 0, NULL, 'GCT-DEMO-0003', 'COMPLETED', 400000, 'VND', '{"fullName":"Lê Hoàng Chi","email":"goticket.customer03@example.test","phone":"0901000003"}', NULL, true, now() - interval '4 days', 'goticket.customer03@example.test', 1, now() - interval '5 days', now() - interval '3 days'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'GOCAR_TICKET', 'ONLINE', '45000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000004', 'demo-refunded-online', repeat('4',64), NULL, NULL, current_date + interval '2 days 8 hours', 'demo-v1', 24, 6, 0.300000, 0, 350000, 'Khách đổi kế hoạch', 'GCT-DEMO-0004', 'REFUNDED', 350000, 'VND', '{"fullName":"Phạm Gia Duy","email":"goticket.customer04@example.test","phone":"0901000004"}', NULL, true, now() - interval '2 days', 'goticket.customer04@example.test', 1, now() - interval '3 days', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'GOCAR_TICKET', 'CASH', '45000000-0000-4000-8000-000000000005', '51000000-0000-4000-8000-000000000005', 'demo-confirmed-cash', repeat('5',64), '20000000-0000-4000-8000-000000000003', '63000000-0000-4000-8000-000000000001', current_date + interval '1 day 9 hours', 'demo-v1', 24, 6, 0.300000, 0, 0, NULL, 'GCT-DEMO-0005', 'CONFIRMED', 180000, 'VND', '{"fullName":"Võ Thanh Hà","email":"goticket.customer05@example.test","phone":"0901000005"}', NULL, true, now() - interval '1 hour', 'goticket.customer05@example.test', 1, now() - interval '2 hours', now())
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id, host_id = EXCLUDED.host_id,
  order_kind = EXCLUDED.order_kind, payment_method = EXCLUDED.payment_method,
  transport_trip_id = EXCLUDED.transport_trip_id, transport_hold_id = EXCLUDED.transport_hold_id,
  transport_cashier_id = EXCLUDED.transport_cashier_id,
  transport_cash_shift_id = EXCLUDED.transport_cash_shift_id,
  transport_departure_at = EXCLUDED.transport_departure_at,
  transport_policy_version = EXCLUDED.transport_policy_version,
  transport_full_refund_hours = EXCLUDED.transport_full_refund_hours,
  transport_partial_refund_hours = EXCLUDED.transport_partial_refund_hours,
  transport_partial_fee_rate = EXCLUDED.transport_partial_fee_rate,
  transport_cancellation_fee = EXCLUDED.transport_cancellation_fee,
  transport_refund_due = EXCLUDED.transport_refund_due,
  transport_cancellation_reason = EXCLUDED.transport_cancellation_reason,
  status = EXCLUDED.status, total_amount = EXCLUDED.total_amount,
  customer_info = EXCLUDED.customer_info, expires_at = EXCLUDED.expires_at,
  ticket_email_sent = EXCLUDED.ticket_email_sent,
  ticket_email_sent_at = EXCLUDED.ticket_email_sent_at,
  ticket_email_recipient = EXCLUDED.ticket_email_recipient,
  ticket_email_attempts = EXCLUDED.ticket_email_attempts,
  updated_at = now();

INSERT INTO order_items(
  id, order_id, listing_id, host_id, listing_title, thumbnail_url,
  start_date, end_date, time_slot, quantity, unit_price, total_price,
  transport_trip_id, transport_seat_id, transport_seat_code, passenger_name,
  pickup_stop_id, dropoff_stop_id, transport_ticket_id,
  transport_check_in_token, transport_boarding_status,
  transport_ticket_revision, transport_item_state,
  transport_original_amount, transport_departure_at, transport_refund_total
)
VALUES
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Hà Nội – Đà Nẵng', NULL, current_date + 1, current_date + 1, '08:00', 1, 420000, 420000, '45000000-0000-4000-8000-000000000001', md5('41000000-0000-4000-8000-000000000001:A01')::uuid, 'A01', 'Nguyễn Minh Anh', '44000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000001', :'ticket1_token', NULL, 1, 'ACTIVE', 420000, current_date + interval '1 day 8 hours', 0),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '46000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Hà Nội – Sa Pa', NULL, current_date + 2, current_date + 2, '07:00', 1, 280000, 280000, '45000000-0000-4000-8000-000000000002', md5('41000000-0000-4000-8000-000000000001:A01')::uuid, 'A01', 'Trần Quốc Bảo', '44000000-0000-4000-8000-000000000003', '44000000-0000-4000-8000-000000000004', NULL, NULL, NULL, 1, 'ACTIVE', 280000, current_date + interval '2 days 7 hours', 0),
  ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '46000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Hà Nội – Đà Nẵng', NULL, current_date - 3, current_date - 3, '08:00', 1, 400000, 400000, '45000000-0000-4000-8000-000000000009', md5('41000000-0000-4000-8000-000000000001:A01')::uuid, 'A01', 'Lê Hoàng Chi', '44000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000003', :'ticket3_token', 'CHECKED_IN', 1, 'COMPLETED', 400000, current_date - interval '3 days' + interval '8 hours', 0),
  ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '46000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Hồ Chí Minh – Nha Trang', NULL, current_date + 2, current_date + 2, '08:00', 1, 350000, 350000, '45000000-0000-4000-8000-000000000004', md5('41000000-0000-4000-8000-000000000002:A02')::uuid, 'A02', 'Phạm Gia Duy', '44000000-0000-4000-8000-000000000007', '44000000-0000-4000-8000-000000000008', '62000000-0000-4000-8000-000000000004', :'ticket4_token', NULL, 1, 'REFUNDED', 350000, current_date + interval '2 days 8 hours', 350000),
  ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005', '46000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'Đà Nẵng – Huế', NULL, current_date + 1, current_date + 1, '09:00', 1, 180000, 180000, '45000000-0000-4000-8000-000000000005', md5('41000000-0000-4000-8000-000000000003:A01')::uuid, 'A01', 'Võ Thanh Hà', '44000000-0000-4000-8000-000000000009', '44000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000005', :'ticket5_token', NULL, 1, 'ACTIVE', 180000, current_date + interval '1 day 9 hours', 0)
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id, listing_id = EXCLUDED.listing_id,
  host_id = EXCLUDED.host_id, listing_title = EXCLUDED.listing_title,
  start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
  time_slot = EXCLUDED.time_slot, quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price, total_price = EXCLUDED.total_price,
  transport_trip_id = EXCLUDED.transport_trip_id,
  transport_seat_id = EXCLUDED.transport_seat_id,
  transport_seat_code = EXCLUDED.transport_seat_code,
  passenger_name = EXCLUDED.passenger_name,
  pickup_stop_id = EXCLUDED.pickup_stop_id,
  dropoff_stop_id = EXCLUDED.dropoff_stop_id,
  transport_ticket_id = EXCLUDED.transport_ticket_id,
  transport_check_in_token = EXCLUDED.transport_check_in_token,
  transport_boarding_status = EXCLUDED.transport_boarding_status,
  transport_ticket_revision = EXCLUDED.transport_ticket_revision,
  transport_item_state = EXCLUDED.transport_item_state,
  transport_original_amount = EXCLUDED.transport_original_amount,
  transport_departure_at = EXCLUDED.transport_departure_at,
  transport_refund_total = EXCLUDED.transport_refund_total;

INSERT INTO transport_cash_receipts(
  id, receipt_no, order_id, shift_id, actor_id, operator_id, amount, currency, received_at
)
VALUES (
  '63100000-0000-4000-8000-000000000001', 'GCT-CASH-DEMO-0001',
  '60000000-0000-4000-8000-000000000005', '63000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003',
  180000, 'VND', now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_disputes(
  id, order_id, user_id, reason, description, status,
  admin_note, resolved_by, resolved_at, created_at, updated_at
)
VALUES
  ('64000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Điểm đón chưa rõ', 'Khách cần xác nhận lại vị trí đón tại bến.', 'OPEN', NULL, NULL, NULL, now() - interval '4 hours', now() - interval '4 hours'),
  ('64000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Kiểm tra vé điện tử', 'Khách từng không thấy email vé.', 'RESOLVED', 'Đã gửi lại vé và xác nhận với khách.', '00000000-0000-0000-0000-000000000001', now() - interval '3 days', now() - interval '4 days', now() - interval '3 days')
ON CONFLICT (id) DO UPDATE SET
  reason = EXCLUDED.reason, description = EXCLUDED.description,
  status = EXCLUDED.status, admin_note = EXCLUDED.admin_note,
  resolved_by = EXCLUDED.resolved_by, resolved_at = EXCLUDED.resolved_at,
  updated_at = EXCLUDED.updated_at;

COMMIT;

