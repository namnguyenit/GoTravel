"use client";

import { openPaymentPortal } from "@/shared/payment-portal";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrderService from "@/services/order";
import { useCart } from "@/shared/context/CartContext";
import CartService from "@/services/cart";
import { ShoppingCart } from "lucide-react";

type OrderSubmitResponse = {
  data?: {
    data?: {
      orderId?: string;
      id?: string;
      totalAmount?: number;
    };
    orderId?: string;
    id?: string;
    totalAmount?: number;
  };
};

function getResponseOrderData(res: OrderSubmitResponse) {
  return res?.data?.data || res?.data || {};
}


function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
  }
  return "Đặt dịch vụ thất bại.";
}

type CalendarSlot = {
  timeSlot?: string;
  availableQuantity?: number;
  status?: string;
};

const getAvailabilityRows = (res: unknown): CalendarSlot[] => {
  const data = (res as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as CalendarSlot[];
  if (data && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: CalendarSlot[] }).data;
  }
  return [];
};

function CheckoutForm() {
  const params = useSearchParams();
  const { items, refreshCart } = useCart();

  const type = params.get("type") || "direct";
  
  // Params for direct checkout
  const itemIdsStr = params.get("itemIds") || "";
  const selectedItemIds = itemIdsStr ? itemIdsStr.split(",") : [];

  const listingId = params.get("id") || "";
  const title = params.get("title") || "Dịch vụ";
  const price = Number(params.get("price") || 0);
  const image = params.get("image") || "";
  const category = params.get("category") || "place";

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState("");

  const nights = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));
  const total = price * (category === "place" ? nights : quantity);
  
  const selectedCartItems = items.filter(item => selectedItemIds.includes(item.itemId));
  const selectedItemsTotal = selectedCartItems
    .reduce((sum, item) => sum + item.totalPrice, 0);

  useEffect(() => {
    if (type !== "direct" || category === "place" || !listingId || !startDate) return;

    let cancelled = false;
    setLoadingSlots(true);

    CartService.checkAvailability(listingId, startDate, startDate)
      .then((res) => {
        if (cancelled) return;
        const availableSlots = getAvailabilityRows(res)
          .filter((slot) => (slot.availableQuantity ?? 0) > 0 && slot.status !== "BLOCKED")
          .sort((a, b) => String(a.timeSlot ?? "").localeCompare(String(b.timeSlot ?? "")));

        setSlots(availableSlots);
        setTimeSlot((current) => {
          if (current && availableSlots.some((slot) => slot.timeSlot === current)) return current;
          return availableSlots[0]?.timeSlot ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setTimeSlot("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, listingId, startDate, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let orderId;
      const customer = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      if (!customer.fullName || !customer.email || !customer.phone) {
        setError("Vui lòng nhập đầy đủ họ tên, email và số điện thoại để chủ nhà liên hệ khi cần.");
        setLoading(false);
        return;
      }

      if (type === "cart") {
        if (items.length === 0 || selectedItemIds.length === 0) {
          setError("Giỏ hàng của bạn đang trống hoặc bạn chưa chọn dịch vụ nào.");
          setLoading(false);
          return;
        }
        const res = await OrderService.checkoutCart({
          itemIds: selectedItemIds,
          customerInfo: customer
        }) as OrderSubmitResponse;
        const responseData = getResponseOrderData(res);
        orderId = responseData?.orderId || responseData?.id;
        
        if (!orderId) {
          throw new Error("Không nhận được mã đơn hàng từ server.");
        }
        setPendingOrderId(orderId);
        try { await refreshCart(); } catch { /* Đơn đã tạo; vẫn cho khách sang thanh toán. */ }
        await openPaymentPortal(orderId);
      } else {
        if (!listingId) { setError("Không tìm thấy dịch vụ."); setLoading(false); return; }
        if (new Date(endDate) < new Date(startDate)) { setError("Ngày kết thúc phải sau ngày bắt đầu."); setLoading(false); return; }
        if (category !== "place" && !timeSlot) {
          setError("Vui lòng chọn khung giờ còn trống để đặt dịch vụ.");
          setLoading(false);
          return;
        }
        
        const res = await OrderService.bookNow({
          item: {
            listingId,
            startDate,
            endDate: category === "place" ? endDate : startDate,
            timeSlot: category === "place" ? undefined : timeSlot,
            quantity,
            unitPrice: price,
            listingTitle: title,
            thumbnailUrl: image,
          },
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
        }) as OrderSubmitResponse;
        const responseData = getResponseOrderData(res);
        orderId = responseData?.orderId || responseData?.id;
        
        if (!orderId) {
          throw new Error("Không nhận được mã đơn hàng từ server.");
        }
        setPendingOrderId(orderId);
        await openPaymentPortal(orderId);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (type === "direct" && !listingId) return <div className="p-8">Không tìm thấy dịch vụ. <Link href="/" className="underline">Quay về trang chủ</Link></div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {type === "cart" ? "Xác nhận thanh toán Giỏ hàng" : "Xác nhận đặt dịch vụ"}
      </h1>

      {type === "direct" && (
        <>
          {image && <Image unoptimized src={image} alt={title} width={640} height={192} className="mb-3 h-48 w-full rounded-xl object-cover" />}
          <p className="font-semibold text-lg mb-1">{title}</p>
          <p className="text-sm text-gray-500 mb-6">
            đ{price.toLocaleString("vi-VN")} / {category === "place" ? "đêm" : category === "experience" ? "người" : "buổi"}
          </p>
        </>
      )}

      {type === "cart" && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b pb-3">
            <ShoppingCart className="w-5 h-5 text-app-fg" />
            <h3 className="font-semibold text-app-fg">Dịch vụ đã chọn ({selectedCartItems.length})</h3>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {selectedCartItems.map(item => (
              <div key={item.itemId} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <p className="font-medium truncate pr-2">{item.listingTitle}</p>
                  <p className="text-xs text-zinc-500">Từ {item.startDate} - Đến {item.endDate} (x{item.quantity})</p>
                  {item.timeSlot && <p className="text-xs text-zinc-500">Khung giờ: {item.timeSlot}</p>}
                </div>
                <span className="font-semibold">đ{item.totalPrice?.toLocaleString("vi-VN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {type === "direct" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu *</label>
                <input type="date" required value={startDate} min={today}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (category !== "place") setEndDate(e.target.value);
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div className={category === "place" ? "" : "hidden"}>
                <label className="block text-sm font-medium mb-1">Ngày kết thúc *</label>
                <input type="date" required value={endDate} min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {category !== "place" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Khung giờ còn trống *</label>
                  <select
                    required
                    value={timeSlot}
                    disabled={loadingSlots || slots.length === 0}
                    onChange={e => setTimeSlot(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:bg-zinc-100"
                  >
                    {loadingSlots ? (
                      <option value="">Đang tải khung giờ...</option>
                    ) : slots.length === 0 ? (
                      <option value="">Không còn khung giờ trống trong ngày này</option>
                    ) : (
                      slots.map((slot) => (
                        <option key={slot.timeSlot} value={slot.timeSlot}>
                          {slot.timeSlot} - còn {slot.availableQuantity} chỗ
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng người *</label>
                  <input type="number" required min={1} value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </>
            )}
          </>
        )}

        <hr />
        <p className="text-sm font-medium text-gray-600">Thông tin liên hệ của khách *</p>

        <input type="text" required placeholder="Họ và tên" value={fullName} onChange={e => setFullName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <input type="tel" required placeholder="Số điện thoại" value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm space-y-2 mt-6">
          <div className="flex justify-between font-bold text-lg">
            <span>Tổng thanh toán</span>
            <span className="text-rose-600">
              đ{type === "cart" ? selectedItemsTotal.toLocaleString("vi-VN") : total.toLocaleString("vi-VN")}
            </span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {pendingOrderId ? (
          <button type="button" disabled={loading} onClick={async () => {
            setLoading(true);
            setError("");
            try { await openPaymentPortal(pendingOrderId); }
            catch (err) { setError(getErrorMessage(err)); }
            finally { setLoading(false); }
          }} className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors mt-2 text-lg">
            {loading ? "Đang mở trang thanh toán..." : "Thử mở trang thanh toán lại →"}
          </button>
        ) : (
          <button type="submit" disabled={loading || (type === "direct" && category !== "place" && (!timeSlot || loadingSlots))}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors mt-2 text-lg"
          >
            {loading ? "Đang xử lý..." : "Tiến hành thanh toán →"}
          </button>
        )}
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 pt-24">Đang tải...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
