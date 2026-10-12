package com.Gostay.BookingandInventory.transport.infrastructure;

import com.Gostay.BookingandInventory.transport.domain.TransportInventory;
import com.Gostay.BookingandInventory.transport.domain.TransportInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcTransportInventoryRepository implements TransportInventoryRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    private static final RowMapper<TransportInventory.Trip> TRIP_MAPPER = (rs, row) ->
            new TransportInventory.Trip(
                    rs.getObject("trip_id", UUID.class),
                    rs.getObject("operator_id", UUID.class),
                    rs.getTimestamp("departure_at").toInstant(),
                    rs.getBoolean("sale_enabled"),
                    rs.getInt("sync_version"));

    private static final RowMapper<TransportInventory.Seat> SEAT_MAPPER = (rs, row) ->
            new TransportInventory.Seat(
                    rs.getObject("trip_id", UUID.class),
                    rs.getObject("seat_id", UUID.class),
                    rs.getString("seat_code"),
                    TransportInventory.SeatStatus.valueOf(rs.getString("status")),
                    rs.getObject("order_id", UUID.class),
                    rs.getObject("hold_id", UUID.class),
                    rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant());

    @Override
    public void recordSeatBlock(UUID tripId, UUID actorId, List<UUID> seatIds, boolean blocked, String reason) {
        for (UUID seatId : seatIds) jdbc.update("insert into transport_seat_block_audit(id,trip_id,seat_id,actor_id,blocked,reason) values (?,?,?,?,?,?)",
                UUID.randomUUID(), tripId, seatId, actorId, blocked, reason);
    }

    @Override
    public void lockKey(UUID key) {
        jdbc.query("select pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null, key.toString());
    }

    @Override
    public Optional<TransportInventory.Trip> findTripForUpdate(UUID tripId) {
        return jdbc.query("select * from transport_trip_inventory where trip_id = ? for update",
                TRIP_MAPPER, tripId).stream().findFirst();
    }

    @Override
    public List<TransportInventory.Seat> findSeatsForUpdate(UUID tripId, List<UUID> seatIds) {
        if (seatIds.isEmpty()) return List.of();
        return namedJdbc.query(
                "select * from transport_trip_seats where trip_id = :tripId and seat_id in (:seatIds) order by seat_id for update",
                new MapSqlParameterSource("tripId", tripId).addValue("seatIds", seatIds), SEAT_MAPPER);
    }

    @Override
    public List<TransportInventory.Seat> findAllSeats(UUID tripId) {
        return jdbc.query("select * from transport_trip_seats where trip_id = ? order by seat_code",
                SEAT_MAPPER, tripId);
    }

    @Override
    public Optional<TransportInventory.Hold> findHoldForUpdate(UUID orderId) {
        var rows = jdbc.query("select * from transport_seat_holds where order_id = ? for update",
                (rs, row) -> new TransportInventory.Hold(
                        rs.getObject("id", UUID.class),
                        rs.getObject("order_id", UUID.class),
                        rs.getObject("trip_id", UUID.class),
                        List.of(),
                        TransportInventory.HoldStatus.valueOf(rs.getString("status")),
                        rs.getTimestamp("expires_at").toInstant()), orderId);
        if (rows.isEmpty()) return Optional.empty();
        var hold = rows.get(0);
        var seats = jdbc.query("select seat_id from transport_hold_seats where hold_id = ? order by seat_id",
                (rs, row) -> rs.getObject("seat_id", UUID.class), hold.id());
        return Optional.of(new TransportInventory.Hold(hold.id(), hold.orderId(), hold.tripId(),
                seats, hold.status(), hold.expiresAt()));
    }

    @Override
    public void createTrip(TransportInventory.Trip trip, List<TransportInventory.Seat> seats) {
        jdbc.update("insert into transport_trip_inventory(trip_id, operator_id, departure_at, sale_enabled, sync_version) values (?, ?, ?, false, ?)",
                trip.id(), trip.operatorId(), Timestamp.from(trip.departureAt()), trip.syncVersion());
        for (var seat : seats) {
            jdbc.update("insert into transport_trip_seats(trip_id, seat_id, seat_code, status) values (?, ?, ?, 'AVAILABLE')",
                    seat.tripId(), seat.seatId(), seat.code());
        }
    }

    @Override
    public void setSaleEnabled(UUID tripId, boolean enabled, int version) {
        jdbc.update("update transport_trip_inventory set sale_enabled = ?, sync_version = ? where trip_id = ?", enabled, version, tripId);
    }

    @Override
    public void insertHold(TransportInventory.Hold hold) {
        jdbc.update("insert into transport_seat_holds(id, order_id, trip_id, status, expires_at) values (?, ?, ?, ?, ?)",
                hold.id(), hold.orderId(), hold.tripId(), hold.status().name(), Timestamp.from(hold.expiresAt()));
        for (var seatId : hold.seatIds()) {
            jdbc.update("insert into transport_hold_seats(hold_id, seat_id) values (?, ?)", hold.id(), seatId);
        }
    }

    @Override
    public void updateHold(TransportInventory.Hold hold) {
        jdbc.update("update transport_seat_holds set status = ? where id = ?", hold.status().name(), hold.id());
    }

    @Override
    public void updateSeats(List<TransportInventory.Seat> seats) {
        for (var seat : seats) {
            int updated = jdbc.update("""
                    update transport_trip_seats
                       set status = ?, order_id = ?, hold_id = ?, expires_at = ?
                     where trip_id = ? and seat_id = ?
                    """, seat.status().name(), seat.orderId(), seat.holdId(),
                    seat.expiresAt() == null ? null : Timestamp.from(seat.expiresAt()),
                    seat.tripId(), seat.seatId());
            if (updated != 1) throw new IllegalStateException("Ghế biến mất trong lúc cập nhật");
        }
    }

    @Override
    public List<UUID> expiredOrderIds(Instant now, int limit) {
        return jdbc.query("""
                select order_id from transport_seat_holds
                 where status = 'HELD' and expires_at <= ?
                 order by expires_at
                 limit ?
                """, (rs, row) -> rs.getObject("order_id", UUID.class), Timestamp.from(now), limit);
    }
}
