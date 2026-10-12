CREATE TABLE transport_seat_block_audit (
 id uuid PRIMARY KEY, trip_id uuid NOT NULL, seat_id uuid NOT NULL,
 actor_id uuid NOT NULL, blocked boolean NOT NULL, reason varchar(500) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (trip_id,seat_id) REFERENCES transport_trip_seats(trip_id,seat_id)
);
CREATE FUNCTION transport_seat_block_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Seat block audit is append-only'; END;
$$;
CREATE TRIGGER transport_seat_block_audit_immutable BEFORE UPDATE OR DELETE ON transport_seat_block_audit
 FOR EACH ROW EXECUTE FUNCTION transport_seat_block_audit_immutable();
