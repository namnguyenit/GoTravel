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

    public com.GoTravel.CartandOrder.dto.response.OrderResponse checkout(
            UUID userId, String idempotencyKey, TransportCheckoutRequest request) {
        return checkoutInternal(userId, null, null, PaymentMethod.ONLINE, idempotencyKey, request);
    }

    public com.GoTravel.CartandOrder.dto.response.OrderResponse checkoutCash(
            UUID cashierId, String idempotencyKey, TransportCheckoutRequest request) {
        if (cashierId == null || request == null || request.tripId() == null)
            throw badRequest("Nhân viên hoặc chuyến không hợp lệ");
        var staff = car.authorizeStaff(cashierId, request.tripId(), "SELL_CASH").getData();
        var shift = cashLedger.active(cashierId);
        if (staff == null || shift == null || !shift.operatorId().equals(staff.operatorId()))
            throw conflict("Nhân viên chưa có ca thu tiền của nhà xe");
        return checkoutInternal(null, cashierId, shift.id(), PaymentMethod.CASH, idempotencyKey, request);
    }

    private com.GoTravel.CartandOrder.dto.response.OrderResponse checkoutInternal(
            UUID userId, UUID cashierId, UUID shiftId, PaymentMethod method,
            String idempotencyKey, TransportCheckoutRequest request) {
        if ((method == PaymentMethod.ONLINE && userId == null) ||
                (method == PaymentMethod.CASH && (cashierId == null || shiftId == null)) ||
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
            var activeShift = cashLedger.active(cashierId);
            if (staff == null || !staff.operatorId().equals(quote.operatorId()) ||
                    activeShift == null || !shiftId.equals(activeShift.id())) {
                throw conflict("Ca thu tiền hoặc nhà xe không khớp chuyến");
            }
        }
        var catalogResponse = catalog.getListingDetail(quote.listingId());
        var offer = catalogResponse == null ? null : catalogResponse.getData();
        if (offer == null || !"TRANSPORT".equals(offer.getCategory()) ||
                !"ACTIVE".equals(offer.getStatus()) ||
                !quote.operatorUserId().equals(offer.getHostId())) {
            throw conflict("Tuyến chưa mở bán trong Catalog");
        }
        Order order;
        try {
            order = transactions.execute(status -> {
                var created = Order.builder()
                        .userId(userId)
                        .hostId(quote.operatorUserId())
                        .orderKind(OrderKind.GOCAR_TICKET)
                        .paymentMethod(method)
                        .transportTripId(quote.tripId())
                        .transportIdempotencyKey(idempotencyKey)
                        .transportRequestHash(requestHash)
                        .transportCashierId(cashierId)
                        .transportCashShiftId(shiftId)
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
            if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
                    order.getStatus() == OrderStatus.PAID_REVIEW) return;
            if (order.getStatus() != OrderStatus.PAYMENT_PENDING ||
                    order.getExpiresAt() == null || trusted.paidAt().isAfter(order.getExpiresAt())) {
                order.setStatus(OrderStatus.PAID_REVIEW);
            } else {
                order.setStatus(OrderStatus.FULFILLMENT_PENDING);
            }
            orders.save(order);
        });
        var state = orders.findById(orderId).orElseThrow().getStatus();
        if (state == OrderStatus.PAID_REVIEW) throw conflict("Tiền đã nhận nhưng ghế cần đối soát");
        if (state == OrderStatus.FULFILLMENT_PENDING) fulfill(orderId);
    }

    public void paymentFailed(UUID orderId) {
        var paymentOrder = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (paymentOrder.getPaymentMethod() != PaymentMethod.ONLINE) {
            throw conflict("Đơn tiền mặt không nhận callback GoPay");
        }
        var payment = paymentStatusOrNull(orderId);
        if (payment != null && payment.getData() != null &&
                "COMPLETED".equals(payment.getData().status())) return;
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.FULFILLMENT_PENDING ||
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
            if (current.getStatus() == OrderStatus.CONFIRMED ||
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
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
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

    public void cancelPaid(UUID actorId, UUID orderId, String reason) {
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
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
        var quote = cancellationPolicy.quote(order);
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.CONFIRMED) throw conflict("Order đã đổi trạng thái");
            Integer activeExchange = jdbc.queryForObject("select count(*) from transport_exchange_cases " +
                            "where (new_order_id=? or old_order_id=?) and status='PROCESSING'",
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
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
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
            }
        });
    }

    /** Called only by the durable trip-cancellation coordinator after sale was disabled. */
    public void cancelForTrip(UUID orderId, UUID tripId, String reason) {
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                !tripId.equals(order.getTransportTripId())) throw conflict("Order không thuộc chuyến cần hủy");
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

    public void cancelForExchange(UUID oldOrderId, String reason) {
        var order = orders.findById(oldOrderId).orElseThrow(() -> badRequest("Không có đơn cũ"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                order.getPaymentMethod() != PaymentMethod.ONLINE ||
                (order.getStatus() != OrderStatus.CONFIRMED &&
                        order.getStatus() != OrderStatus.CANCELLATION_PENDING &&
                        order.getStatus() != OrderStatus.REFUND_PENDING &&
                        order.getStatus() != OrderStatus.REFUNDED)) {
            throw conflict("Đơn cũ không đủ điều kiện đổi vé");
        }
        if (order.getStatus() == OrderStatus.REFUND_PENDING || order.getStatus() == OrderStatus.REFUNDED) return;
        markFullRefundForTrip(oldOrderId, reason);
        processPaidCancellation(oldOrderId);
    }

    public void completeManualRefund(UUID adminId, UUID orderId, BigDecimal amount,
                                     String reference, String evidenceUrl) {
        if (adminId == null || amount == null || amount.signum() <= 0 ||
                amount.stripTrailingZeros().scale() > 0 || reference == null || reference.isBlank() ||
                reference.length() > 160 || evidenceUrl == null || evidenceUrl.isBlank() ||
                evidenceUrl.length() > 1000) throw badRequest("Bằng chứng hoàn tiền không hợp lệ");
        reference = reference.trim();
        evidenceUrl = evidenceUrl.trim();
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
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
        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            var result = payments.recordManualTransportRefund(orderId,
                    new PaymentClient.ManualTransportRefundRequest(amount, reference, evidenceUrl, adminId));
            if (result == null || !result.isSuccess()) throw conflict("GoPay chưa xác nhận bằng chứng hoàn tiền");
        }
        final String savedReference = reference;
        final String savedEvidence = evidenceUrl;
        transactions.executeWithoutResult(status -> {
            var current = orders.findByIdForUpdate(orderId).orElseThrow();
            if (current.getStatus() != OrderStatus.REFUND_PENDING) throw conflict("Đơn đã đổi trạng thái");
            jdbc.update("insert into transport_refund_confirmations(id,order_id,amount,reference,evidence_url,payment_method,recorded_by) " +
                            "values (?,?,?,?,?,?,?)", UUID.randomUUID(), orderId, amount, savedReference,
                    savedEvidence, current.getPaymentMethod().name(), adminId);
            if (current.getPaymentMethod() == PaymentMethod.CASH) {
                jdbc.update("insert into transport_cash_refund_outbox(order_id) values (?)", orderId);
            }
            current.setStatus(OrderStatus.REFUNDED);
            orders.save(current);
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
        var order = orders.findById(orderId).orElseThrow(() -> badRequest("Không có order"));
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
                            !(order.getStatus() == OrderStatus.CANCELLATION_PENDING &&
                                    order.getTransportRefundDue() != null))) {
                throw conflict("Order chưa đủ điều kiện phát vé");
            }
            return new FulfillmentSummary(order.getId(), order.getTransportTripId(),
                    order.getStatus().name(), order.getPaymentMethod().name(),
                    order.getItems().stream().map(item -> new FulfillmentItem(
                            item.getId(), item.getTransportSeatId(), item.getPassengerName(),
                            item.getPickupStopId(), item.getDropoffStopId())).toList());
        });
    }

    public record FulfillmentSummary(UUID orderId, UUID tripId, String status,
                                     String paymentMethod, List<FulfillmentItem> items) {}
    public record FulfillmentItem(UUID orderItemId, UUID seatId, String passengerName,
                                  UUID pickupStopId, UUID dropoffStopId) {}

    @Scheduled(fixedDelay = 30000)
    public void reconcile() {
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
                quote.departureAt() == null || quote.expiresAt() == null ||
                !quote.expiresAt().isAfter(Instant.now()) ||
                quote.totalAmount() == null || quote.totalAmount().compareTo(BigDecimal.ZERO) <= 0 ||
                !"VND".equals(quote.currency()) || quote.seats() == null ||
                quote.seats().size() != request.passengers().size()) {
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

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
