package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "gocar-backend", url = "${services.car.url:http://127.0.0.1:3333}", configuration = InternalFeignConfig.class)
public interface GoCarClient {
    record QuoteRequest(UUID tripId, List<TransportCheckoutRequest.Passenger> passengers) {}
    record IssueTicketRequest(UUID orderId, List<TicketItem> items) {}
    record TicketItem(UUID orderItemId, UUID tripId, UUID seatId, String passengerName,
                      UUID pickupStopId, UUID dropoffStopId) {}
    record TicketResult(UUID orderItemId, UUID ticketId, String checkInToken) {}
    record StaffAuthorization(UUID actorId, UUID tripId, UUID operatorId, String capability) {}
    record TicketStatus(UUID ticketId, UUID orderItemId, UUID tripId, UUID seatId, String status) {}

    @GetMapping("/api/v1/internal/car/transport/orders/{orderId}/tickets")
    ApiResponse<List<TicketStatus>> orderTickets(@PathVariable("orderId") UUID orderId);

    @GetMapping("/api/v1/internal/car/staff/authorize")
    ApiResponse<StaffAuthorization> authorizeStaff(@RequestParam("actorId") UUID actorId,
            @RequestParam("tripId") UUID tripId, @RequestParam("capability") String capability);

    @PostMapping("/api/v1/internal/car/transport/quote")
    ApiResponse<TransportQuote> quote(@RequestBody QuoteRequest request);

    @PostMapping("/api/v1/internal/car/transport/tickets")
    ApiResponse<List<TicketResult>> issueTickets(@RequestBody IssueTicketRequest request);

    @PostMapping("/api/v1/internal/car/transport/tickets/void-order/{orderId}")
    ApiResponse<Object> voidTickets(@PathVariable("orderId") UUID orderId);
}
