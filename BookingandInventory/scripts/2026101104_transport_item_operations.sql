CREATE TABLE transport_item_inventory_operations (
 operation_id uuid PRIMARY KEY, order_id uuid NOT NULL, item_id uuid NOT NULL, kind varchar(16) NOT NULL,
 request_hash varchar(64) NOT NULL, old_trip_id uuid NOT NULL, old_seat_id uuid NOT NULL,
 new_trip_id uuid, new_seat_id uuid, state varchar(32) NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE transport_item_inventory (
 item_id uuid PRIMARY KEY, order_id uuid NOT NULL, trip_id uuid NOT NULL, seat_id uuid NOT NULL, reservation_id uuid NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'SOLD'
);
CREATE INDEX transport_item_inventory_order ON transport_item_inventory(order_id);
