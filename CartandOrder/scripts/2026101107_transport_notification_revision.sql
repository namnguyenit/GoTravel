-- Apply after 2026101106. Legacy events retain their identity.
ALTER TABLE transport_notification_outbox ADD COLUMN lease_version bigint NOT NULL DEFAULT 0;
ALTER TABLE transport_notification_outbox ADD COLUMN event_key varchar(180) NOT NULL DEFAULT 'legacy';
ALTER TABLE transport_notification_outbox DROP CONSTRAINT transport_notification_outbox_order_id_kind_key;
ALTER TABLE transport_notification_outbox DROP CONSTRAINT transport_notification_outbox_kind_check;
ALTER TABLE transport_notification_outbox ADD CONSTRAINT transport_notification_kind_check
 CHECK (kind IN ('TICKET','CANCELLED','REFUNDED','EXCHANGE','AMENDMENT'));
ALTER TABLE transport_notification_outbox ADD CONSTRAINT transport_notification_event_unique UNIQUE(order_id,kind,event_key);
