package com.gotravel.PaymentandWallet.transport.application;

import com.gotravel.PaymentandWallet.transport.domain.TransportSettlementPort;
import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.entity.HostPayout;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransportSettlementService {
    private final TransportSettlementPort ledger;
    private final OrderClient orders;
    public TransportSettlementPort.Net prepare(HostPayout payout) {
        var response=orders.getPaymentSummary(payout.getOrderId());
        if(response==null || !response.isSuccess() || response.getData()==null || !"GOCAR_TICKET".equals(response.getData().getOrderKind()) || !payout.getHostId().equals(response.getData().getHostId()) || !List.of("COMPLETED","REFUNDED","CANCELLED").contains(response.getData().getStatus()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Chỉ quyết toán vận tải sau khi kết thúc chuyến/hoàn tất hủy và hoàn tiền");
        return ledger.net(payout.getId(),payout.getOrderId(),payout.getTotalAmount(),payout.getTotalAmount().multiply(payout.getCommissionRate()));
    }
    public void proof(HostPayout payout,UUID actor,BigDecimal amount,String reference,String evidence) {
        if(actor==null || amount==null || amount.signum()<0 || amount.stripTrailingZeros().scale()>0 || amount.compareTo(payout.getHostAmount())!=0 || reference==null || reference.isBlank() || reference.length()>160 || evidence==null || !evidence.startsWith("https://") || evidence.length()>1000)throw new ResponseStatusException(HttpStatus.CONFLICT,"Chứng cứ chi trả phải khớp net payable");
        ledger.recordProof(payout.getId(),payout.getOrderId(),actor,amount,reference.trim(),evidence);
    }
}
