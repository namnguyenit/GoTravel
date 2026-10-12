\set ON_ERROR_STOP on

BEGIN;

INSERT INTO operators(id, user_id, name, status, display_name, contact_phone, contact_address, description, created_at, updated_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Công ty CP Sao Việt Demo', 'ACTIVE', 'Sao Việt Express', '0912000001', 'Hà Nội', 'Nhà xe demo tuyến miền Bắc và miền Trung.', now(), now()),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Công ty TNHH Nam Phương Demo', 'ACTIVE', 'Nam Phương Limousine', '0912000002', 'TP. Hồ Chí Minh', 'Nhà xe demo các tuyến từ TP. Hồ Chí Minh.', now(), now()),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Công ty Du lịch Miền Trung Demo', 'ACTIVE', 'Miền Trung Travel', '0912000003', 'Đà Nẵng', 'Nhà xe demo các tuyến ngắn miền Trung.', now(), now())
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id, name = EXCLUDED.name, status = EXCLUDED.status,
  display_name = EXCLUDED.display_name, contact_phone = EXCLUDED.contact_phone,
  contact_address = EXCLUDED.contact_address, description = EXCLUDED.description,
  updated_at = now();

INSERT INTO operator_applications(id, user_id, name, phone, address, status, reject_reason, created_at, updated_at)
VALUES
  ('40100000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Công ty CP Sao Việt Demo', '0912000001', 'Hà Nội', 'APPROVED', NULL, now() - interval '30 days', now() - interval '29 days'),
  ('40100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Nhà xe Khởi Nghiệp Demo', '0901000003', 'Ninh Bình', 'PENDING', NULL, now() - interval '2 days', now() - interval '2 days'),
  ('40100000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'Nhà xe Hồ Tây Demo', '0901000004', 'Hà Nội', 'REJECTED', 'Thiếu giấy phép kinh doanh vận tải.', now() - interval '8 days', now() - interval '7 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address,
  status = EXCLUDED.status, reject_reason = EXCLUDED.reject_reason, updated_at = EXCLUDED.updated_at;

INSERT INTO cars(id, operator_id, name, type, status, license_plate, total_seats, created_at, updated_at)
VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Sao Việt 01', 'SLEEPER', 'ACTIVE', '29B-900.01', 12, now(), now()),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Nam Phương VIP 01', 'LIMOUSINE', 'ACTIVE', '51B-800.02', 12, now(), now()),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'Miền Trung 01', 'SEAT', 'ACTIVE', '43B-700.03', 12, now(), now())
ON CONFLICT (id) DO UPDATE SET
  operator_id = EXCLUDED.operator_id, name = EXCLUDED.name, type = EXCLUDED.type,
  status = EXCLUDED.status, license_plate = EXCLUDED.license_plate,
  total_seats = EXCLUDED.total_seats, updated_at = now();

WITH cars_seed(id) AS (
  VALUES
    ('41000000-0000-4000-8000-000000000001'::text),
    ('41000000-0000-4000-8000-000000000002'::text),
    ('41000000-0000-4000-8000-000000000003'::text)
), seats(code, row_no, column_no, seat_class) AS (
  VALUES
    ('A01',0,0,'STANDARD'), ('A02',0,1,'STANDARD'), ('A03',0,2,'STANDARD'), ('A04',0,3,'STANDARD'),
    ('B01',1,0,'STANDARD'), ('B02',1,1,'STANDARD'), ('B03',1,2,'STANDARD'), ('B04',1,3,'STANDARD'),
    ('C01',2,0,'VIP'),      ('C02',2,1,'VIP'),      ('C03',2,2,'VIP'),      ('C04',2,3,'VIP')
)
INSERT INTO seat_templates(id, car_id, code, level, seat_class, row, "column", active, created_at)
SELECT md5(c.id || ':' || s.code)::uuid::text, c.id, s.code, 1, s.seat_class, s.row_no, s.column_no, true, now()
FROM cars_seed c CROSS JOIN seats s
ON CONFLICT (car_id, code) DO UPDATE SET
  level = EXCLUDED.level, seat_class = EXCLUDED.seat_class,
  row = EXCLUDED.row, "column" = EXCLUDED."column", active = true;

INSERT INTO operator_stops(id, operator_id, name, address, province, active, created_at, updated_at)
VALUES
  ('43000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Bến xe Nước Ngầm', 'Số 1 Ngọc Hồi, Hoàng Mai', 'Hà Nội', true, now(), now()),
  ('43000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Bến xe Trung tâm Đà Nẵng', 'Tôn Đức Thắng, Liên Chiểu', 'Đà Nẵng', true, now(), now()),
  ('43000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'Bến xe Mỹ Đình', 'Phạm Hùng, Nam Từ Liêm', 'Hà Nội', true, now(), now()),
  ('43000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'Bến xe Sa Pa', 'Điện Biên Phủ, Sa Pa', 'Lào Cai', true, now(), now()),
  ('43000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000002', 'Bến xe Miền Đông mới', 'TP. Thủ Đức', 'Hồ Chí Minh', true, now(), now()),
  ('43000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000002', 'Bến xe Đà Lạt', 'Phường 3, Đà Lạt', 'Lâm Đồng', true, now(), now()),
  ('43000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000002', 'Bến xe Miền Tây', 'Kinh Dương Vương, Bình Tân', 'Hồ Chí Minh', true, now(), now()),
  ('43000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000002', 'Bến xe phía Nam Nha Trang', 'Vĩnh Trung, Nha Trang', 'Khánh Hòa', true, now(), now()),
  ('43000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000003', 'Bến xe Trung tâm Đà Nẵng', 'Tôn Đức Thắng, Liên Chiểu', 'Đà Nẵng', true, now(), now()),
  ('43000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000003', 'Bến xe phía Nam Huế', 'An Đông, Huế', 'Thừa Thiên Huế', true, now(), now()),
  ('43000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000003', 'Bến xe Gia Lâm', 'Ngô Gia Khảm, Long Biên', 'Hà Nội', true, now(), now()),
  ('43000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000003', 'Bến xe Vĩnh Niệm', 'Vĩnh Niệm, Lê Chân', 'Hải Phòng', true, now(), now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, address = EXCLUDED.address, province = EXCLUDED.province,
  active = true, updated_at = now();

INSERT INTO routes(id, operator_id, origin, destination, status, created_at, updated_at)
VALUES
  ('42000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Hà Nội', 'Đà Nẵng', 'ACTIVE', now(), now()),
  ('42000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Hà Nội', 'Sa Pa', 'ACTIVE', now(), now()),
  ('42000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'Hồ Chí Minh', 'Đà Lạt', 'ACTIVE', now(), now()),
  ('42000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'Hồ Chí Minh', 'Nha Trang', 'ACTIVE', now(), now()),
  ('42000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', 'Đà Nẵng', 'Huế', 'ACTIVE', now(), now()),
  ('42000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', 'Hà Nội', 'Hải Phòng', 'ACTIVE', now(), now())
ON CONFLICT (id) DO UPDATE SET
  operator_id = EXCLUDED.operator_id, origin = EXCLUDED.origin,
  destination = EXCLUDED.destination, status = EXCLUDED.status, updated_at = now();

INSERT INTO route_stops(id, route_id, operator_stop_id, name, address, province, "order", created_at, updated_at)
VALUES
  ('44000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 'Bến xe Nước Ngầm', 'Hoàng Mai', 'Hà Nội', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002', 'Bến xe Trung tâm Đà Nẵng', 'Liên Chiểu', 'Đà Nẵng', 1, now(), now()),
  ('44000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000003', 'Bến xe Mỹ Đình', 'Nam Từ Liêm', 'Hà Nội', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000004', '42000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000004', 'Bến xe Sa Pa', 'Sa Pa', 'Lào Cai', 1, now(), now()),
  ('44000000-0000-4000-8000-000000000005', '42000000-0000-4000-8000-000000000003', '43000000-0000-4000-8000-000000000005', 'Bến xe Miền Đông mới', 'TP. Thủ Đức', 'Hồ Chí Minh', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000006', '42000000-0000-4000-8000-000000000003', '43000000-0000-4000-8000-000000000006', 'Bến xe Đà Lạt', 'Đà Lạt', 'Lâm Đồng', 1, now(), now()),
  ('44000000-0000-4000-8000-000000000007', '42000000-0000-4000-8000-000000000004', '43000000-0000-4000-8000-000000000007', 'Bến xe Miền Tây', 'Bình Tân', 'Hồ Chí Minh', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000008', '42000000-0000-4000-8000-000000000004', '43000000-0000-4000-8000-000000000008', 'Bến xe phía Nam Nha Trang', 'Nha Trang', 'Khánh Hòa', 1, now(), now()),
  ('44000000-0000-4000-8000-000000000009', '42000000-0000-4000-8000-000000000005', '43000000-0000-4000-8000-000000000009', 'Bến xe Trung tâm Đà Nẵng', 'Liên Chiểu', 'Đà Nẵng', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000010', '42000000-0000-4000-8000-000000000005', '43000000-0000-4000-8000-000000000010', 'Bến xe phía Nam Huế', 'Huế', 'Thừa Thiên Huế', 1, now(), now()),
  ('44000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000006', '43000000-0000-4000-8000-000000000011', 'Bến xe Gia Lâm', 'Long Biên', 'Hà Nội', 0, now(), now()),
  ('44000000-0000-4000-8000-000000000012', '42000000-0000-4000-8000-000000000006', '43000000-0000-4000-8000-000000000012', 'Bến xe Vĩnh Niệm', 'Lê Chân', 'Hải Phòng', 1, now(), now())
ON CONFLICT (id) DO UPDATE SET
  operator_stop_id = EXCLUDED.operator_stop_id, name = EXCLUDED.name,
  address = EXCLUDED.address, province = EXCLUDED.province,
  "order" = EXCLUDED."order", updated_at = now();

INSERT INTO trips(
  id, operator_id, route_id, car_id, departure_time, arrival_time,
  price_per_seat, price_vnd, search_price_vnd, offer_listing_id, status,
  sale_snapshot, class_prices, publish_attempts, inventory_sync_version,
  inventory_synced_version, created_at, updated_at, completion_synced_at
)
VALUES
  ('45000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', current_date + interval '1 day 8 hours', current_date + interval '1 day 20 hours', 420000, 420000, 420000, '46000000-0000-4000-8000-000000000001', 'ON_SALE', NULL, '{"STANDARD":420000,"VIP":520000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001', current_date + interval '2 days 7 hours', current_date + interval '2 days 14 hours', 280000, 280000, 280000, '46000000-0000-4000-8000-000000000002', 'ON_SALE', NULL, '{"STANDARD":280000,"VIP":360000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000002', current_date + interval '1 day 7 hours', current_date + interval '1 day 15 hours', 320000, 320000, 320000, '46000000-0000-4000-8000-000000000003', 'ON_SALE', NULL, '{"STANDARD":320000,"VIP":410000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000004', '41000000-0000-4000-8000-000000000002', current_date + interval '2 days 8 hours', current_date + interval '2 days 16 hours', 350000, 350000, 350000, '46000000-0000-4000-8000-000000000004', 'ON_SALE', NULL, '{"STANDARD":350000,"VIP":450000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000005', '41000000-0000-4000-8000-000000000003', current_date + interval '1 day 9 hours', current_date + interval '1 day 12 hours', 180000, 180000, 180000, '46000000-0000-4000-8000-000000000005', 'ON_SALE', NULL, '{"STANDARD":180000,"VIP":230000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000006', '41000000-0000-4000-8000-000000000003', current_date + interval '2 days 8 hours', current_date + interval '2 days 12 hours', 200000, 200000, 200000, '46000000-0000-4000-8000-000000000006', 'ON_SALE', NULL, '{"STANDARD":200000,"VIP":250000}', 1, 1, 1, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', current_date + interval '3 days 8 hours', current_date + interval '3 days 20 hours', 430000, 430000, 430000, NULL, 'DRAFT', NULL, '{"STANDARD":430000,"VIP":530000}', 0, 0, 0, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001', current_date + interval '4 days 7 hours', current_date + interval '4 days 14 hours', 290000, 290000, 290000, '46000000-0000-4000-8000-000000000002', 'STOP_SALE', NULL, '{"STANDARD":290000,"VIP":370000}', 1, 2, 2, now(), now(), NULL),
  ('45000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', current_date - interval '3 days' + interval '8 hours', current_date - interval '3 days' + interval '20 hours', 400000, 400000, 400000, '46000000-0000-4000-8000-000000000001', 'COMPLETED', NULL, '{"STANDARD":400000,"VIP":500000}', 1, 2, 2, now() - interval '10 days', now(), now()),
  ('45000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000003', '41000000-0000-4000-8000-000000000002', current_date - interval '1 day' + interval '20 hours', current_date + interval '5 hours', 310000, 310000, 310000, '46000000-0000-4000-8000-000000000003', 'DEPARTED', NULL, '{"STANDARD":310000,"VIP":400000}', 1, 2, 2, now() - interval '5 days', now(), NULL)
ON CONFLICT (id) DO UPDATE SET
  operator_id = EXCLUDED.operator_id, route_id = EXCLUDED.route_id, car_id = EXCLUDED.car_id,
  departure_time = EXCLUDED.departure_time, arrival_time = EXCLUDED.arrival_time,
  price_per_seat = EXCLUDED.price_per_seat, price_vnd = EXCLUDED.price_vnd,
  search_price_vnd = EXCLUDED.search_price_vnd, offer_listing_id = EXCLUDED.offer_listing_id,
  status = EXCLUDED.status, sale_snapshot = EXCLUDED.sale_snapshot,
  class_prices = EXCLUDED.class_prices, inventory_sync_version = EXCLUDED.inventory_sync_version,
  inventory_synced_version = EXCLUDED.inventory_synced_version, updated_at = now(),
  completion_synced_at = EXCLUDED.completion_synced_at;

INSERT INTO operator_staff(
  id, operator_id, user_id, can_sell_cash, can_check_in, can_manage_trip,
  can_close_shift, trip_ids, active, assigned_by, created_at, updated_at
)
VALUES
  ('47000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', true, true, true, true, ARRAY[]::text[], true, '20000000-0000-4000-8000-000000000001', now(), now()),
  ('47000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', false, true, true, false, ARRAY['45000000-0000-4000-8000-000000000003','45000000-0000-4000-8000-000000000004']::text[], true, '20000000-0000-4000-8000-000000000002', now(), now())
ON CONFLICT (operator_id, user_id) DO UPDATE SET
  can_sell_cash = EXCLUDED.can_sell_cash, can_check_in = EXCLUDED.can_check_in,
  can_manage_trip = EXCLUDED.can_manage_trip, can_close_shift = EXCLUDED.can_close_shift,
  trip_ids = EXCLUDED.trip_ids, active = true, assigned_by = EXCLUDED.assigned_by,
  updated_at = now();

COMMIT;

