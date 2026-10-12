\set ON_ERROR_STOP on

BEGIN;

INSERT INTO listings(
  id, host_id, transport_operator_id, transport_route_id, category, sub_category,
  title, description, province, base_price, price_unit, latitude, longitude,
  location, thumbnail_url, attributes, average_rating, total_reviews, status,
  created_at, updated_at
)
VALUES
  ('46000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'TRANSPORT', 'NONE', 'Hà Nội – Đà Nẵng', 'Tuyến xe demo Sao Việt Express.', 'Hà Nội', 420000, 'PER_SEAT', 21.0285, 105.8542, ST_SetSRID(ST_MakePoint(105.8542,21.0285),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000001","routeId":"42000000-0000-4000-8000-000000000001","origin":"Hà Nội","destination":"Đà Nẵng"}', 4.8, 42, 'ACTIVE', now(), now()),
  ('46000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002', 'TRANSPORT', 'NONE', 'Hà Nội – Sa Pa', 'Tuyến xe demo Sao Việt Express.', 'Hà Nội', 280000, 'PER_SEAT', 21.0285, 105.8542, ST_SetSRID(ST_MakePoint(105.8542,21.0285),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000001","routeId":"42000000-0000-4000-8000-000000000002","origin":"Hà Nội","destination":"Sa Pa"}', 4.7, 31, 'ACTIVE', now(), now()),
  ('46000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000003', 'TRANSPORT', 'NONE', 'Hồ Chí Minh – Đà Lạt', 'Tuyến xe demo Nam Phương Limousine.', 'Hồ Chí Minh', 320000, 'PER_SEAT', 10.7769, 106.7009, ST_SetSRID(ST_MakePoint(106.7009,10.7769),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000002","routeId":"42000000-0000-4000-8000-000000000003","origin":"Hồ Chí Minh","destination":"Đà Lạt"}', 4.9, 58, 'ACTIVE', now(), now()),
  ('46000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000004', 'TRANSPORT', 'NONE', 'Hồ Chí Minh – Nha Trang', 'Tuyến xe demo Nam Phương Limousine.', 'Hồ Chí Minh', 350000, 'PER_SEAT', 10.7769, 106.7009, ST_SetSRID(ST_MakePoint(106.7009,10.7769),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000002","routeId":"42000000-0000-4000-8000-000000000004","origin":"Hồ Chí Minh","destination":"Nha Trang"}', 4.6, 24, 'ACTIVE', now(), now()),
  ('46000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000005', 'TRANSPORT', 'NONE', 'Đà Nẵng – Huế', 'Tuyến xe demo Miền Trung Travel.', 'Đà Nẵng', 180000, 'PER_SEAT', 16.0544, 108.2022, ST_SetSRID(ST_MakePoint(108.2022,16.0544),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000003","routeId":"42000000-0000-4000-8000-000000000005","origin":"Đà Nẵng","destination":"Huế"}', 4.5, 19, 'ACTIVE', now(), now()),
  ('46000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000006', 'TRANSPORT', 'NONE', 'Hà Nội – Hải Phòng', 'Tuyến xe demo Miền Trung Travel.', 'Hà Nội', 200000, 'PER_SEAT', 21.0285, 105.8542, ST_SetSRID(ST_MakePoint(105.8542,21.0285),4326), NULL, '{"categoryType":"TRANSPORT","galleryUrls":[],"operatorId":"40000000-0000-4000-8000-000000000003","routeId":"42000000-0000-4000-8000-000000000006","origin":"Hà Nội","destination":"Hải Phòng"}', 4.4, 15, 'ACTIVE', now(), now())
ON CONFLICT (id) DO UPDATE SET
  host_id = EXCLUDED.host_id,
  transport_operator_id = EXCLUDED.transport_operator_id,
  transport_route_id = EXCLUDED.transport_route_id,
  category = EXCLUDED.category,
  sub_category = EXCLUDED.sub_category,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  province = EXCLUDED.province,
  base_price = EXCLUDED.base_price,
  price_unit = EXCLUDED.price_unit,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location = EXCLUDED.location,
  attributes = EXCLUDED.attributes,
  average_rating = EXCLUDED.average_rating,
  total_reviews = EXCLUDED.total_reviews,
  status = 'ACTIVE',
  updated_at = now();

COMMIT;

