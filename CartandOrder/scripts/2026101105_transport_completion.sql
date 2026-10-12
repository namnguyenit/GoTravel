ALTER TABLE transport_notification_outbox ADD COLUMN last_requested_at timestamptz;
ALTER TABLE transport_exchange_cases DROP CONSTRAINT transport_exchange_cases_status_check;
ALTER TABLE transport_exchange_cases ADD CONSTRAINT transport_exchange_cases_status_check
 CHECK (status IN ('PROCESSING','REFUND_PENDING','COMPLETED','REPLACEMENT_CANCELLED','EXCEPTION_RESOLVED'));
ALTER TABLE transport_exchange_cases ADD COLUMN resolved_by uuid, ADD COLUMN resolution_note varchar(1000), ADD COLUMN resolved_at timestamptz;
