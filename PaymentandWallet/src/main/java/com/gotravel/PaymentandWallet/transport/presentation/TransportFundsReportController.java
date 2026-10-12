package com.gotravel.PaymentandWallet.transport.presentation;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.transport.application.TransportFundsReportService;
import lombok.RequiredArgsConstructor;import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;import java.util.Map;import java.util.UUID;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/internal/payments/transport")
public class TransportFundsReportController {
 private final TransportFundsReportService service;
 @GetMapping("/funds-report") public ApiResponse<Map<String,Object>> report(@RequestParam(required=false)UUID ownerUserId,@RequestParam LocalDate from,@RequestParam LocalDate to){return ApiResponse.success(service.report(ownerUserId,from,to));}
}
