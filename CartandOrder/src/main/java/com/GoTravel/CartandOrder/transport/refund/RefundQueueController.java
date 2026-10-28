package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/v1/orders/transport/admin/refund-queue")
public class RefundQueueController {
 private final RefundQueueService service;
 @GetMapping public ApiResponse<Page<RefundQueueService.Case>> list(@RequestParam(defaultValue="PENDING") String category,@RequestParam(required=false) String search,Pageable page){return ApiResponse.success(service.list(category,search,page));}
}
