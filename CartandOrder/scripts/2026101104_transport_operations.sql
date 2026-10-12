ALTER TABLE orders ADD COLUMN transport_quote_id uuid,
 ADD COLUMN transport_quote_version varchar(64), ADD COLUMN transport_quote_hash varchar(64);
ALTER TABLE order_items ADD COLUMN transport_boarding_status varchar(16)
 CHECK (transport_boarding_status IN ('CHECKED_IN','NO_SHOW'));
CREATE TABLE transport_notification_outbox (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id),
 kind varchar(16) NOT NULL CHECK (kind IN ('TICKET','CANCELLED','REFUNDED','EXCHANGE')),
 status varchar(16) NOT NULL DEFAULT 'PENDING'
 CHECK (status IN ('PENDING','SENDING','DELIVERED','FAILED','SKIPPED')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, last_error varchar(160), delivered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (order_id,kind)
);
CREATE INDEX transport_notification_due_idx ON transport_notification_outbox(status,next_attempt_at);

ALTER TABLE transport_exchange_cases ADD COLUMN old_amount numeric(18,0),
 ADD COLUMN new_amount numeric(18,0), ADD COLUMN difference numeric(18,0),
 ADD COLUMN payment_method varchar(16);
UPDATE transport_exchange_cases e SET old_amount=o.total_amount,new_amount=n.total_amount,
 difference=n.total_amount-o.total_amount,payment_method=o.payment_method
 FROM orders o,orders n WHERE e.old_order_id=o.id AND e.new_order_id=n.id;
ALTER TABLE transport_exchange_cases ALTER COLUMN old_amount SET NOT NULL,
 ALTER COLUMN new_amount SET NOT NULL, ALTER COLUMN difference SET NOT NULL,
 ALTER COLUMN payment_method SET NOT NULL,
 ADD CONSTRAINT transport_exchange_difference CHECK (difference=new_amount-old_amount),
 ADD CONSTRAINT transport_exchange_method CHECK (payment_method IN ('ONLINE','CASH'));
