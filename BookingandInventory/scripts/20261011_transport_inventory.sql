-- Apply through the deployment migration gate before starting the new Inventory build.
-- Existing GoTravel inventory tables are untouched.
CREATE TABLE IF NOT EXISTS transport_trip_inventory (
    trip_id uuid PRIMARY KEY,
    operator_id uuid NOT NULL,
    departure_at timestamptz NOT NULL,
    sale_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS transport_trip_seats (
    trip_id uuid NOT NULL REFERENCES transport_trip_inventory(trip_id),
    seat_id uuid NOT NULL,
    seat_code varchar(32) NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'AVAILABLE',
    order_id uuid,
    hold_id uuid,
    expires_at timestamptz,
    PRIMARY KEY (trip_id, seat_id),
    UNIQUE (trip_id, seat_code),
    CONSTRAINT transport_seat_status CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')),
    CONSTRAINT transport_seat_hold_fields CHECK (
        (status = 'HELD' AND order_id IS NOT NULL AND hold_id IS NOT NULL AND expires_at IS NOT NULL)
        OR (status = 'SOLD' AND order_id IS NOT NULL AND hold_id IS NOT NULL AND expires_at IS NULL)
        OR (status IN ('AVAILABLE', 'BLOCKED') AND order_id IS NULL AND hold_id IS NULL AND expires_at IS NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_transport_seats_order ON transport_trip_seats(order_id);

CREATE TABLE IF NOT EXISTS transport_seat_holds (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL UNIQUE,
    trip_id uuid NOT NULL REFERENCES transport_trip_inventory(trip_id),
    status varchar(16) NOT NULL,
    expires_at timestamptz NOT NULL,
    CONSTRAINT transport_hold_status CHECK (status IN ('HELD', 'SOLD', 'RELEASED', 'EXPIRED', 'CANCELLED'))
);
CREATE INDEX IF NOT EXISTS idx_transport_holds_expiry
    ON transport_seat_holds(expires_at) WHERE status = 'HELD';

CREATE TABLE IF NOT EXISTS transport_hold_seats (
    hold_id uuid NOT NULL REFERENCES transport_seat_holds(id),
    seat_id uuid NOT NULL,
    PRIMARY KEY (hold_id, seat_id)
);
