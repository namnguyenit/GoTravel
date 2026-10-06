"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  ShoppingBag,
  TicketCheck,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthModal } from "@/shared/context/AuthModalContext";
import { ApiClientError } from "@/shared/api/api";
import OrderService from "@/services/order";
import OrderQr from "@/features/orders/OrderQr";
import {
  historyFilters,
  isPaidOrder,
  orderCode,
  orderStatus,
  money,
  dateLabel,
  readOrder,
  readOrderPage,
  type PurchaseOrder,
  type OrderPage,
} from "@/features/orders/order-history";

const PAGE_SIZE = 12;
const emptyPage: OrderPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: PAGE_SIZE,
};

function StatusBadge({ order }: { order: PurchaseOrder }) {
  const status = orderStatus(order);
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold",
        status.color,
      ].join(" ")}
    >
      {status.label}
    </span>
  );
}

function Thumbnail({
  order,
  large = false,
}: {
  order: PurchaseOrder;
  large?: boolean;
}) {
  const item = order.items?.[0];
  return (
    <div
      className={[
        "relative shrink-0 overflow-hidden rounded-xl bg-zinc-100",
        large ? "h-24 w-28" : "h-20 w-20 sm:h-24 sm:w-28",
      ].join(" ")}
    >
      {item?.thumbnailUrl ? (
        <Image
          unoptimized
          fill
          src={item.thumbnailUrl}
          alt=""
          sizes="112px"
          className="object-cover"
        />
      ) : (
        <ShoppingBag className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-zinc-400" />
      )}
    </div>
  );
}

function CompletedOrdersContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { openModal } = useAuthModal();
  const orderId = params.get("orderId") || "";
  const rawPage = Number(params.get("page") || 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const filter =
    historyFilters.find((item) => item.key === params.get("filter")) ||
    historyFilters[0];
  const search = (params.get("search") || "").trim().slice(0, 120);
  const requestKey = JSON.stringify([orderId, page, filter.key, search]);
  const contentRef = useRef<HTMLDivElement>(null);
  const activeOrderId = useRef(orderId);
  const [dataKey, setDataKey] = useState("");
  const [orders, setOrders] = useState<OrderPage>(emptyPage);
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [retry, setRetry] = useState(0);
  const [searchText, setSearchText] = useState(search);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [resending, setResending] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState("");

  const historyUrl = (
    changes: {
      page?: number;
      filter?: string;
      search?: string;
      orderId?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    const nextPage = changes.page ?? page;
    const nextFilter = changes.filter ?? filter.key;
    const nextSearch = changes.search ?? search;
    if (nextPage) query.set("page", String(nextPage));
    if (nextFilter !== "all") query.set("filter", nextFilter);
    if (nextSearch) query.set("search", nextSearch);
    if (changes.orderId) query.set("orderId", changes.orderId);
    return "/orders/completed" + (query.size ? "?" + query.toString() : "");
  };

  useEffect(() => {
    setSearchText(search);
  }, [search]);

  useEffect(() => {
    activeOrderId.current = orderId;
    // The application scrolls its main element rather than the browser window.
    contentRef.current?.closest("main")?.scrollTo({ top: 0 });
  }, [requestKey, orderId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setUnauthorized(false);
    setOrder(null);
    setNotice(null);
    setDisputeOpen(false);
    const load = async () => {
      try {
        if (orderId) {
          if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              orderId,
            )
          ) {
            throw new Error(
              "Không tìm thấy đơn hàng. Vui lòng chọn lại từ lịch sử mua hàng.",
            );
          }
          const result = readOrder(await OrderService.getOrder(orderId));
          if (!cancelled) setOrder(result);
        } else {
          const result = readOrderPage(
            await OrderService.getUserOrders(page, PAGE_SIZE, {
              statuses: filter.statuses,
              search,
            }),
          );
          if (!cancelled) setOrders(result);
        }
      } catch (failure) {
        if (!cancelled) {
          setUnauthorized(
            failure instanceof ApiClientError && failure.status === 401,
          );
          setError(
            failure instanceof ApiClientError && failure.status === 404
              ? "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này."
              : failure instanceof Error
                ? failure.message
                : "Không tải được đơn hàng. Vui lòng thử lại.",
          );
        }
      } finally {
        if (!cancelled) {
          setDataKey(requestKey);
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // URL values identify the entire request; stale responses are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, retry]);

  const resendEmail = async () => {
    if (!order || resending) return;
    const currentId = order.orderId;
    setResending(true);
    setNotice(null);
    try {
      const updated = readOrder(
        await OrderService.resendTicketEmail(currentId),
      );
      if (activeOrderId.current !== currentId) return;
      setOrder((current) =>
        current?.orderId === currentId ? updated : current,
      );
      setNotice({ text: "Đã gửi lại vé điện tử đến email đặt hàng." });
    } catch (failure) {
      if (activeOrderId.current !== currentId) return;
      setNotice({
        text:
          failure instanceof Error
            ? failure.message
            : "Không gửi lại được email. Vui lòng thử lại.",
        error: true,
      });
    } finally {
      setResending(false);
    }
  };

  const submitDispute = async (event: FormEvent) => {
    event.preventDefault();
    if (!order || disputeLoading) return;
    const currentId = order.orderId;
    if (!disputeReason.trim()) {
      setDisputeError("Vui lòng nhập lý do khiếu nại.");
      return;
    }
    setDisputeLoading(true);
    setDisputeError("");
    try {
      await OrderService.createDispute({
        orderId: order.orderId,
        reason: disputeReason.trim(),
        description: disputeDescription.trim() || undefined,
      });
      if (activeOrderId.current !== currentId) return;
      setDisputeOpen(false);
      setDisputeReason("");
      setDisputeDescription("");
      setNotice({
        text: "Đã gửi khiếu nại. Bạn có thể theo dõi trong mục Khiếu nại của tôi.",
      });
    } catch (failure) {
      if (activeOrderId.current !== currentId) return;
      setDisputeError(
        failure instanceof Error
          ? failure.message
          : "Không gửi được khiếu nại. Vui lòng thử lại.",
      );
    } finally {
      setDisputeLoading(false);
    }
  };

  const busy = loading || dataKey !== requestKey;

  return (
    <div
      ref={contentRef}
      className="min-h-screen bg-zinc-50 px-4 pt-9 pb-16 text-[#222222] sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        {orderId ? (
          <Link
            href={historyUrl()}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Lịch sử mua hàng
          </Link>
        ) : null}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {orderId ? "Chi tiết đơn hàng" : "Lịch sử mua hàng"}
            </h1>
            {!orderId && !busy && !error && (
              <p className="mt-2 text-sm text-zinc-500">
                {orders.totalElements} đơn hàng
                {filter.key !== "all" ? " · " + filter.label : ""}
                {search ? " · Kết quả tìm kiếm" : ""}
              </p>
            )}
          </div>
          {!orderId && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            >
              Tiếp tục khám phá
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {!orderId && (
          <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div
              className="mb-4 flex flex-wrap gap-2"
              aria-label="Lọc trạng thái đơn hàng"
            >
              {historyFilters.map((item) => (
                <Link
                  key={item.key}
                  href={historyUrl({ filter: item.key, page: 0 })}
                  aria-current={filter.key === item.key ? "page" : undefined}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    filter.key === item.key
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <form
              className="flex gap-2"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(historyUrl({ search: searchText.trim(), page: 0 }));
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  aria-label="Tìm mã đơn hoặc tên dịch vụ"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  maxLength={120}
                  placeholder="Tìm mã đơn hoặc tên dịch vụ"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-10 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                Tìm kiếm
              </button>
            </form>
            {search && (
              <Link
                href={historyUrl({ search: "", page: 0 })}
                className="mt-3 inline-block text-xs font-semibold text-zinc-500 underline"
              >
                Xóa tìm kiếm
              </Link>
            )}
          </div>
        )}

        {busy ? (
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500"
            role="status"
          >
            Đang tải {orderId ? "chi tiết đơn hàng" : "lịch sử mua hàng"}...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              onClick={() =>
                unauthorized ? openModal() : setRetry((value) => value + 1)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              {unauthorized ? "Đăng nhập" : "Thử lại"}
            </button>
          </div>
        ) : orderId && order ? (
          <>
            {notice && (
              <div
                role={notice.error ? "alert" : "status"}
                className={[
                  "mb-4 rounded-xl border px-4 py-3 text-sm",
                  notice.error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800",
                ].join(" ")}
              >
                {notice.text}
              </div>
            )}
            <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
              <div
                className={
                  isPaidOrder(order) ? "grid lg:grid-cols-[1fr_240px]" : ""
                }
              >
                <div className="p-5 sm:p-7">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-500">
                        Mã đơn hàng
                      </p>
                      <h2
                        className="mt-1 font-mono text-lg font-bold break-all"
                        data-order-code
                      >
                        {orderCode(order)}
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Đặt ngày {dateLabel(order.createdAt, true)}
                      </p>
                    </div>
                    <StatusBadge order={order} />
                  </div>
                  <dl className="mb-5 grid gap-4 rounded-2xl bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-zinc-500">Khách hàng</dt>
                      <dd className="mt-1 font-semibold">
                        {order.customerInfo?.fullName || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Số điện thoại</dt>
                      <dd className="mt-1 font-semibold">
                        {order.customerInfo?.phone || "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-zinc-500">Email đặt hàng</dt>
                      <dd className="mt-1 font-semibold break-all">
                        {order.customerInfo?.email || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">
                        {isPaidOrder(order) ? "Tổng thanh toán" : "Tổng tiền"}
                      </dt>
                      <dd className="mt-1 font-bold text-rose-600">
                        {money(order.totalAmount, order.currency)}
                      </dd>
                    </div>
                  </dl>
                  {isPaidOrder(order) && (
                    <section
                      className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4"
                      aria-label="Email vé điện tử"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-2 text-sm font-bold">
                            <Mail className="h-4 w-4 text-sky-700" />
                            Vé điện tử:{" "}
                            {order.ticketEmailSent
                              ? "Đã gửi email"
                              : "Chưa gửi email"}
                          </h3>
                          <p className="mt-2 text-xs break-all text-zinc-600">
                            Người nhận:{" "}
                            {order.ticketEmailRecipient ||
                              order.customerInfo?.email ||
                              "Chưa có email"}
                          </p>
                          {order.ticketEmailSentAt && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Gửi lúc {dateLabel(order.ticketEmailSentAt, true)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={resendEmail}
                          disabled={resending || !order.customerInfo?.email}
                          className="shrink-0 self-start rounded-xl bg-white px-4 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100 disabled:opacity-50"
                        >
                          {resending ? "Đang gửi..." : "Gửi lại email vé"}
                        </button>
                      </div>
                    </section>
                  )}
                  <h3 className="mb-3 text-sm font-bold">Dịch vụ đã đặt</h3>
                  <div className="space-y-3">
                    {(order.items || []).map((item, index) => (
                      <div
                        key={item.itemId || index}
                        className="flex gap-3 rounded-2xl border border-zinc-100 p-3"
                      >
                        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                          {item.thumbnailUrl && (
                            <Image
                              unoptimized
                              fill
                              src={item.thumbnailUrl}
                              alt=""
                              sizes="96px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {item.listingTitle || "Dịch vụ GoTravel"}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            {dateLabel(item.startDate)}
                            {item.endDate && item.endDate !== item.startDate
                              ? " – " + dateLabel(item.endDate)
                              : ""}
                          </p>
                          {item.timeSlot && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Khung giờ: {item.timeSlot}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Đơn giá: {money(item.unitPrice, order.currency)}
                          </p>
                          <div className="mt-1 flex flex-wrap justify-between gap-1 text-xs">
                            <span className="text-zinc-500">
                              Số lượng: {item.quantity ?? 1}
                            </span>
                            <span className="font-semibold">
                              Thành tiền:{" "}
                              {money(item.totalPrice, order.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {isPaidOrder(order) && (
                      <button
                        onClick={() => {
                          setDisputeOpen(true);
                          setDisputeError("");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Khiếu nại
                      </button>
                    )}
                    {["PENDING", "PAYMENT_PENDING"].includes(
                      order.status || "",
                    ) && (
                      <Link
                        href={
                          "/payment?orderId=" +
                          encodeURIComponent(order.orderId)
                        }
                        className="rounded-xl bg-[#ff385c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e61e4d]"
                      >
                        Thanh toán qua GoPay
                      </Link>
                    )}
                  </div>
                </div>
                {isPaidOrder(order) && (
                  <aside className="flex flex-col items-center justify-center gap-3 border-t border-dashed border-zinc-200 bg-zinc-50 p-5 lg:border-t-0 lg:border-l">
                    <TicketCheck className="h-6 w-6 text-emerald-600" />
                    <h3 className="text-sm font-bold">Mã đơn hàng</h3>
                    <OrderQr code={orderCode(order)} />
                    <p className="max-w-full text-center font-mono text-xs break-all text-zinc-700">
                      {orderCode(order)}
                    </p>
                    <p className="text-center text-xs leading-relaxed text-zinc-500">
                      Xuất trình mã khi sử dụng dịch vụ.
                    </p>
                  </aside>
                )}
              </div>
            </article>
          </>
        ) : orders.content.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-lg font-bold">
              {search || filter.key !== "all"
                ? "Không tìm thấy đơn hàng"
                : page > 0
                  ? "Trang này không có đơn hàng"
                  : "Chưa có đơn hàng"}
            </h2>
            <Link
              href={
                page > 0 || search || filter.key !== "all"
                  ? historyUrl({ page: 0, filter: "all", search: "" })
                  : "/"
              }
              className="mt-4 inline-block text-sm font-semibold underline"
            >
              {page > 0 || search || filter.key !== "all"
                ? "Xem toàn bộ lịch sử"
                : "Khám phá dịch vụ"}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4" aria-label="Danh sách đơn hàng">
              {orders.content.map((item) => (
                <Link
                  key={item.orderId}
                  href={historyUrl({ orderId: item.orderId })}
                  prefetch={false}
                  aria-label={"Xem đơn " + orderCode(item)}
                  className="group grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-rose-400 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:p-5"
                  data-history-order={item.orderId}
                >
                  <Thumbnail order={item} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs break-all text-zinc-500">
                        {orderCode(item)}
                      </span>
                      <StatusBadge order={item} />
                    </div>
                    <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">
                      {item.items
                        ?.map((product) => product.listingTitle)
                        .filter(Boolean)
                        .join(" · ") || "Đơn hàng GoTravel"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {dateLabel(item.createdAt)} · {item.items?.length || 0}{" "}
                      sản phẩm
                    </p>
                  </div>
                  <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-3 sm:row-start-1 sm:justify-end">
                    <span className="text-sm font-bold whitespace-nowrap sm:text-base">
                      {money(item.totalAmount, item.currency)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-900" />
                  </div>
                </Link>
              ))}
            </div>
            <nav
              aria-label="Phân trang lịch sử mua hàng"
              className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <p className="text-zinc-500">
                {page * PAGE_SIZE + 1}–
                {page * PAGE_SIZE + orders.content.length} /{" "}
                {orders.totalElements} đơn hàng
              </p>
              <div className="flex items-center gap-3">
                {page > 0 ? (
                  <Link
                    href={historyUrl({ page: page - 1 })}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-zinc-400"
                    aria-disabled="true"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  Trang {page + 1} / {orders.totalPages}
                </span>
                {page + 1 < orders.totalPages ? (
                  <Link
                    href={historyUrl({ page: page + 1 })}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-100"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-zinc-400"
                    aria-disabled="true"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </nav>
          </>
        )}
      </div>
      <Dialog
        open={disputeOpen}
        onOpenChange={(value) => {
          if (!disputeLoading) setDisputeOpen(value);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl p-6 sm:max-w-lg">
          <DialogTitle className="text-xl font-bold">
            Khiếu nại đơn hàng
          </DialogTitle>
          <DialogDescription>
            Mã đơn: {order ? orderCode(order) : ""}
          </DialogDescription>
          <form onSubmit={submitDispute} className="space-y-4">
            {disputeError && (
              <p role="alert" className="text-sm text-red-700">
                {disputeError}
              </p>
            )}
            <div>
              <label
                htmlFor="dispute-reason"
                className="mb-2 block text-sm font-semibold"
              >
                Lý do *
              </label>
              <input
                id="dispute-reason"
                required
                maxLength={255}
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="dispute-description"
                className="mb-2 block text-sm font-semibold"
              >
                Mô tả chi tiết
              </label>
              <textarea
                id="dispute-description"
                rows={5}
                maxLength={2000}
                value={disputeDescription}
                onChange={(event) => setDisputeDescription(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={disputeLoading}
              className="w-full rounded-xl bg-[#ff385c] py-3 text-sm font-bold text-white hover:bg-[#e61e4d] disabled:opacity-50"
            >
              {disputeLoading ? "Đang gửi..." : "Gửi khiếu nại"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompletedOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center" role="status">
          Đang tải...
        </div>
      }
    >
      <CompletedOrdersContent />
    </Suspense>
  );
}
