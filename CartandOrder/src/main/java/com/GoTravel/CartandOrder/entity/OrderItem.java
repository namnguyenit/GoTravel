package com.GoTravel.CartandOrder.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Column(name = "transport_trip_id")
    private UUID transportTripId;

    @Column(name = "transport_seat_id")
    private UUID transportSeatId;

    @Column(name = "transport_seat_code", length = 32)
    private String transportSeatCode;

    @Column(name = "passenger_name")
    private String passengerName;

    @Column(name = "pickup_stop_id")
    private UUID pickupStopId;

    @Column(name = "dropoff_stop_id")
    private UUID dropoffStopId;

    @Column(name = "transport_ticket_id")
    private UUID transportTicketId;

    @Column(name = "transport_check_in_token", length = 256)
    private String transportCheckInToken;

    @Column(name = "host_id")
    private UUID hostId;

    @Column(name = "listing_title", nullable = false)
    private String listingTitle;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "time_slot")
    private String timeSlot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;
}
