ALTER TABLE payment_requests ADD COLUMN order_kind varchar(32);
UPDATE payment_requests p SET order_kind='GOCAR_TICKET' WHERE EXISTS(SELECT 1 FROM host_payouts h WHERE h.payment_request_id=p.id AND h.provider_type='TRANSPORT');
CREATE TABLE transport_item_accounts (
 item_id uuid PRIMARY KEY, order_id uuid NOT NULL, operator_user_id uuid NOT NULL, method varchar(16) NOT NULL,
 original_amount numeric(18,0) NOT NULL CHECK(original_amount>0), balance numeric(18,0) NOT NULL CHECK(balance>=0),
 revision integer NOT NULL DEFAULT 1, reserved_by uuid, commission_rate numeric(8,6), commission_version varchar(100), cash_shift_id uuid
);
CREATE TABLE transport_item_money_operations (
 operation_id uuid PRIMARY KEY, item_id uuid NOT NULL REFERENCES transport_item_accounts(item_id), request_hash varchar(64) NOT NULL,
 old_amount numeric(18,0) NOT NULL, new_amount numeric(18,0) NOT NULL, fee numeric(18,0) NOT NULL,
 topup numeric(18,0) NOT NULL, refund_due numeric(18,0) NOT NULL, state varchar(32) NOT NULL DEFAULT 'RESERVED',
 created_at timestamptz NOT NULL DEFAULT now(), committed_at timestamptz
);
CREATE TABLE transport_item_money_events (
 id uuid PRIMARY KEY, operation_id uuid NOT NULL REFERENCES transport_item_money_operations(operation_id),
 kind varchar(32) NOT NULL, amount numeric(24,6) NOT NULL CHECK(amount>=0), reference varchar(160), evidence_url varchar(1000), actor_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operation_id,kind)
);
CREATE UNIQUE INDEX transport_money_reference ON transport_item_money_events(reference) WHERE reference IS NOT NULL;
CREATE OR REPLACE FUNCTION reject_transport_item_money_event_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Transport money events are immutable'; END; $$;
CREATE TRIGGER transport_money_event_immutable BEFORE UPDATE OR DELETE ON transport_item_money_events FOR EACH ROW EXECUTE FUNCTION reject_transport_item_money_event_change();

CREATE TABLE transport_item_fund_lots (
 id uuid PRIMARY KEY,item_id uuid NOT NULL REFERENCES transport_item_accounts(item_id),source_operation_id uuid,
 cash_shift_id uuid,commission_rate numeric(8,6) NOT NULL,commission_version varchar(100) NOT NULL,
 remaining_amount numeric(18,0) NOT NULL CHECK(remaining_amount>=0),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(item_id,source_operation_id)
);
ALTER TABLE transport_item_money_events ADD COLUMN cash_shift_id uuid;

CREATE TABLE transport_item_cash_refund_allocations (
 operation_id uuid NOT NULL REFERENCES transport_item_money_operations(operation_id),shift_id uuid NOT NULL,
 amount numeric(18,0) NOT NULL,commission_reversal numeric(24,6) NOT NULL,PRIMARY KEY(operation_id,shift_id)
);

CREATE TABLE transport_payout_bases (
 payout_id uuid PRIMARY KEY REFERENCES host_payouts(id), order_id uuid NOT NULL UNIQUE,
 original_amount numeric(18,0) NOT NULL,original_commission numeric(24,6) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transport_payout_proofs (
 payout_id uuid PRIMARY KEY REFERENCES host_payouts(id),order_id uuid NOT NULL,
 actor_id uuid NOT NULL,amount numeric(18,0) NOT NULL CHECK(amount>=0),
 reference varchar(160) NOT NULL UNIQUE,evidence_url varchar(1000) NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER transport_payout_proof_immutable BEFORE UPDATE OR DELETE ON transport_payout_proofs FOR EACH ROW EXECUTE FUNCTION reject_transport_item_money_event_change();
