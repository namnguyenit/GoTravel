-- Precondition: resolve duplicate pending commands before migration.
CREATE UNIQUE INDEX transport_amendment_one_unresolved_item ON transport_order_amendments(order_item_id) WHERE status IN ('PENDING','ATTENTION');
ALTER TABLE transport_order_amendments ADD CONSTRAINT transport_amendment_status_check CHECK(status IN ('PENDING','ATTENTION','CONFLICT','COMPLETED'));
