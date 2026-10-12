package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/orders/transport/trips")
@RequiredArgsConstructor
public class TripCancellationController {
    private final TripCancellationService service;
    private final TransportCompletionService completion;
    @PutMapping("/{tripId}/complete")
    public ResponseEntity<ApiResponse<Void>> complete(@PathVariable UUID tripId) {
        completion.complete(tripId);
        return ResponseEntity.ok(ApiResponse.success("Đã đồng bộ hoàn thành chuyến"));
    }

    public record CancelRequest(String reason) {}

    @PutMapping("/{tripId}/cancellation")
    public ResponseEntity<ApiResponse<TripCancellationService.Progress>> request(
            @PathVariable UUID tripId, @RequestBody CancelRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.request(tripId,
                request == null ? null : request.reason())));
    }

    @GetMapping("/{tripId}/cancellation")
    public ResponseEntity<ApiResponse<TripCancellationService.Progress>> progress(@PathVariable UUID tripId) {
        return ResponseEntity.ok(ApiResponse.success(service.progress(tripId)));
    }
}
