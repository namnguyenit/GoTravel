package com.gotravel.PaymentandWallet.transport.presentation;
import com.gotravel.PaymentandWallet.transport.application.TransportItemMoneyService;
import com.gotravel.PaymentandWallet.transport.domain.ItemMoneyLedger.Result;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/internal/payments/transport/item-operations")
public class TransportItemMoneyController {
 private final TransportItemMoneyService service;
 @PutMapping("/{id}/{action}")public ApiResponse<Result> apply(@PathVariable UUID id,@PathVariable String action){return ApiResponse.success(service.apply(id,action));}
}
