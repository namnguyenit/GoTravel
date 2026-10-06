package com.GoTravel.CartandOrder.service;

import com.GoTravel.CartandOrder.client.CatalogClient;
import com.GoTravel.CartandOrder.client.CommunicationClient;
import com.GoTravel.CartandOrder.client.InventoryClient;
import com.GoTravel.CartandOrder.dto.request.BatchLockRequest;
import com.GoTravel.CartandOrder.dto.request.BookNowRequest;
import com.GoTravel.CartandOrder.dto.request.CheckoutCartRequest;
import com.GoTravel.CartandOrder.dto.request.CartItemRequest;
import com.GoTravel.CartandOrder.dto.request.TicketEmailRequest;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.AdminOrderSummaryResponse;
import com.GoTravel.CartandOrder.dto.response.BatchLockResponse;
import com.GoTravel.CartandOrder.dto.response.CatalogListingResponse;
import com.GoTravel.CartandOrder.dto.response.OrderPaymentSummaryResponse;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import com.GoTravel.CartandOrder.entity.Cart;
import com.GoTravel.CartandOrder.entity.CartItem;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.entity.OrderItem;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.exeption.AppException;
import com.GoTravel.CartandOrder.exeption.OrderErrorCode;
import com.GoTravel.CartandOrder.mapper.OrderMapper;
import com.GoTravel.CartandOrder.repository.CartRepository;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final InventoryClient inventoryClient;
    private final CatalogClient catalogClient;
    private final CommunicationClient communicationClient;
    private final OrderMapper orderMapper;
    @Value("${frontend.base-url:https://gotravel.trungcaodev.io.vn}")
    private String frontendBaseUrl;

    @Transactional
    public OrderResponse checkoutCart(UUID userId, CheckoutCartRequest request) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(OrderErrorCode.CART_NOT_FOUND));

        if (cart.getItems().isEmpty()) {
            throw new AppException(OrderErrorCode.CART_IS_EMPTY);
        }

        // Lọc các item được chọn để checkout
        List<CartItem> selectedItems = cart.getItems().stream()
                .filter(item -> request.getItemIds().contains(item.getId()))
                .toList();

        if (selectedItems.isEmpty()) {
            throw new AppException(OrderErrorCode.CART_IS_EMPTY);
        }

        refreshSelectedCartItemsFromCatalog(selectedItems);
        Order order = createOrderFromSelectedCartItems(cart, selectedItems, request.getCustomerInfo());
        order = orderRepository.save(order);

        lockInventory(order);

        // Xoá các item đã checkout khỏi giỏ hàng
        cart.getItems().removeAll(selectedItems);
        cartRepository.save(cart);

        return orderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse bookNow(UUID userId, BookNowRequest request) {
        Order order = createOrderFromSingleItem(userId, request);
        order = orderRepository.save(order);

        lockInventory(order);

        return orderMapper.toOrderResponse(order);
    }

    private void lockInventory(Order order) {
        BatchLockRequest lockRequest = BatchLockRequest.builder()
                .orderId(order.getId())
                .items(order.getItems().stream().map(item -> 
                    BatchLockRequest.LockItemRequest.builder()
                        .listingId(item.getListingId())
                        .startDate(item.getStartDate())
                        .endDate(item.getEndDate())
                        .timeSlot(item.getTimeSlot())
                        .quantity(item.getQuantity())
                        .build()
                ).collect(Collectors.toList()))
                .build();

        try {
            ApiResponse<BatchLockResponse> lockResponse = inventoryClient.batchLock(lockRequest);
            if (lockResponse.isSuccess() && lockResponse.getData() != null) {
                order.setStatus(OrderStatus.PAYMENT_PENDING);
                order.setExpiresAt(lockResponse.getData().getExpiresAt());
                orderRepository.save(order);
            } else {
                throw new AppException(OrderErrorCode.INVENTORY_LOCK_FAILED);
            }
        } catch (Exception e) {
            log.error("Failed to lock inventory for order {}", order.getId(), e);
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
            throw new AppException(OrderErrorCode.INVENTORY_LOCK_FAILED);
        }
    }

    private Order createOrderFromSelectedCartItems(Cart cart, List<CartItem> selectedItems, Order.CustomerInfo customerInfo) {
        UUID hostId = resolvePrimaryHostId(selectedItems);
        BigDecimal totalAmount = selectedItems.stream()
                .map(CartItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
                .userId(cart.getUserId())
                .hostId(hostId)
                .orderNumber("ORD-" + System.currentTimeMillis())
                .status(OrderStatus.PENDING)
                .totalAmount(totalAmount)
                .customerInfo(customerInfo)
                .build();

        List<OrderItem> orderItems = selectedItems.stream().map(ci -> OrderItem.builder()
                .order(order)
                .listingId(ci.getListingId())
                .hostId(ci.getHostId())
                .listingTitle(ci.getListingTitle())
                .thumbnailUrl(ci.getThumbnailUrl())
                .startDate(ci.getStartDate())
                .endDate(ci.getEndDate())
                .timeSlot(ci.getTimeSlot())
                .quantity(ci.getQuantity())
                .unitPrice(ci.getUnitPrice())
                .totalPrice(ci.getTotalPrice())
                .build()).collect(Collectors.toList());

        order.setItems(orderItems);
        return order;
    }

    private Order createOrderFromSingleItem(UUID userId, BookNowRequest request) {
        CartItemRequest itemReq = buildTrustedCartItemRequest(request.getItem());
        BigDecimal totalPrice = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));

        Order.CustomerInfo info = new Order.CustomerInfo(request.getFullName(), request.getEmail(), request.getPhone());

        Order order = Order.builder()
                .userId(userId)
                .hostId(itemReq.getHostId())
                .orderNumber("ORD-" + System.currentTimeMillis())
                .status(OrderStatus.PENDING)
                .totalAmount(totalPrice)
                .customerInfo(info)
                .build();

        OrderItem orderItem = OrderItem.builder()
                .order(order)
                .listingId(itemReq.getListingId())
                .hostId(itemReq.getHostId())
                .listingTitle(itemReq.getListingTitle())
                .thumbnailUrl(itemReq.getThumbnailUrl())
                .startDate(itemReq.getStartDate())
                .endDate(itemReq.getEndDate())
                .timeSlot(itemReq.getTimeSlot())
                .quantity(itemReq.getQuantity())
                .unitPrice(itemReq.getUnitPrice())
                .totalPrice(totalPrice)
                .build();

        order.getItems().add(orderItem);
        return order;
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderDetails(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        return orderMapper.toOrderResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderPaymentSummaryResponse getPaymentSummary(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));

        return OrderPaymentSummaryResponse.builder()
                .orderId(order.getId())
                .userId(order.getUserId())
                .hostId(order.getHostId())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .status(order.getStatus().name())
                .expiresAt(order.getExpiresAt())
                .providerBreakdowns(buildProviderBreakdowns(order))
                .build();
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrders(UUID userId, Pageable pageable) {
        return getUserOrders(userId, pageable, null, "");
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrders(UUID userId, Pageable pageable, List<OrderStatus> statuses, String search) {
        List<OrderStatus> selectedStatuses = statuses == null || statuses.isEmpty()
                ? List.of(OrderStatus.values()) : statuses;
        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        keyword = keyword.substring(0, Math.min(keyword.length(), 120));
        String pattern = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        Pageable boundedPage = PageRequest.of(Math.max(0, pageable.getPageNumber()),
                Math.min(100, Math.max(1, pageable.getPageSize())));
        return orderRepository.findUserHistory(userId, selectedStatuses, pattern, boundedPage)
                .map(orderMapper::toOrderResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getHostOrders(UUID hostId, Pageable pageable) {
        return orderRepository.findByAnyItemHostIdOrderByCreatedAtDesc(hostId, pageable)
                .map(orderMapper::toOrderResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getAdminOrders(Pageable pageable) {
        return orderRepository.findAll(pageable)
                .map(orderMapper::toOrderResponse);
    }

    @Transactional(readOnly = true)
    public AdminOrderSummaryResponse getAdminSummary() {
        return AdminOrderSummaryResponse.builder()
                .totalOrders(orderRepository.count())
                .pendingOrders(orderRepository.countByStatus(OrderStatus.PENDING))
                .paymentPendingOrders(orderRepository.countByStatus(OrderStatus.PAYMENT_PENDING))
                .confirmedOrders(orderRepository.countByStatus(OrderStatus.CONFIRMED))
                .completedOrders(orderRepository.countByStatus(OrderStatus.COMPLETED))
                .cancelledOrders(orderRepository.countByStatus(OrderStatus.CANCELLED))
                .totalOrderAmount(orderRepository.sumTotalAmount())
                .confirmedOrderAmount(orderRepository.sumTotalAmountByStatus(OrderStatus.CONFIRMED))
                .completedOrderAmount(orderRepository.sumTotalAmountByStatus(OrderStatus.COMPLETED))
                .cancelledOrderAmount(orderRepository.sumTotalAmountByStatus(OrderStatus.CANCELLED))
                .build();
    }

    @Transactional
    public void cancelOrder(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));
        
        if (!order.getUserId().equals(userId)) {
            throw new AppException(OrderErrorCode.ORDER_NOT_FOUND);
        }

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PAYMENT_PENDING) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        try {
            inventoryClient.cancelLock(orderId);
        } catch (Exception e) {
            log.error("Failed to cancel lock in inventory for order {}", orderId, e);
        }
    }

    @Transactional
    public void confirmPayment(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.COMPLETED) return;
        if (order.getStatus() != OrderStatus.PAYMENT_PENDING || order.getExpiresAt() == null
                || !order.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }
        var inventory = inventoryClient.confirmLock(orderId);
        if (inventory == null || !inventory.isSuccess()) throw new AppException(OrderErrorCode.INVENTORY_LOCK_FAILED);
        order.setStatus(OrderStatus.CONFIRMED);
        deliverTicketEmail(order, false);
        orderRepository.save(order);
    }

    @Transactional
    public OrderResponse resendTicketEmail(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.COMPLETED) {
            throw new AppException(OrderErrorCode.INVALID_ORDER_STATE);
        }

        deliverTicketEmail(order, true);
        orderRepository.save(order);
        return orderMapper.toOrderResponse(order);
    }

    @Transactional
    public void failPayment(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(OrderErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.COMPLETED) return;
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        try {
            inventoryClient.cancelLock(orderId);
        } catch (Exception e) {
            log.error("Failed to cancel lock in inventory for order {}", orderId, e);
        }
    }

    @Transactional(readOnly = true)
    public boolean hasPurchasedListing(UUID userId, UUID listingId) {
        return hasCompletedListingOrder(userId, listingId);
    }

    @Transactional(readOnly = true)
    public boolean hasCompletedListingOrder(UUID userId, UUID listingId) {
        return orderRepository.hasPurchasedListing(userId, listingId, List.of(OrderStatus.CONFIRMED, OrderStatus.COMPLETED));
    }

    private void refreshSelectedCartItemsFromCatalog(List<CartItem> items) {
        for (CartItem item : items) {
            CatalogListingResponse listing = getActiveListing(item.getListingId());
            item.setHostId(listing.getHostId());
            item.setListingTitle(listing.getTitle());
            item.setThumbnailUrl(listing.getThumbnailUrl());
            item.setUnitPrice(listing.getBasePrice());
            item.setTotalPrice(listing.getBasePrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }
    }

    private CartItemRequest buildTrustedCartItemRequest(CartItemRequest request) {
        validateCartItemRequest(request);
        CatalogListingResponse listing = getActiveListing(request.getListingId());

        return CartItemRequest.builder()
                .listingId(listing.getId())
                .hostId(listing.getHostId())
                .listingTitle(listing.getTitle())
                .thumbnailUrl(listing.getThumbnailUrl())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .timeSlot(request.getTimeSlot())
                .quantity(request.getQuantity())
                .unitPrice(listing.getBasePrice())
                .build();
    }

    private void validateCartItemRequest(CartItemRequest request) {
        if (request == null
                || request.getListingId() == null
                || request.getStartDate() == null
                || request.getEndDate() == null
                || request.getQuantity() == null
                || request.getQuantity() < 1
                || request.getStartDate().isBefore(java.time.LocalDate.now())
                || request.getEndDate().isBefore(java.time.LocalDate.now())
                || request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(OrderErrorCode.INVALID_CART_ITEM_REQUEST);
        }
    }

    private CatalogListingResponse getActiveListing(UUID listingId) {
        try {
            ApiResponse<CatalogListingResponse> response = catalogClient.getListingDetail(listingId);
            CatalogListingResponse listing = response == null ? null : response.getData();
            if (listing == null || listing.getHostId() == null || listing.getBasePrice() == null
                    || !"ACTIVE".equalsIgnoreCase(listing.getStatus())) {
                throw new AppException(OrderErrorCode.LISTING_NOT_AVAILABLE);
            }

            return listing;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Cannot load trusted listing snapshot for listing {}", listingId, e);
            throw new AppException(OrderErrorCode.LISTING_NOT_AVAILABLE);
        }
    }

    private UUID resolvePrimaryHostId(List<CartItem> items) {
        UUID hostId = null;
        for (CartItem item : items) {
            if (item.getHostId() == null) {
                throw new AppException(OrderErrorCode.LISTING_NOT_AVAILABLE);
            }

            if (hostId == null) {
                hostId = item.getHostId();
            }
        }

        return hostId;
    }

    private void deliverTicketEmail(Order order, boolean failOnError) {
        String recipient = order.getCustomerInfo() != null ? order.getCustomerInfo().getEmail() : null;
        order.setTicketEmailRecipient(recipient);
        order.setTicketEmailAttempts((order.getTicketEmailAttempts() == null ? 0 : order.getTicketEmailAttempts()) + 1);
        if (recipient == null || recipient.isBlank()) {
            order.setTicketEmailSent(false);
            if (failOnError) {
                throw new AppException(OrderErrorCode.TICKET_EMAIL_SEND_FAILED);
            }
            return;
        }

        try {
            communicationClient.sendTicketEmail(buildTicketEmailRequest(order, recipient));
            order.setTicketEmailSent(true);
            order.setTicketEmailSentAt(LocalDateTime.now());
            log.info("Ticket email sent for order {} to {}", order.getId(), recipient);
        } catch (Exception e) {
            order.setTicketEmailSent(false);
            log.error("Failed to send ticket email for order {} to {}", order.getId(), recipient, e);
            if (failOnError) {
                throw new AppException(OrderErrorCode.TICKET_EMAIL_SEND_FAILED);
            }
        }
    }

    private TicketEmailRequest buildTicketEmailRequest(Order order, String recipient) {
        String ticketUrl = frontendBaseUrl.replaceAll("/+$", "") + "/orders/completed?orderId=" + order.getId();

        return TicketEmailRequest.builder()
                .to(recipient)
                .customerName(order.getCustomerInfo() != null ? order.getCustomerInfo().getFullName() : null)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .ticketUrl(ticketUrl)
                .items(order.getItems().stream().map(item -> TicketEmailRequest.TicketEmailItem.builder()
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

    private List<OrderPaymentSummaryResponse.ProviderBreakdown> buildProviderBreakdowns(Order order) {
        Map<UUID, BigDecimal> totalsByHost = new LinkedHashMap<>();

        for (OrderItem item : order.getItems()) {
            if (item.getHostId() == null) {
                throw new AppException(OrderErrorCode.LISTING_NOT_AVAILABLE);
            }

            totalsByHost.merge(item.getHostId(), item.getTotalPrice(), BigDecimal::add);
        }

        return totalsByHost.entrySet().stream()
                .map(entry -> OrderPaymentSummaryResponse.ProviderBreakdown.builder()
                        .hostId(entry.getKey())
                        .totalAmount(entry.getValue())
                        .build())
                .toList();
    }
}
