package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.client.CatalogClient;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.entity.OrderItem;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.mapper.OrderMapper;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportOrderService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final OrderRepository orders;
    private final CatalogClient catalog;
    private final GoCarClient car;
    private final TransportInventoryClient inventory;
    private final PaymentClient payments;
    private final OrderMapper mapper;
    private final TransactionTemplate transactions;
    private final CashLedger cashLedger;
    private final CancellationPolicy cancellationPolicy;
    private final JdbcTemplate jdbc;
    private final com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationService itemOperations;

    public Map<String, Object> ticketTrip(UUID actorId, UUID orderId, UUID itemId) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET || !actorId.equals(order.getUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var item = order.getItems().stream().filter(candidate -> candidate.getId().equals(itemId))
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (item.getTransportTripId() == null || item.getTransportTicketId() == null)
            throw conflict("Vé chưa phát hành thông tin chuyến");
        var response = car.ticketTrip(orderId, item.getTransportTripId());
        if (response == null || !response.isSuccess() || response.getData() == null)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa đọc được lộ trình của vé");
        return response.getData();
    }

    public com.GoTravel.CartandOrder.dto.response.OrderResponse checkout(
            UUID userId, String idempotencyKey, TransportCheckoutRequest request) {
        return checkoutInternal(userId, null, null, PaymentMethod.ONLINE, idempotencyKey, request);
    }

    public com.GoTravel.CartandOrder.dto.response.OrderResponse checkoutCash(
            UUID cashierId, String idempotencyKey, TransportCheckoutRequest request) {
        if (cashierId == null || request == null || request.tripId() == null)
            throw badRequest("Nhân viên hoặc chuyến không hợp lệ");
        var staff = car.authorizeStaff(cashierId, request.tripId(), "SELL_CASH").getData();
        if (staff == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên chưa được phân công bán vé");
        return checkoutInternal(null, cashierId, null, PaymentMethod.CASH, idempotencyKey, request);
    }

    private com.GoTravel.CartandOrder.dto.response.OrderResponse checkoutInternal(
            UUID userId, UUID cashierId, UUID shiftId, PaymentMethod method,
            String idempotencyKey, TransportCheckoutRequest request) {
        if (method == PaymentMethod.ONLINE &&
                (request == null || request.email() == null || request.email().isBlank())) {
            throw badRequest("Đặt vé trực tuyến cần email nhận vé hợp lệ");
        }
        if ((method == PaymentMethod.ONLINE && userId == null) ||
                (method == PaymentMethod.CASH && cashierId == null) ||
                idempotencyKey == null || !idempotencyKey.matches("[A-Za-z0-9_-]{8,120}") ||
                request == null || request.passengers() == null || request.passengers().isEmpty() ||
                request.passengers().size() > 10 ||
                new HashSet<>(request.passengers().stream().map(TransportCheckoutRequest.Passenger::seatId).toList()).size()
                        != request.passengers().size()) {
            throw badRequest("Dữ liệu checkout hoặc idempotency key không hợp lệ");
        }
        var requestHash = requestHash(request);
        var prior = method == PaymentMethod.CASH
                ? orders.findByTransportCashierIdAndTransportIdempotencyKey(cashierId, idempotencyKey)
                : orders.findByUserIdAndTransportIdempotencyKey(userId, idempotencyKey);
        if (prior.isPresent()) return priorCheckout(prior.get(), requestHash, method);

        var quoteResponse = car.quote(new GoCarClient.QuoteRequest(request.tripId(), request.passengers()));
        var quote = quoteResponse == null ? null : quoteResponse.getData();
        validateQuote(quote, request);
        if (method == PaymentMethod.CASH) {
            var staff = car.authorizeStaff(cashierId, quote.tripId(), "SELL_CASH").getData();
            if (staff == null || !staff.operatorId().equals(quote.operatorId())) {
                throw conflict("Nhân viên không được bán vé của nhà xe này");
            }
        }
        var catalogResponse = catalog.getListingDetail(quote.listingId());
        var offer = catalogResponse == null ? null : catalogResponse.getData();
        if (offer == null || !"TRANSPORT".equals(offer.getCategory()) ||
                !"ACTIVE".equals(offer.getStatus()) ||
                !quote.operatorUserId().equals(offer.getHostId())) {
            throw conflict("Tuyến chưa mở bán trong Catalog");
        }
        var commissionResponse = method == PaymentMethod.CASH ? payments.getTransportCommission() : null;
        var commission = commissionResponse == null ? null : commissionResponse.getData();
        if (method == PaymentMethod.CASH && (commission == null || commission.version() == null || commission.version().isBlank() ||
                commission.rate() == null || commission.rate().signum() < 0 || commission.rate().compareTo(BigDecimal.ONE) >= 0))
            throw conflict("Chưa đọc được cấu hình hoa hồng tiền mặt hợp lệ");
        Order order;
        try {
            order = transactions.execute(status -> {
                var accountingBatchId = method == PaymentMethod.CASH
                        ? cashLedger.prepareAutomatic(cashierId, quote.operatorId(), commission.version(), commission.rate()).id()
                        : shiftId;
                var created = Order.builder()
                        .userId(userId)
                        .hostId(quote.operatorUserId())
                        .orderKind(OrderKind.GOCAR_TICKET)
                        .paymentMethod(method)
                        .transportTripId(quote.tripId())
                        .transportQuoteId(quote.quoteId())
                        .transportQuoteVersion(quote.quoteVersion())
                        .transportQuoteHash(quote.quoteHash())
                        .transportIdempotencyKey(idempotencyKey)
                        .transportRequestHash(requestHash)
                        .transportCashierId(cashierId)
                        .transportCashShiftId(accountingBatchId)
                        .orderNumber("CAR-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                        .status(OrderStatus.PENDING)
                        .totalAmount(quote.totalAmount())
                        .currency("VND")
                        .customerInfo(new Order.CustomerInfo(
                                request.fullName(), request.email(), request.phone()))
                        .build();
                cancellationPolicy.snapshot(created, quote.departureAt());
                var passengers = request.passengers().stream().collect(java.util.stream.Collectors.toMap(
                        TransportCheckoutRequest.Passenger::seatId, passenger -> passenger));
                for (var seat : quote.seats()) {
                    var passenger = passengers.get(seat.seatId());
                    created.getItems().add(OrderItem.builder()
                            .order(created)
                            .listingId(quote.listingId())
                            .hostId(quote.operatorUserId())
                            .listingTitle(quote.routeTitle())
                            .startDate(quote.departureAt().atZone(VN_ZONE).toLocalDate())
                            .endDate(quote.departureAt().atZone(VN_ZONE).toLocalDate())
                            .quantity(1)
                            .unitPrice(seat.price())
                            .totalPrice(seat.price())
                            .transportOriginalAmount(seat.price())
                            .transportDepartureAt(LocalDateTime.ofInstant(quote.departureAt(), VN_ZONE))
                            .transportTripId(quote.tripId())
                            .transportSeatId(seat.seatId())
                            .transportSeatCode(seat.code())
                            .passengerName(passenger.name())
                            .pickupStopId(passenger.pickupStopId())
                            .dropoffStopId(passenger.dropoffStopId())
                            .build());
                }
                return orders.saveAndFlush(created);
            });
        } catch (org.springframework.dao.DataIntegrityViolationException duplicate) {
            var duplicateOrder = method == PaymentMethod.CASH
                    ? orders.findByTransportCashierIdAndTransportIdempotencyKey(cashierId, idempotencyKey)
                    : orders.findByUserIdAndTransportIdempotencyKey(userId, idempotencyKey);
            return duplicateOrder.map(found -> priorCheckout(found, requestHash, method))
                    .orElseThrow(() -> duplicate);
        }
        try {
            var claimed = car.claimQuote(quote.quoteId(), new GoCarClient.ClaimQuoteRequest(order.getId(), quote.quoteHash()));
            if (claimed == null || !claimed.isSuccess()) throw conflict("Báo giá chưa được chốt");
            var reserved = inventory.reserve(quote.tripId(), new TransportInventoryClient.ReserveRequest(
                    order.getId(), quote.seats().stream().map(TransportQuote.SeatQuote::seatId).toList()));
            if (reserved == null || !reserved.isSuccess() || reserved.getData() == null ||
                    !reserved.getData().expiresAt().isAfter(Instant.now())) {
                throw conflict("Không giữ được ghế");
            }
            UUID orderId = order.getId();
            var hold = reserved.getData();
            order = transactions.execute(status -> {
                var current = orders.findByIdForUpdate(orderId).orElseThrow();
                if (current.getStatus() != OrderStatus.PENDING) throw conflict("Order đã đổi trạng thái");
                current.setTransportHoldId(hold.holdId());
                current.setExpiresAt(LocalDateTime.ofInstant(hold.expiresAt(), VN_ZONE));
                current.setStatus(method == PaymentMethod.CASH
                        ? OrderStatus.CASH_PENDING : OrderStatus.PAYMENT_PENDING);
                return orders.save(current);
            });
            return mapper.toOrderResponse(order);
        } catch (Exception error) {
            UUID orderId = order.getId();
            transactions.executeWithoutResult(status -> {
                var current = orders.findByIdForUpdate(orderId).orElseThrow();
                if (current.getStatus() == OrderStatus.PENDING) {
                    current.setStatus(OrderStatus.CANCELLATION_PENDING);
                    orders.save(current);
                }
            });
            tryRelease(orderId);
            throw conflict("Không thể giữ ghế; đơn đang được giải phóng");
        }
    }

    public void paymentSuccess(UUID orderId) {
        var payment = paymentStatusOrNull(orderId);
        var trusted = payment == null ? null : payment.getData();
        if (trusted == null || !orderId.equals(trusted.orderId()) ||
                !"COMPLETED".equals(trusted.status()) || trusted.paidAt() == null) {
            throw conflict("GoPay chưa xác nhận tiền");
        }
        transactions.executeWithoutResult(status -> {
            var order = orders.findByIdForUpdate(orderId).orElseThrow(() -> badRequest("Không có order"));
            if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    order.getPaymentMethod() != PaymentMethod.ONLINE ||
                    trusted.amount() == null || trusted.amount().compareTo(order.getTotalAmount()) != 0) {
                throw conflict("Giao dịch không khớp order");
            }
            if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.REFUNDED ||
                    order.getStatus() == OrderStatus.REFUND_PENDING ||
                    order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
                    order.getStatus() == OrderStatus.PAID_REVIEW) return;
            if (order.getStatus() != OrderStatus.PAYMENT_PENDING ||
                    order.getExpiresAt() == null || trusted.paidAt().isAfter(order.getExpiresAt())) {
                order.setStatus(OrderStatus.PAID_REVIEW);
            } else {
                order.setStatus(OrderStatus.FULFILLMENT_PENDING);
            }
            orders.save(order);
        });
        var state = orders.findWithItemsById(orderId).orElseThrow().getStatus();
        if (state == OrderStatus.PAID_REVIEW) throw conflict("Tiền đã nhận nhưng ghế cần đối soát");
        if (state == OrderStatus.FULFILLMENT_PENDING) fulfill(orderId);
    }

    public void paymentFailed(UUID orderId) {
        var paymentOrder = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (paymentOrder.getPaymentMethod() != PaymentMethod.ONLINE) {
            throw conflict("Đơn tiền mặt không nhận callback GoPay");
        }
        var payment = paymentStatusOrNull(orderId);
        if (payment != null && payment.getData() != null &&
                "COMPLETED".equals(payment.getData().status())) return;
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.REFUNDED ||
                    order.getStatus() == OrderStatus.REFUND_PENDING ||
                    order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
                order.getStatus() == OrderStatus.PAID_REVIEW) return;
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() == OrderStatus.PENDING || current.getStatus() == OrderStatus.PAYMENT_PENDING) {
                current.setStatus(OrderStatus.CANCELLATION_PENDING);
                orders.save(current);
            }
        });
        tryRelease(orderId);
    }

    public void paymentReview(UUID orderId) {
        var payment = paymentStatusOrNull(orderId);
        var paid = payment == null ? null : payment.getData();
        if (paid == null || paid.amount() == null || paid.status() == null ||
                !List.of("COMPLETED", "PAID_REVIEW").contains(paid.status())) {
            throw conflict("GoPay chưa ghi nhận tiền cần đối soát");
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow(() -> badRequest("Không có order"));
            if (current.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    current.getPaymentMethod() != PaymentMethod.ONLINE ||
                    paid.amount().compareTo(current.getTotalAmount()) != 0) {
                throw conflict("Giao dịch không khớp order");
            }
            if (current.getStatus() == OrderStatus.COMPLETED || current.getStatus() == OrderStatus.CONFIRMED ||
                    current.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
                    current.getStatus() == OrderStatus.REFUND_PENDING ||
                    current.getStatus() == OrderStatus.REFUNDED) return;
            current.setStatus(OrderStatus.PAID_REVIEW);
            orders.save(current);
        });
    }

    public void cancelUnpaid(UUID userId, UUID orderId) {
        var order = orders.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PAYMENT_PENDING)) {
            throw conflict("Đơn không thể hủy theo luồng chưa thanh toán");
        }
        var payment = paymentStatusOrNull(orderId);
        if (payment != null && payment.getData() != null &&
                "COMPLETED".equals(payment.getData().status())) {
            paymentSuccess(orderId);
            throw conflict("Thanh toán đã hoàn tất; cần dùng chính sách hủy vé");
        }
        paymentFailed(orderId);
    }

    public void cancelCashUnpaid(UUID cashierId, UUID orderId) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                order.getPaymentMethod() != PaymentMethod.CASH ||
                !cashierId.equals(order.getTransportCashierId()) ||
                order.getStatus() != OrderStatus.CASH_PENDING) {
            throw conflict("Không thể hủy đơn tiền mặt này");
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.CASH_PENDING) throw conflict("Order đã đổi trạng thái");
            current.setStatus(OrderStatus.CANCELLATION_PENDING);
            orders.save(current);
        });
        tryRelease(orderId);
    }

    public CancellationPolicy.Quote cancellationPreview(UUID actorId, UUID orderId) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET || order.getStatus() != OrderStatus.CONFIRMED ||
                !(actorId.equals(order.getUserId()) || actorId.equals(order.getTransportCashierId())))
            throw conflict("Không có quyền xem chính sách hủy của đơn");
        if (order.getPaymentMethod() == PaymentMethod.CASH) {
            var authorized = car.authorizeStaff(actorId, order.getTransportTripId(), "SELL_CASH");
            if (authorized == null || authorized.getData() == null) throw conflict("Nhân viên đã mất quyền");
        }
        BigDecimal fee=BigDecimal.ZERO,refund=BigDecimal.ZERO;
        for(var item:order.getItems())if("ACTIVE".equals(item.getTransportItemState())){
            var quote=cancellationPolicy.quoteAmount(order,item.getTransportDepartureAt()==null?order.getTransportDepartureAt():item.getTransportDepartureAt(),item.getTotalPrice());
            fee=fee.add(quote.fee());refund=refund.add(quote.refundDue());
        }
        if(fee.add(refund).signum()==0)throw conflict("Đơn không còn vé có thể hủy");
        return new CancellationPolicy.Quote(fee,refund,order.getTransportPolicyVersion());
    }

    public void cancelPaid(UUID actorId, UUID orderId, String reason) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET || order.getStatus() != OrderStatus.CONFIRMED) {
            throw conflict("Đơn chưa đủ điều kiện hủy vé");
        }
        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            if (!actorId.equals(order.getUserId())) throw conflict("Không phải khách đặt vé");
        } else {
            if (!actorId.equals(order.getTransportCashierId())) throw conflict("Không phải nhân viên ghi nhận tiền");
            var allowed = car.authorizeStaff(actorId, order.getTransportTripId(), "SELL_CASH");
            if (allowed == null || allowed.getData() == null) throw conflict("Nhân viên đã mất quyền");
        }
        if (order.getItems().stream().anyMatch(i -> i.getTransportTicketId()!=null)) {
            cancelIssuedItems(actorId,orderId,null,false);
            return;
        }
        var quote = cancellationPolicy.quote(order);
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.CONFIRMED) throw conflict("Order đã đổi trạng thái");
            Integer activeExchange = jdbc.queryForObject("select count(*) from transport_exchange_cases " +
                            "where (new_order_id=? or old_order_id=?) and status not in ('COMPLETED','REPLACEMENT_CANCELLED','EXCEPTION_RESOLVED')",
                    Integer.class, orderId, orderId);
            if (activeExchange != null && activeExchange > 0)
                throw conflict("Đơn đang trong quy trình đổi vé");
            current.setTransportCancellationFee(quote.fee());
            current.setTransportRefundDue(quote.refundDue());
            current.setTransportCancellationReason(reason == null || reason.isBlank()
                    ? "Khách yêu cầu hủy vé" : reason.trim().substring(0, Math.min(500, reason.trim().length())));
            current.setStatus(OrderStatus.CANCELLATION_PENDING);
            orders.save(current);
        });
        processPaidCancellation(orderId);
    }

    public void processPaidCancellation(UUID orderId) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getStatus() != OrderStatus.CANCELLATION_PENDING || order.getTransportRefundDue() == null) return;
        var voided = car.voidTickets(orderId);
        if (voided == null || !voided.isSuccess()) throw conflict("Chưa vô hiệu hóa được vé");
        var holdResponse = inventory.orderStatus(orderId);
        var hold = holdResponse == null ? null : holdResponse.getData();
        if (hold == null || !order.getTransportTripId().equals(hold.tripId()))
            throw conflict("Không đối chiếu được ghế của đơn cần hủy");
        if ("SOLD".equals(hold.status())) {
            var released = inventory.cancelSold(orderId);
            if (released == null || !released.isSuccess()) throw conflict("Chưa nhả được ghế đã bán");
        } else if ("HELD".equals(hold.status())) {
            var released = inventory.releaseUnpaid(orderId);
            if (released == null || !released.isSuccess()) throw conflict("Chưa nhả được ghế đang giữ");
        } else if (hold.status() == null ||
                !List.of("RELEASED", "EXPIRED", "CANCELLED").contains(hold.status())) {
            throw conflict("Trạng thái ghế cần xử lý thủ công");
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() == OrderStatus.CANCELLATION_PENDING) {
                current.setStatus(OrderStatus.REFUND_PENDING);
                orders.save(current);
                TransportNotificationService.enqueue(jdbc, current, "CANCELLED");
            }
        });
    }

    /** Called only by the durable trip-cancellation coordinator after sale was disabled. */
    private void cancelIssuedItems(UUID actorId,UUID orderId,UUID tripId,boolean forced) {
        var order=orders.findWithItemsById(orderId).orElseThrow();
        for(var item:order.getItems()) {
            if(tripId!=null&&!tripId.equals(item.getTransportTripId())) continue;
            if("OPERATION_PENDING".equals(item.getTransportItemState())) throw conflict("Vé đang có operation; worker sẽ tiếp tục hủy sau khi kết thúc");
            if(!"ACTIVE".equals(item.getTransportItemState())||item.getTransportTicketId()==null)continue;
            itemOperations.request(actorId,orderId,item.getId(),"CANCEL",new com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationService.Request(UUID.randomUUID(),null,null,null,null),forced);
        }
    }

    public void cancelForTrip(UUID orderId, UUID tripId, String reason) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                order.getItems().stream().noneMatch(i->tripId.equals(i.getTransportTripId()))) throw conflict("Order không thuộc chuyến cần hủy");
        if (order.getItems().stream().anyMatch(i -> i.getTransportTicketId()!=null) && order.getStatus()!=OrderStatus.CANCELLED) {
            cancelIssuedItems(order.getHostId(),orderId,tripId,true);
            return;
        }
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.REFUNDED ||
                order.getStatus() == OrderStatus.REFUND_PENDING) return;
        if (order.getStatus() == OrderStatus.PAID_REVIEW) {
            openPaidReviewRefund(orderId);
            return;
        }
        if (order.getStatus() == OrderStatus.CONFIRMED ||
                order.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
                order.getStatus() == OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION ||
                (order.getStatus() == OrderStatus.CANCELLATION_PENDING &&
                        order.getTransportRefundDue() != null)) {
            markFullRefundForTrip(orderId, reason);
            processPaidCancellation(orderId);
            return;
        }
        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            var payment = paymentStatusOrNull(orderId);
            var trusted = payment == null ? null : payment.getData();
            if (trusted != null && trusted.status() != null &&
                    List.of("COMPLETED", "PAID_REVIEW").contains(trusted.status())) {
                if (trusted.amount() == null || trusted.amount().compareTo(order.getTotalAmount()) != 0)
                    throw conflict("Tiền đã thu không khớp đơn hủy chuyến");
                markFullRefundForTrip(orderId, reason);
                processPaidCancellation(orderId);
                return;
            }
        } else if (cashLedger.findReceipt(orderId) != null) {
            markFullRefundForTrip(orderId, reason);
            processPaidCancellation(orderId);
            return;
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() == OrderStatus.PENDING ||
                    current.getStatus() == OrderStatus.PAYMENT_PENDING ||
                    current.getStatus() == OrderStatus.CASH_PENDING) {
                current.setStatus(OrderStatus.CANCELLATION_PENDING);
                current.setTransportCancellationReason(reason);
                orders.save(current);
            }
        });
        tryRelease(orderId);
    }

    private void markFullRefundForTrip(UUID orderId, String reason) {
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() == OrderStatus.REFUND_PENDING ||
                    current.getStatus() == OrderStatus.REFUNDED) return;
            if (current.getStatus() == OrderStatus.CANCELLED)
                throw conflict("Đơn đã hủy trước khi ghi nhận khoản tiền");
            current.setTransportCancellationFee(BigDecimal.ZERO);
            current.setTransportRefundDue(current.getTotalAmount());
            current.setTransportCancellationReason(reason);
            current.setStatus(OrderStatus.CANCELLATION_PENDING);
            orders.save(current);
        });
    }

    public void cancelForExchange(UUID oldOrderId, UUID newOrderId, String reason) {
        var order = orders.findWithItemsById(oldOrderId).orElseThrow(() -> badRequest("Không có đơn cũ"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                (order.getStatus() != OrderStatus.CONFIRMED &&
                        order.getStatus() != OrderStatus.CANCELLATION_PENDING &&
                        order.getStatus() != OrderStatus.REFUND_PENDING &&
                        order.getStatus() != OrderStatus.REFUNDED)) {
            throw conflict("Đơn cũ không đủ điều kiện đổi vé");
        }
        if (order.getStatus() == OrderStatus.REFUND_PENDING || order.getStatus() == OrderStatus.REFUNDED) return;
        Integer itemChanges=jdbc.queryForObject("select count(*) from transport_item_operations where order_id=?",Integer.class,oldOrderId);
        if(itemChanges!=null&&itemChanges>0)throw conflict("Đơn đã có item operation; dùng luồng đổi từng vé");
        transactions.executeWithoutResult(status -> {
            jdbc.execute("select pg_advisory_xact_lock(74100101)");
            UUID first = oldOrderId.compareTo(newOrderId)<0 ? oldOrderId : newOrderId;
            UUID second = first.equals(oldOrderId) ? newOrderId : oldOrderId;
            orders.findByIdForUpdate(first).orElseThrow(); orders.findByIdForUpdate(second).orElseThrow();
            var replacement = orders.findWithItemsById(newOrderId).orElseThrow();
            Integer cancelling = jdbc.queryForObject("select count(*) from transport_trip_cancellations where trip_id=?",Integer.class,replacement.getTransportTripId());
            if (replacement.getStatus()!=OrderStatus.CONFIRMED || (cancelling!=null && cancelling>0)) throw conflict("Chuyến/đơn thay thế đang hủy");
            markFullRefundForTrip(oldOrderId, reason);
        });
        processPaidCancellation(oldOrderId);
    }

    public void completeManualRefund(UUID adminId, UUID orderId, BigDecimal amount,
                                     String reference, String evidenceUrl) {
        if (reference != null && reference.trim().startsWith("AUTO-ORDER-SIM-REFUND-")) throw conflict("Dùng chức năng hoàn mô phỏng thay vì chứng từ thủ công.");
        completeRefund(adminId, orderId, amount, reference, evidenceUrl, false);
    }

    public void completeSimulatedRefund(UUID adminId, UUID orderId, BigDecimal amount, String reference, String evidenceUrl) {
        var audit = jdbc.queryForList("select actor_id,amount from transport_order_refund_requests where order_id=?", orderId);
        if (audit.size()!=1 || !adminId.equals(audit.get(0).get("actor_id")) || amount.compareTo((BigDecimal)audit.get(0).get("amount"))!=0 || !("AUTO-ORDER-SIM-REFUND-"+orderId).equals(reference)) throw conflict("Thiếu hồ sơ duyệt hoàn mô phỏng tin cậy.");
        completeRefund(adminId, orderId, amount, reference, evidenceUrl, true);
    }

    private void completeRefund(UUID adminId, UUID orderId, BigDecimal amount, String reference, String evidenceUrl, boolean simulated) {
        if (adminId == null || amount == null || amount.signum() <= 0 ||
                amount.stripTrailingZeros().scale() > 0 || reference == null || reference.isBlank() ||
                reference.length() > 160 || evidenceUrl == null || evidenceUrl.isBlank() ||
                evidenceUrl.length() > 1000 || !evidenceUrl.trim().startsWith("https://")) throw badRequest("Bằng chứng hoàn tiền không hợp lệ");
        reference = reference.trim();
        evidenceUrl = evidenceUrl.trim();
        if (!simulated && jdbc.queryForObject("select count(*) from transport_order_refund_requests where order_id=? and state in ('REQUESTED','PENDING','COMPLETED')", Integer.class, orderId)>0) throw conflict("Đang có hồ sơ hoàn mô phỏng. Kiểm tra trạng thái trước khi ghi chứng từ khác.");
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getStatus() == OrderStatus.REFUNDED) {
            var proof = jdbc.query("select amount,reference,evidence_url,recorded_by from transport_refund_confirmations where order_id=?",
                    (rs, row) -> new Object[]{rs.getBigDecimal(1), rs.getString(2), rs.getString(3),
                            rs.getObject(4, UUID.class)}, orderId).stream().findFirst().orElse(null);
            if (proof != null && ((BigDecimal) proof[0]).compareTo(amount) == 0 &&
                    reference.equals(proof[1]) && evidenceUrl.equals(proof[2]) && adminId.equals(proof[3])) return;
            throw conflict("Đơn đã có bằng chứng hoàn tiền khác");
        }
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                order.getStatus() != OrderStatus.REFUND_PENDING ||
                order.getTransportRefundDue() == null ||
                amount.compareTo(order.getTransportRefundDue()) != 0) {
            throw conflict("Đơn chưa đủ điều kiện xác nhận đã hoàn tiền");
        }
        Integer activeOperations = jdbc.queryForObject("select count(*) from transport_item_operations where order_id=? and state not in ('COMPLETED','ABORTED')", Integer.class, orderId);
        if (activeOperations != null && activeOperations > 0) throw conflict("Cần hoàn tất nghiệp vụ từng vé trước khi ghi nhận hoàn toàn đơn");
        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            var result = payments.recordManualTransportRefund(orderId,
                    new PaymentClient.ManualTransportRefundRequest(amount, reference, evidenceUrl, adminId));
            if (result == null || !result.isSuccess()) throw conflict("GoPay chưa xác nhận bằng chứng hoàn tiền");
        }
        final String savedReference = reference;
        final String savedEvidence = evidenceUrl;
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() == OrderStatus.REFUNDED) {
                var proofs = jdbc.queryForList("select reference from transport_refund_confirmations where order_id=?", orderId);
                if (proofs.size()==1 && savedReference.equals(proofs.get(0).get("reference"))) return;
                throw conflict("Đơn đã có bằng chứng hoàn tiền khác");
            }
            if (current.getStatus() != OrderStatus.REFUND_PENDING || current.getTransportRefundDue() == null ||
                    current.getTransportRefundDue().compareTo(amount) != 0) throw conflict("Đơn đã đổi trạng thái hoặc số tiền hoàn");
            jdbc.update("insert into transport_refund_confirmations(id,order_id,amount,reference,evidence_url,payment_method,recorded_by,simulated) " +
                            "values (?,?,?,?,?,?,?,?)", UUID.randomUUID(), orderId, amount, savedReference,
                    savedEvidence, current.getPaymentMethod().name(), adminId, simulated);
            if (simulated) {
                current.setTransportRefundSimulated(true);
            }
            if (current.getPaymentMethod() == PaymentMethod.CASH) {
                jdbc.update("insert into transport_cash_refund_outbox(order_id) values (?)", orderId);
            }
            current.setStatus(OrderStatus.REFUNDED);
            orders.save(current);
            TransportNotificationService.enqueue(jdbc, current, "REFUNDED");
        });
    }

    public void openPaidReviewRefund(UUID orderId) {
        var review = transactions.execute(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow(() -> badRequest("Không có order"));
            if (current.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    current.getPaymentMethod() != PaymentMethod.ONLINE ||
                    current.getStatus() != OrderStatus.PAID_REVIEW ||
                    current.getItems().stream().anyMatch(item -> item.getTransportTicketId() != null)) {
                throw conflict("Đơn cần được đối soát vé trước khi hoàn");
            }
            return new ReviewInfo(current.getTransportTripId(), current.getTotalAmount());
        });
        var payment = paymentStatusOrNull(orderId);
        if (payment == null || payment.getData() == null || payment.getData().status() == null ||
                !List.of("COMPLETED", "PAID_REVIEW").contains(payment.getData().status()) ||
                payment.getData().amount() == null ||
                payment.getData().amount().compareTo(review.amount()) != 0) {
            throw conflict("GoPay chưa xác nhận tiền đã thu");
        }
        var holdResponse = inventory.orderStatus(orderId);
        var hold = holdResponse == null ? null : holdResponse.getData();
        if (hold == null || !review.tripId().equals(hold.tripId()) || "SOLD".equals(hold.status())) {
            throw conflict("Ghế cần được đối soát trước khi hoàn");
        }
        if ("HELD".equals(hold.status())) {
            var released = inventory.releaseUnpaid(orderId);
            if (released == null || !released.isSuccess()) throw conflict("Chưa nhả được ghế");
        } else if (hold.status() == null ||
                !List.of("RELEASED", "EXPIRED", "CANCELLED").contains(hold.status())) {
            throw conflict("Trạng thái ghế cần đối soát");
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.PAID_REVIEW ||
                    current.getItems().stream().anyMatch(item -> item.getTransportTicketId() != null)) {
                throw conflict("Order đã đổi trạng thái");
            }
            current.setTransportCancellationFee(BigDecimal.ZERO);
            current.setTransportRefundDue(current.getTotalAmount());
            current.setTransportCancellationReason("Đã thu tiền nhưng không cấp được ghế");
            current.setStatus(OrderStatus.REFUND_PENDING);
            orders.save(current);
            TransportNotificationService.enqueue(jdbc, current, "CANCELLED");
        });
    }

    public Page<com.GoTravel.CartandOrder.dto.response.OrderResponse> attention(Pageable pageable) {
        var bounded = PageRequest.of(Math.max(0, pageable.getPageNumber()),
                Math.min(100, Math.max(1, pageable.getPageSize())));
        return orders.findByOrderKindAndStatusInOrderByCreatedAtAsc(OrderKind.GOCAR_TICKET,
                List.of(OrderStatus.PAID_REVIEW, OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION,
                        OrderStatus.CANCELLATION_PENDING, OrderStatus.REFUND_PENDING,
                        OrderStatus.FULFILLMENT_PENDING), bounded).map(mapper::toOrderResponse);
    }

    private record ReviewInfo(UUID tripId, BigDecimal amount) {}

    public void fulfill(UUID orderId) {
        var order = orders.findWithItemsById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getStatus() != OrderStatus.FULFILLMENT_PENDING &&
                order.getStatus() != OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION) return;
        try {
            var sold = inventory.confirm(orderId);
            if (sold == null || !sold.isSuccess()) throw new IllegalStateException("Inventory chưa chốt ghế");
        } catch (FeignException.Conflict expired) {
            transactions.executeWithoutResult(status -> {
                var current = orders.findByIdForUpdate(orderId).orElseThrow();
                if (current.getStatus() == OrderStatus.FULFILLMENT_PENDING) {
                    current.setStatus(OrderStatus.PAID_REVIEW);
                    orders.save(current);
                }
            });
            throw conflict("Ghế đã hết hạn; cần hoàn/đối soát tiền");
        }
        var ticketRequest = transactions.execute(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            return new GoCarClient.IssueTicketRequest(orderId, current.getItems().stream()
                    .map(item -> new GoCarClient.TicketItem(item.getId(), item.getTransportTripId(),
                            item.getTransportSeatId(), item.getPassengerName(),
                            item.getPickupStopId(), item.getDropoffStopId()))
                    .toList());
        });
        var ticketResponse = car.issueTickets(ticketRequest);
        if (ticketResponse == null || !ticketResponse.isSuccess() || ticketResponse.getData() == null ||
                ticketResponse.getData().size() != ticketRequest.items().size()) {
            throw new IllegalStateException("GoCar chưa phát hành đủ vé");
        }
        Map<UUID, GoCarClient.TicketResult> issued = new HashMap<>();
        for (var ticket : ticketResponse.getData()) {
            if (ticket.checkInToken() == null || ticket.checkInToken().isBlank() ||
                    issued.put(ticket.orderItemId(), ticket) != null) {
                throw new IllegalStateException("Vé không có mã check-in hợp lệ");
            }
        }
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.FULFILLMENT_PENDING &&
                    current.getStatus() != OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION) return;
            for (var item : current.getItems()) {
                var ticket = issued.get(item.getId());
                if (ticket == null) throw new IllegalStateException("Thiếu vé cho ghế");
                item.setTransportTicketId(ticket.ticketId());
                item.setTransportCheckInToken(ticket.checkInToken());
            }
            current.setStatus(OrderStatus.CONFIRMED);
            orders.save(current);
            TransportNotificationService.enqueue(jdbc, current, "TICKET");
        });
    }

    public FulfillmentSummary fulfillmentSummary(UUID orderId) {
        return transactions.execute(status -> {
            var order = orders.findByIdForUpdate(orderId)
                    .orElseThrow(() -> badRequest("Không có order"));
            if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    (order.getStatus() != OrderStatus.FULFILLMENT_PENDING &&
                            order.getStatus() != OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION &&
                            order.getStatus() != OrderStatus.CONFIRMED &&
                            order.getStatus() != OrderStatus.COMPLETED &&
                            !(order.getStatus() == OrderStatus.CANCELLATION_PENDING &&
                                    order.getTransportRefundDue() != null))) {
                throw conflict("Order chưa đủ điều kiện phát vé");
            }
            return new FulfillmentSummary(order.getId(), order.getTransportTripId(),
                    order.getStatus().name(), order.getPaymentMethod().name(),
                    order.getItems().stream().map(item -> new FulfillmentItem(
                            item.getId(), item.getTransportSeatId(), item.getPassengerName(),
                            item.getPickupStopId(), item.getDropoffStopId(),item.getTransportTripId(),item.getTransportItemState(),item.getTransportBoardingStatus(),item.getTransportTicketRevision())).toList());
        });
    }

    public record FulfillmentSummary(UUID orderId, UUID tripId, String status,
                                     String paymentMethod, List<FulfillmentItem> items) {}
    public record FulfillmentItem(UUID orderItemId, UUID seatId, String passengerName,
                                  UUID pickupStopId, UUID dropoffStopId,UUID tripId,String itemState,String boardingStatus,Integer ticketRevision) {}

    @Scheduled(fixedDelay = 30000)
    public void reconcile() {
        // An interrupted checkout may leave PENDING before it ever receives a hold.
        for (UUID id : jdbc.query("select id from orders where order_kind='GOCAR_TICKET' and status='PENDING' " +
                "and created_at < now() - interval '2 minutes' order by created_at limit 50",
                (rs,row) -> rs.getObject(1,UUID.class))) {
            try {
                transactions.executeWithoutResult(status -> {
                    var current = orders.findByIdForUpdate(id).orElseThrow();
                    if (current.getStatus() == OrderStatus.PENDING) {
                        current.setStatus(OrderStatus.CANCELLATION_PENDING); orders.save(current);
                    }
                });
                tryRelease(id);
            } catch (Exception error) { log.warn("Interrupted checkout {} retained for cleanup", id); }
        }
        for (var order : orders.findTop50ByOrderKindAndStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                OrderKind.GOCAR_TICKET, OrderStatus.PAYMENT_PENDING, LocalDateTime.now(VN_ZONE))) {
            try {
                var payment = paymentStatusOrNull(order.getId());
                if (payment != null && payment.getData() != null &&
                        "COMPLETED".equals(payment.getData().status())) paymentSuccess(order.getId());
                else paymentFailed(order.getId());
            } catch (Exception error) {
                log.warn("Transport expired order pending for {}", order.getId(), error);
            }
        }
        for (var order : orders.findTop50ByOrderKindAndStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                OrderKind.GOCAR_TICKET, OrderStatus.CASH_PENDING, LocalDateTime.now(VN_ZONE))) {
            try {
                cancelCashUnpaid(order.getTransportCashierId(), order.getId());
            } catch (Exception error) {
                log.warn("Expired cash hold pending for {}", order.getId(), error);
            }
        }
        for (var order : orders.findTop50ByOrderKindAndStatusOrderByCreatedAtAsc(
                OrderKind.GOCAR_TICKET, OrderStatus.FULFILLMENT_PENDING)) {
            try {
                fulfill(order.getId());
            } catch (Exception error) {
                log.warn("Transport fulfillment pending for order {}", order.getId(), error);
            }
        }
        for (var order : orders.findTop50ByOrderKindAndStatusOrderByCreatedAtAsc(
                OrderKind.GOCAR_TICKET, OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION)) {
            try {
                fulfill(order.getId());
            } catch (Exception error) {
                log.warn("Cash fulfillment pending for order {}", order.getId(), error);
            }
        }
        for (var order : orders.findTop50ByOrderKindAndStatusOrderByCreatedAtAsc(
                OrderKind.GOCAR_TICKET, OrderStatus.CANCELLATION_PENDING)) {
            if (order.getTransportRefundDue() != null) {
                try {
                    processPaidCancellation(order.getId());
                } catch (Exception error) {
                    log.warn("Paid transport cancellation pending for {}", order.getId(), error);
                }
            } else {
                tryRelease(order.getId());
            }
        }
    }

    private void tryRelease(UUID orderId) {
        try {
            var released = inventory.releaseUnpaid(orderId);
            if (released == null || !released.isSuccess()) throw new IllegalStateException("Inventory did not release");
            transactions.executeWithoutResult(status -> {
                var current = orders.findByIdForUpdate(orderId).orElseThrow();
                if (current.getTransportRefundDue() == null &&
                        current.getStatus() != OrderStatus.CONFIRMED &&
                        current.getStatus() != OrderStatus.FULFILLMENT_PENDING &&
                        current.getStatus() != OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION) {
                    current.setStatus(OrderStatus.CANCELLED);
                    orders.save(current);
                }
            });
        } catch (Exception error) {
            log.warn("Transport seat release pending for order {}", orderId, error);
        }
    }

    private com.GoTravel.CartandOrder.dto.response.ApiResponse<PaymentClient.PaymentStatusResponse>
    paymentStatusOrNull(UUID orderId) {
        try {
            return payments.getPaymentStatus(orderId);
        } catch (FeignException.NotFound missing) {
            return null;
        }
    }

    private com.GoTravel.CartandOrder.dto.response.OrderResponse priorCheckout(
            Order prior, String requestHash, PaymentMethod method) {
        if (!requestHash.equals(prior.getTransportRequestHash()) ||
                prior.getPaymentMethod() != method ||
                prior.getStatus() != (method == PaymentMethod.CASH
                        ? OrderStatus.CASH_PENDING : OrderStatus.PAYMENT_PENDING)) {
            throw conflict("Idempotency key đã dùng cho yêu cầu khác hoặc đơn chưa sẵn sàng");
        }
        return mapper.toOrderResponse(prior);
    }

    private String requestHash(TransportCheckoutRequest request) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, request.tripId());
        append(canonical, request.fullName());
        append(canonical, request.email());
        append(canonical, request.phone());
        for (var passenger : request.passengers()) {
            append(canonical, passenger.seatId());
            append(canonical, passenger.name());
            append(canonical, passenger.pickupStopId());
            append(canonical, passenger.dropoffStopId());
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    private void append(StringBuilder out, Object value) {
        String text = value == null ? "" : value.toString();
        out.append(text.length()).append(':').append(text);
    }

    private void validateQuote(TransportQuote quote, TransportCheckoutRequest request) {
        if (quote == null || !request.tripId().equals(quote.tripId()) ||
                quote.listingId() == null || quote.operatorUserId() == null ||
                quote.quoteId() == null || quote.quoteVersion() == null || quote.quoteHash() == null ||
                !quote.quoteVersion().matches("[a-f0-9]{64}") || !quote.quoteHash().matches("[a-f0-9]{64}") ||
                quote.departureAt() == null || quote.expiresAt() == null ||
                !quote.expiresAt().isAfter(Instant.now()) ||
                quote.totalAmount() == null || quote.totalAmount().compareTo(BigDecimal.ZERO) <= 0 ||
                !"VND".equals(quote.currency()) || quote.seats() == null ||
                quote.seats().size() != request.passengers().size() ||
                quote.seats().stream().anyMatch(seat -> seat.price() == null || seat.price().signum() <= 0 ||
                    seat.price().stripTrailingZeros().scale() > 0)) {
            throw conflict("Báo giá chuyến không hợp lệ");
        }
        var requested = request.passengers().stream().map(TransportCheckoutRequest.Passenger::seatId)
                .collect(java.util.stream.Collectors.toSet());
        var quoted = quote.seats().stream().map(TransportQuote.SeatQuote::seatId)
                .collect(java.util.stream.Collectors.toSet());
        var sum = quote.seats().stream().map(TransportQuote.SeatQuote::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (!requested.equals(quoted) || requested.size() != quote.seats().size() ||
                sum.compareTo(quote.totalAmount()) != 0) {
            throw conflict("Ghế hoặc tổng tiền báo giá không khớp");
        }
    }

    public org.springframework.data.domain.Page<com.GoTravel.CartandOrder.dto.response.OrderResponse> listVendorOrders(
            UUID actorId, UUID operatorId, OrderStatus status, UUID tripId, PaymentMethod method,String search,java.time.LocalDate from,java.time.LocalDate to,org.springframework.data.domain.Pageable pageable) {
        var response = car.readScope(actorId, operatorId);
        if (response == null || !response.isSuccess() || response.getData() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập đơn của nhà xe");
        }
        var scope = response.getData();
        if(search!=null&&search.length()>120)throw badRequest("Từ khóa quá dài");
        if(from!=null&&to!=null&&to.isBefore(from))throw badRequest("Khoảng ngày không hợp lệ");
        if(!scope.allTrips()&&(scope.allowedTripIds()==null||scope.allowedTripIds().isEmpty()))return org.springframework.data.domain.Page.empty(pageable);
        var orderPage=orders.findAll((org.springframework.data.jpa.domain.Specification<Order>)(root,query,cb)->{
            query.distinct(true);var predicates=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("orderKind"),OrderKind.GOCAR_TICKET));predicates.add(cb.equal(root.get("hostId"),scope.ownerUserId()));
            var items=root.join("items");
            if(!scope.allTrips())predicates.add(items.get("transportTripId").in(scope.allowedTripIds()));
            if(tripId!=null)predicates.add(cb.equal(items.get("transportTripId"),tripId));
            if(status!=null)predicates.add(cb.equal(root.get("status"),status));if(method!=null)predicates.add(cb.equal(root.get("paymentMethod"),method));
            if(from!=null)predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),from.atStartOfDay()));
            if(to!=null)predicates.add(cb.lessThan(root.get("createdAt"),to.plusDays(1).atStartOfDay()));
            if(search!=null&&!search.isBlank()){String term="%"+search.trim().toLowerCase(java.util.Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("orderNumber")),term,'\\'),cb.like(cb.lower(items.get("passengerName")),term,'\\'),
                        cb.like(cb.lower(((org.hibernate.query.criteria.JpaExpression<UUID>)root.<UUID>get("id")).cast(String.class)),term,'\\'),
                        cb.like(cb.lower(cb.function("jsonb_extract_path_text",String.class,root.get("customerInfo"),cb.literal("phone"))),term,'\\'),
                        cb.like(cb.lower(cb.function("jsonb_extract_path_text",String.class,root.get("customerInfo"),cb.literal("fullName"))),term,'\\'),
                        cb.like(cb.lower(cb.function("jsonb_extract_path_text",String.class,root.get("customerInfo"),cb.literal("email"))),term,'\\')));}
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(),pageable.getPageSize(),org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,"createdAt")));
        return orderPage.map(order -> scopedVendorResponse(order,scope));
    }

    public com.GoTravel.CartandOrder.dto.response.OrderResponse getVendorOrderDetail(UUID actorId, UUID orderId) {
        return getVendorOrderDetail(actorId, orderId, null);
    }

    public com.GoTravel.CartandOrder.dto.response.OrderResponse getVendorOrderDetail(UUID actorId, UUID orderId, UUID operatorId) {
        var order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không phải đơn vé xe");
        }
        var response = car.readScope(actorId, operatorId);
        if (response == null || !response.isSuccess() || response.getData() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập đơn này");
        }
        var scope = response.getData();
        if (!order.getHostId().equals(scope.ownerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn không thuộc nhà xe được phân quyền");
        }
        if (!scope.allTrips()) {
            if (scope.allowedTripIds() == null || order.getItems().stream().noneMatch(i->scope.allowedTripIds().contains(i.getTransportTripId()))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn nằm ngoài phạm vi chuyến được phân công");
            }
        }
        return scopedVendorResponse(order,scope);
    }

    public record CounterTicketDocument(UUID orderId,String orderNumber,UUID itemId,UUID ticketId,String passengerName,String routeTitle,UUID tripId,String seatCode,UUID pickupStopId,UUID dropoffStopId,LocalDateTime departureAt,int revision,String checkInToken){}
    public CounterTicketDocument counterTicket(UUID actorId,UUID orderId,UUID itemId){
        var order=orders.findWithItemsById(orderId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(order.getOrderKind()!=OrderKind.GOCAR_TICKET || order.getPaymentMethod()!=PaymentMethod.CASH || cashLedger.findReceipt(orderId)==null)throw conflict("Chỉ cấp chứng từ vé cho đơn tiền mặt đã thực thu");
        var item=order.getItems().stream().filter(i->i.getId().equals(itemId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        var authorized=car.authorizeStaff(actorId,item.getTransportTripId(),"SELL_CASH");
        if(authorized==null||!authorized.isSuccess()||authorized.getData()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(!"ACTIVE".equals(item.getTransportItemState()) || item.getTransportTicketId()==null || item.getTransportCheckInToken()==null)throw conflict("Vé chưa phát hành hoặc đã đổi/hủy");
        return new CounterTicketDocument(orderId,order.getOrderNumber(),itemId,item.getTransportTicketId(),item.getPassengerName(),item.getListingTitle(),item.getTransportTripId(),item.getTransportSeatCode(),item.getPickupStopId(),item.getDropoffStopId(),item.getTransportDepartureAt(),item.getTransportTicketRevision(),item.getTransportCheckInToken());
    }

    private com.GoTravel.CartandOrder.dto.response.OrderResponse scopedVendorResponse(Order order,GoCarClient.StaffReadScope scope){
        var response=toVendorOrderResponse(order);
        if(!scope.allTrips()){
          response.setItems(response.getItems().stream().filter(i->scope.allowedTripIds().contains(i.getTransportTripId())).toList());
          response.setTotalAmount(null);
          response.setTransportOriginalChargeVnd(null);
          response.setTransportActiveFareAmount(response.getItems().stream().filter(i->List.of("ACTIVE","OPERATION_PENDING","COMPLETED").contains(i.getTransportItemState())).map(com.GoTravel.CartandOrder.dto.response.OrderResponse.OrderItemResponse::getTotalPrice).reduce(BigDecimal.ZERO,BigDecimal::add));
        }
        return response;
    }
    public com.GoTravel.CartandOrder.dto.response.OrderResponse toVendorOrderResponse(Order order) {
        var res = mapper.toOrderResponse(order);
        if (res != null && res.getItems() != null) {
            for (var item : res.getItems()) {
                item.setTransportCheckInToken(null);
            }
        }
        return res;
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
