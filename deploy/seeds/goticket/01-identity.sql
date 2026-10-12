\set ON_ERROR_STOP on

BEGIN;

INSERT INTO role(name) VALUES ('STAFF')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users(id, username, email, password, provider, provider_id, is_active, is_deleted, created_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'goticket_customer01', 'goticket.customer01@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('10000000-0000-4000-8000-000000000002', 'goticket_customer02', 'goticket.customer02@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('10000000-0000-4000-8000-000000000003', 'goticket_customer03', 'goticket.customer03@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('10000000-0000-4000-8000-000000000004', 'goticket_customer04', 'goticket.customer04@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('10000000-0000-4000-8000-000000000005', 'goticket_customer05', 'goticket.customer05@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('20000000-0000-4000-8000-000000000001', 'goticket_vendor01', 'goticket.vendor01@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('20000000-0000-4000-8000-000000000002', 'goticket_vendor02', 'goticket.vendor02@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('20000000-0000-4000-8000-000000000003', 'goticket_vendor03', 'goticket.vendor03@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('30000000-0000-4000-8000-000000000001', 'goticket_staff01', 'goticket.staff01@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now()),
  ('30000000-0000-4000-8000-000000000002', 'goticket_staff02', 'goticket.staff02@example.test', '$2a$12$U4k7438C/UGfGMXTH/PKru2104xyEmc8lio9ZkxT6CSh1zzToY0vS', 'LOCAL', NULL, true, false, now())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  provider = EXCLUDED.provider,
  provider_id = EXCLUDED.provider_id,
  is_active = true,
  is_deleted = false;

INSERT INTO user_profiles(user_id, full_name, phone_number, date_of_birth, avartar_url)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Nguyễn Minh Anh', '0901000001', DATE '1996-03-12', NULL),
  ('10000000-0000-4000-8000-000000000002', 'Trần Quốc Bảo', '0901000002', DATE '1993-07-22', NULL),
  ('10000000-0000-4000-8000-000000000003', 'Lê Hoàng Chi', '0901000003', DATE '1998-11-04', NULL),
  ('10000000-0000-4000-8000-000000000004', 'Phạm Gia Duy', '0901000004', DATE '1991-09-18', NULL),
  ('10000000-0000-4000-8000-000000000005', 'Võ Thanh Hà', '0901000005', DATE '1999-01-30', NULL),
  ('20000000-0000-4000-8000-000000000001', 'Nguyễn Văn Thành', '0912000001', DATE '1984-06-15', NULL),
  ('20000000-0000-4000-8000-000000000002', 'Trần Thu Hương', '0912000002', DATE '1987-02-20', NULL),
  ('20000000-0000-4000-8000-000000000003', 'Lê Quốc Nam', '0912000003', DATE '1982-10-08', NULL),
  ('30000000-0000-4000-8000-000000000001', 'Phạm Đức Long', '0923000001', DATE '1995-05-19', NULL),
  ('30000000-0000-4000-8000-000000000002', 'Hoàng Ngọc Mai', '0923000002', DATE '1997-12-09', NULL)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  date_of_birth = EXCLUDED.date_of_birth;

INSERT INTO users_roles(user_id, roles_name)
SELECT id, 'USER' FROM users WHERE username LIKE 'goticket\_%' ESCAPE '\'
ON CONFLICT DO NOTHING;

INSERT INTO users_roles(user_id, roles_name)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'TICKET_VENDOR'),
  ('20000000-0000-4000-8000-000000000002', 'TICKET_VENDOR'),
  ('20000000-0000-4000-8000-000000000003', 'TICKET_VENDOR'),
  ('30000000-0000-4000-8000-000000000001', 'STAFF'),
  ('30000000-0000-4000-8000-000000000002', 'STAFF')
ON CONFLICT DO NOTHING;

INSERT INTO ticket_vendor_profiles(
  user_id, approval_status, company_name, company_address,
  representative_name, representative_id_number, tax_code, contact_phone,
  document_front_url, document_back_url, rejection_reason, created_at, updated_at
)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'APPROVED', 'Công ty CP Sao Việt Demo', 'Hà Nội', 'Nguyễn Văn Thành', '001084000001', '0109000001', '0912000001', NULL, NULL, NULL, now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'APPROVED', 'Công ty TNHH Nam Phương Demo', 'TP. Hồ Chí Minh', 'Trần Thu Hương', '079187000002', '0319000002', '0912000002', NULL, NULL, NULL, now(), now()),
  ('20000000-0000-4000-8000-000000000003', 'APPROVED', 'Công ty Du lịch Miền Trung Demo', 'Đà Nẵng', 'Lê Quốc Nam', '048082000003', '0409000003', '0912000003', NULL, NULL, NULL, now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  approval_status = 'APPROVED',
  company_name = EXCLUDED.company_name,
  company_address = EXCLUDED.company_address,
  representative_name = EXCLUDED.representative_name,
  representative_id_number = EXCLUDED.representative_id_number,
  tax_code = EXCLUDED.tax_code,
  contact_phone = EXCLUDED.contact_phone,
  rejection_reason = NULL,
  updated_at = now();

COMMIT;

