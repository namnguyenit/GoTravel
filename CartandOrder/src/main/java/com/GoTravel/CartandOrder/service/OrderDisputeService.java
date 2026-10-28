package com.GoTravel.CartandOrder.service;

import com.GoTravel.CartandOrder.client.CommunicationClient;
import com.GoTravel.CartandOrder.client.InventoryClient;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.dto.request.CreateOrderDisputeRequest;
import com.GoTravel.CartandOrder.dto.request.ForceCancelOrderRequest;
import com.GoTravel.CartandOrder.dto.request.RefundEmailRequest;
import com.GoTravel.CartandOrder.dto.request.RefundOrderRequest;
import com.GoTravel.CartandOrder.dto.request.ResolveOrderDisputeRequest;
import com.GoTravel.CartandOrder.dto.response.OrderDisputeResponse;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.entity.OrderDispute;
import com.GoTravel.CartandOrder.enums.DisputeStatus;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.exeption.AppException;
import com.GoTravel.CartandOrder.exeption.OrderErrorCode;
import com.GoTravel.CartandOrder.repository.OrderDisputeRepository;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderDisputeService {
    private final OrderDisputeRepository disputeRepository;
    private final OrderRepository orderRepository;
    private final PaymentClient paymentClient;
    private final InventoryClient inventoryClient;
    private final CommunicationClient communicationClient;
    private final jakarta.persistence.EntityManager entityManager;

    @Value("${frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    private static final List<DisputeStatus> ACTIVE_STATUSES = List.of(DisputeStatus.OPEN, DisputeStatus.IN_REVIEW);

    @Transactional
    public OrderDisputeResponse createDispute(UUID userId, CreateOrderDisputeRequest request) {
        Order order = orderRepository.findByIdForUpdate(request.getOrderId()).filter(candidate -> candidate.getUserId().equals(userId))
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));

        boolean transportSupport = order.getOrderKind() == com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET
                && (List.of(OrderStatus.PAID_REVIEW, OrderStatus.REFUND_PENDING, OrderStatus.REFUNDED,
                    OrderStatus.CANCELLATION_PENDING, OrderStatus.FULFILLMENT_PENDING,
                    OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION).contains(order.getStatus())
                    || (order.getStatus() == OrderStatus.CANCELLED && order.getItems().stream().anyMatch(item -> item.getTransportTicketId() != null)));
        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.COMPLETED && !transportSupport) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }

        disputeRepository.findFirstByOrderIdAndStatusIn(order.getId(), ACTIVE_STATUSES)
                .ifPresent(existing -> {
                    throw new AppException(OrderErrorCode.DISPUTE_ALREADY_OPEN);
                });

        OrderDispute dispute = OrderDispute.builder()
                .orderId(order.getId())
                .userId(userId)
                .reason(request.getReason().trim())
                .description(request.getDescription())
                .status(DisputeStatus.OPEN)
                .build();

        return toResponse(disputeRepository.save(dispute), order);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getMyDisputes(UUID userId, Pageable pageable) {
        return disputeRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable) {
        Page<OrderDispute> page = status == null
                ? disputeRepository.findAllByOrderByCreatedAtDesc(pageable)
                : disputeRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return page.map(this::toResponse);
    }

    private org.springframework.data.jpa.domain.Specification<OrderDispute> scope(com.GoTravel.CartandOrder.enums.OrderKind kind) {
        return (root, query, builder) -> {
            if (kind == null) return builder.conjunction();
            var sub = query.subquery(UUID.class);
            var order = sub.from(Order.class);
            sub.select(order.get("id")).where(builder.equal(order.get("orderKind"), kind));
            return root.get("orderId").in(sub);
        };
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getMyDisputes(UUID userId, Pageable pageable, com.GoTravel.CartandOrder.enums.OrderKind kind) {
        return getMyDisputes(userId, pageable, kind, null, null);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getMyDisputes(UUID userId, Pageable pageable, com.GoTravel.CartandOrder.enums.OrderKind kind,
                                                   DisputeStatus status, String search) {
        var selected = scope(kind).and((root, query, builder) -> builder.equal(root.get("userId"), userId));
        if (status != null) selected = selected.and((root, query, builder) -> builder.equal(root.get("status"), status));
        return disputeRepository.findAll(selected.and(searchSpec(search)), bounded(pageable)).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable, com.GoTravel.CartandOrder.enums.OrderKind kind) {
        return getAdminDisputes(status, pageable, kind, false);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable, com.GoTravel.CartandOrder.enums.OrderKind kind, boolean active) {
        return getAdminDisputes(status, pageable, kind, active, null);
    }

    @Transactional(readOnly = true)
    public Page<OrderDisputeResponse> getAdminDisputes(DisputeStatus status, Pageable pageable, com.GoTravel.CartandOrder.enums.OrderKind kind, boolean active, String search) {
        var selected = scope(kind);
        if (status != null) selected = selected.and((root, query, builder) -> builder.equal(root.get("status"), status));
        else if (active) selected = selected.and((root, query, builder) -> root.get("status").in(ACTIVE_STATUSES));
        return disputeRepository.findAll(selected.and(searchSpec(search)), bounded(pageable)).map(this::toResponse);
    }

    private org.springframework.data.jpa.domain.Specification<OrderDispute> searchSpec(String search) {
        if (search == null || search.isBlank()) return (root, query, builder) -> builder.conjunction();
        String keyword = search.trim().toLowerCase(java.util.Locale.ROOT);
        if (keyword.length() > 120) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Từ khóa quá dài");
        String pattern = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        return (root, query, builder) -> {
            var sub = query.subquery(UUID.class);
            var order = sub.from(Order.class);
            sub.select(order.get("id")).where(builder.or(
                    builder.like(builder.lower(order.get("orderNumber")), pattern, '!'),
                    builder.like(builder.lower(builder.function("jsonb_extract_path_text", String.class, order.get("customerInfo"), builder.literal("fullName"))), pattern, '!'),
                    builder.like(builder.lower(builder.function("jsonb_extract_path_text", String.class, order.get("customerInfo"), builder.literal("email"))), pattern, '!')));
            return builder.or(root.get("orderId").in(sub),
                    builder.like(builder.lower(root.get("reason")), pattern, '!'),
                    builder.like(builder.lower(root.get("description")), pattern, '!'),
                    builder.like(builder.lower(((org.hibernate.query.criteria.JpaExpression<UUID>)root.<UUID>get("orderId")).cast(String.class)), pattern, '!'),
                    builder.like(builder.lower(((org.hibernate.query.criteria.JpaExpression<UUID>)root.<UUID>get("id")).cast(String.class)), pattern, '!'));
        };
    }

    private Pageable bounded(Pageable page) {
        return org.springframework.data.domain.PageRequest.of(Math.max(0, page.getPageNumber()),
                Math.min(100, Math.max(1, page.getPageSize())), org.springframework.data.domain.Sort.by(
                    org.springframework.data.domain.Sort.Order.desc("createdAt"), org.springframework.data.domain.Sort.Order.desc("id")));
    }

    @Transactional
    public OrderDisputeResponse resolveTransportDispute(UUID actor, UUID id, ResolveOrderDisputeRequest request) {
        var dispute = disputeRepository.findById(id).orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        var order = orderRepository.findById(dispute.getOrderId()).orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        if (order.getOrderKind() != com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET)
            throw new AppException(OrderErrorCode.ORDER_NOT_FOUND);
        return resolveDispute(actor, id, request);
    }

    @Transactional
    public OrderDisputeResponse resolveDispute(UUID adminId, UUID disputeId, ResolveOrderDisputeRequest request) {
        var original = disputeRepository.findById(disputeId).orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        // Serialize with claim creation and other resolutions on this order.
        Order order = orderRepository.findByIdForUpdate(original.getOrderId()).orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        entityManager.refresh(original);
        var dispute = original;
        if (!ACTIVE_STATUSES.contains(dispute.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Phiếu đã đóng, không thể xử lý lại");
        String action = request.getAction().trim().toUpperCase(java.util.Locale.ROOT);
        if (!List.of("IN_REVIEW", "RESOLVE", "REJECT", "REFUND").contains(action))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Hành động xử lý không hợp lệ");
        if (order.getOrderKind() == com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET &&
                (request.getAdminNote() == null || request.getAdminNote().isBlank()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cần nội dung phản hồi cho khách hàng");
        if ("REFUND".equals(action)) {
            if (order.getOrderKind() == com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET) {
                if (order.getStatus() != OrderStatus.REFUNDED)
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Đơn vé chưa hoàn tiền xong; xử lý qua nghiệp vụ hoàn tiền và ghi chứng từ trước");
            } else forceCancelAndRefund(order, request.getAdminNote());
            dispute.setStatus(DisputeStatus.REFUNDED);
        } else if ("REJECT".equals(action)) dispute.setStatus(DisputeStatus.REJECTED);
        else if ("IN_REVIEW".equals(action)) dispute.setStatus(DisputeStatus.IN_REVIEW);
        else dispute.setStatus(DisputeStatus.RESOLVED);
        dispute.setAdminNote(request.getAdminNote() == null ? null : request.getAdminNote().trim());
        dispute.setResolvedBy(adminId);
        dispute.setResolvedAt("IN_REVIEW".equals(action) ? null : LocalDateTime.now());
        return toResponse(disputeRepository.save(dispute), order);
    }

    @Transactional
    public void forceCancelOrder(UUID orderId, ForceCancelOrderRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        forceCancelAndRefund(order, request == null ? null : request.getReason());
    }

    private void forceCancelAndRefund(Order order, String reason) {
        if (order.getOrderKind() == com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }
        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.COMPLETED) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }

        paymentClient.refundOrder(order.getId(), RefundOrderRequest.builder()
                .reason(reason)
                .build());
        sendRefundSuccessEmail(order, reason);

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        try {
            inventoryClient.cancelLock(order.getId());
        } catch (Exception e) {
            log.warn("Failed to release inventory while force-canceling order {}", order.getId(), e);
        }
    }

    private void sendRefundSuccessEmail(Order order, String reason) {
        Order.CustomerInfo customer = order.getCustomerInfo();
        String recipient = customer == null ? null : customer.getEmail();
        if (recipient == null || recipient.isBlank()) {
            log.warn("Skip refund email for order {} because customer email is missing", order.getId());
            return;
        }

        try {
            communicationClient.sendRefundEmail(buildRefundEmailRequest(order, reason, recipient));
            log.info("Refund success email sent for order {} to {}", order.getId(), recipient);
        } catch (Exception e) {
            log.error("Failed to send refund success email for order {} to {}", order.getId(), recipient, e);
        }
    }

    private RefundEmailRequest buildRefundEmailRequest(Order order, String reason, String recipient) {
        Order.CustomerInfo customer = order.getCustomerInfo();
        String orderUrl = frontendBaseUrl.replaceAll("/+$", "") + "/orders/completed?orderId=" + order.getId();

        return RefundEmailRequest.builder()
                .to(recipient)
                .customerName(customer == null ? null : customer.getFullName())
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .refundAmount(order.getTotalAmount())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .reason(reason)
                .orderUrl(orderUrl)
                .items(order.getItems().stream().map(item -> RefundEmailRequest.RefundEmailItem.builder()
                        .listingId(item.getListingId())
                        .listingTitle(item.getListingTitle())
                        .thumbnailUrl(item.getThumbnailUrl())
                        .startDate(item.getStartDate())
                        .endDate(item.getEndDate())
                        .timeSlot(item.getTimeSlot())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build()).toList())
                .build();
    }

    private OrderDisputeResponse toResponse(OrderDispute dispute) {
        Order order = orderRepository.findById(dispute.getOrderId()).orElse(null);
        return toResponse(dispute, order);
    }

    private OrderDisputeResponse toResponse(OrderDispute dispute, Order order) {
        Order.CustomerInfo customer = order == null ? null : order.getCustomerInfo();
        return OrderDisputeResponse.builder()
                .disputeId(dispute.getId())
                .orderId(dispute.getOrderId())
                .userId(dispute.getUserId())
                .orderNumber(order == null ? null : order.getOrderNumber())
                .orderStatus(order == null ? null : order.getStatus().name())
                .orderAmount(order == null ? null : order.getTotalAmount())
                .customerName(customer == null ? null : customer.getFullName())
                .customerEmail(customer == null ? null : customer.getEmail())
                .customerPhone(customer == null ? null : customer.getPhone())
                .reason(dispute.getReason())
                .description(dispute.getDescription())
                .status(dispute.getStatus().name())
                .adminNote(dispute.getAdminNote())
                .resolvedBy(dispute.getResolvedBy())
                .resolvedAt(dispute.getResolvedAt())
                .createdAt(dispute.getCreatedAt())
                .updatedAt(dispute.getUpdatedAt())
                .build();
    }
}
