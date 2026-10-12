ALTER TABLE order_items ADD COLUMN transport_item_state varchar(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE order_items ADD COLUMN transport_original_amount numeric(18,0);
ALTER TABLE order_items ADD COLUMN transport_departure_at timestamp;
ALTER TABLE order_items ADD COLUMN transport_refund_total numeric(18,0) NOT NULL DEFAULT 0;
UPDATE order_items i SET transport_original_amount=i.total_price, transport_departure_at=o.transport_departure_at FROM orders o WHERE i.order_id=o.id AND o.order_kind='GOCAR_TICKET';
UPDATE order_items i SET transport_item_state=CASE WHEN o.status='REFUNDED' THEN 'REFUNDED' WHEN o.status IN ('CANCELLED','REFUND_PENDING','CANCELLATION_PENDING') THEN 'VOID' ELSE 'ACTIVE' END FROM orders o WHERE i.order_id=o.id AND o.order_kind='GOCAR_TICKET';
CREATE TABLE transport_item_operations (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), item_id uuid NOT NULL REFERENCES order_items(id),
 kind varchar(16) NOT NULL CHECK(kind IN ('CANCEL','EXCHANGE')), request_hash varchar(64) NOT NULL,
 plan_json text NOT NULL, state varchar(32) NOT NULL DEFAULT 'PREPARED',
 expires_at timestamptz NOT NULL,abort_requested_by uuid,abort_reason varchar(500), result_json text, error varchar(500), attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transport_one_item_operation ON transport_item_operations(item_id) WHERE state NOT IN ('COMPLETED','ABORTED','ABORT_REFUND_PENDING');
CREATE INDEX transport_item_operation_pending ON transport_item_operations(state,next_attempt_at);
CREATE TABLE transport_operation_cash_proofs (
 operation_id uuid PRIMARY KEY REFERENCES transport_item_operations(id), shift_id uuid NOT NULL REFERENCES transport_cash_shifts(id),
 actor_id uuid NOT NULL, amount numeric(18,0) NOT NULL CHECK(amount>0), reference varchar(160) NOT NULL UNIQUE,
 received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transport_operation_refund_proofs (
 operation_id uuid PRIMARY KEY REFERENCES transport_item_operations(id), actor_id uuid NOT NULL,
 amount numeric(18,0) NOT NULL CHECK(amount>0), reference varchar(160) NOT NULL UNIQUE, evidence_url varchar(1000) NOT NULL,
 refund_method varchar(32) NOT NULL DEFAULT 'BANK_TRANSFER', shift_id uuid REFERENCES transport_cash_shifts(id),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER transport_operation_cash_immutable BEFORE UPDATE OR DELETE ON transport_operation_cash_proofs FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_receipt_change();
CREATE TRIGGER transport_operation_refund_immutable BEFORE UPDATE OR DELETE ON transport_operation_refund_proofs FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_receipt_change();
