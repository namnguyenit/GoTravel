\set ON_ERROR_STOP on

BEGIN;

INSERT INTO payment_requests(
  id, order_id, user_id, host_id, payment_code, amount, status, provider,
  order_kind, qr_url, bank_account, bank_name, expires_at, paid_at,
  created_at, updated_at
)
VALUES
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'GCTPAYDEMO0001', 420000, 'COMPLETED', 'MOCK', 'GOCAR_TICKET', NULL, NULL, NULL, NULL, now() - interval '1 day', now() - interval '1 day', now()),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'GCTPAYDEMO0002', 280000, 'PENDING', 'MOCK', 'GOCAR_TICKET', NULL, NULL, NULL, now() + interval '15 minutes', NULL, now(), now()),
  ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'GCTPAYDEMO0003', 400000, 'COMPLETED', 'MOCK', 'GOCAR_TICKET', NULL, NULL, NULL, NULL, now() - interval '5 days', now() - interval '5 days', now() - interval '3 days'),
  ('70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'GCTPAYDEMO0004', 350000, 'REFUNDED', 'MOCK', 'GOCAR_TICKET', NULL, NULL, NULL, NULL, now() - interval '3 days', now() - interval '3 days', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id, user_id = EXCLUDED.user_id,
  host_id = EXCLUDED.host_id, payment_code = EXCLUDED.payment_code,
  amount = EXCLUDED.amount, status = EXCLUDED.status,
  provider = EXCLUDED.provider, order_kind = EXCLUDED.order_kind,
  expires_at = EXCLUDED.expires_at, paid_at = EXCLUDED.paid_at,
  updated_at = now();

INSERT INTO payment_transactions(
  id, payment_request_id, sepay_id, gateway, transaction_date,
  sender_account, amount, content, reference_code, created_at
)
VALUES
  ('70100000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 910000001, 'MOCK', now() - interval '1 day', 'DEMO-ACCOUNT-01', 420000, 'Thanh toan ve demo GCTPAYDEMO0001', 'DEMO-TXN-0001', now() - interval '1 day'),
  ('70100000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 910000003, 'MOCK', now() - interval '5 days', 'DEMO-ACCOUNT-03', 400000, 'Thanh toan ve demo GCTPAYDEMO0003', 'DEMO-TXN-0003', now() - interval '5 days')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount, content = EXCLUDED.content,
  reference_code = EXCLUDED.reference_code,
  transaction_date = EXCLUDED.transaction_date;

INSERT INTO host_payouts(
  id, payment_request_id, order_id, host_id, provider_type,
  total_amount, commission_rate, commission_amount, host_amount,
  status, paid_at, created_at, updated_at
)
VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'TRANSPORT', 420000, 0.05, 21000, 399000, 'PENDING', NULL, now() - interval '1 day', now()),
  ('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'TRANSPORT', 400000, 0.05, 20000, 380000, 'PAID', now() - interval '2 days', now() - interval '5 days', now() - interval '2 days'),
  ('71000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'TRANSPORT', 350000, 0.05, 17500, 332500, 'CANCELLED', NULL, now() - interval '3 days', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE SET
  payment_request_id = EXCLUDED.payment_request_id,
  order_id = EXCLUDED.order_id, host_id = EXCLUDED.host_id,
  provider_type = EXCLUDED.provider_type,
  total_amount = EXCLUDED.total_amount,
  commission_rate = EXCLUDED.commission_rate,
  commission_amount = EXCLUDED.commission_amount,
  host_amount = EXCLUDED.host_amount,
  status = EXCLUDED.status, paid_at = EXCLUDED.paid_at,
  updated_at = now();

INSERT INTO transport_payout_bases(payout_id, order_id, original_amount, original_commission)
VALUES
  ('71000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 420000, 21000),
  ('71000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', 400000, 20000),
  ('71000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', 350000, 17500)
ON CONFLICT (payout_id) DO NOTHING;

INSERT INTO transport_item_accounts(
  item_id, order_id, operator_user_id, method, original_amount, balance,
  revision, reserved_by, commission_rate, commission_version, cash_shift_id
)
VALUES
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'ONLINE', 420000, 420000, 1, NULL, 0.050000, 'demo-v1', NULL),
  ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'ONLINE', 400000, 400000, 1, NULL, 0.050000, 'demo-v1', NULL),
  ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'ONLINE', 350000, 0, 2, NULL, 0.050000, 'demo-v1', NULL),
  ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'CASH', 180000, 180000, 1, NULL, 0.050000, 'demo-v1', '63000000-0000-4000-8000-000000000001')
ON CONFLICT (item_id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  operator_user_id = EXCLUDED.operator_user_id,
  method = EXCLUDED.method,
  original_amount = EXCLUDED.original_amount,
  balance = EXCLUDED.balance,
  reserved_by = NULL,
  commission_rate = EXCLUDED.commission_rate,
  commission_version = EXCLUDED.commission_version,
  cash_shift_id = EXCLUDED.cash_shift_id;

COMMIT;

