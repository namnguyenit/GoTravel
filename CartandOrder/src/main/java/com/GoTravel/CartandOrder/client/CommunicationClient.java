package com.GoTravel.CartandOrder.client;

import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import com.GoTravel.CartandOrder.dto.request.RefundEmailRequest;
import com.GoTravel.CartandOrder.dto.request.TicketEmailRequest;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.EmailSendResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "communication-service", url = "${services.communication.url:http://localhost:5001}", configuration = InternalFeignConfig.class)
public interface CommunicationClient {

    @PostMapping("/api/v1/communications/email/transport")
    ApiResponse<EmailSendResponse> sendTransportEmail(@RequestBody com.GoTravel.CartandOrder.transport.TransportNotificationService.Mail request);

    @PostMapping("/api/v1/communications/email/ticket")
    ApiResponse<EmailSendResponse> sendTicketEmail(@RequestBody TicketEmailRequest request);

    @PostMapping("/api/v1/communications/email/refund")
    ApiResponse<EmailSendResponse> sendRefundEmail(@RequestBody RefundEmailRequest request);
}
