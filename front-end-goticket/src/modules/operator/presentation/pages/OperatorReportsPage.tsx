import React, { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  Ticket,
  WalletCards,
  ArrowUpRight,
} from "lucide-react";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import { formatVnd } from "@/shared/domain/money.vo";
import { vietnamDate } from "@/shared/utils/vietnam-date";
import {
  PageHeader,
  SurfaceCard,
  MetricCard,
  MoneyText,
  IdText,
  StatusBadge,
  InlineAlert,
  LoadingState,
  EmptyState,
  Button,
  ConfirmDialog,
  Pagination,
} from "@/shared/presentation/components";

const payoutStatusLabels: Record<string, string> = {
  PAID: "Đã chi trả",
  REQUESTED: "Chờ quyết toán",
  PENDING: "Chưa yêu cầu rút",
  CANCELLED: "Đã hủy khoản chi",
};

const dateInput = (date: Date) => vietnamDate(date);
const initialFrom = () => vietnamDate(Date.now() - 30 * 24 * 60 * 60_000);

export const OperatorReportsPage: React.FC = () => {
  const [from, setFrom] = useState(initialFrom());
  const [to, setTo] = useState(dateInput(new Date()));
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<Array<Record<string, unknown>>>([]);
  const [payoutPageIndex, setPayoutPageIndex] = useState(1);
  const [payoutPages, setPayoutPages] = useState(1);
  const [payoutTotal, setPayoutTotal] = useState(0);
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Withdraw confirm dialog
  const [selectedPayoutToWithdraw, setSelectedPayoutToWithdraw] = useState<
    string | null
  >(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const [reportData, payoutPage] = await Promise.all([
        httpClient.get<Record<string, unknown>>(
          "/api/v1/orders/transport/vendor/reports",
          {
            params: { from, to },
          }
        ),
        httpClient.get<any>("/api/v1/payouts/me", {
          params: {
            page: payoutPageIndex - 1,
            size: 20,
            providerType: "TRANSPORT",
          },
        }),
      ]);
      if (requestId !== requestSequence.current) return;
      setReport(reportData);
      setPayoutPages(Math.max(1, Number(payoutPage?.totalPages || 0)));
      setPayoutTotal(Number(payoutPage?.totalElements || 0));
      setPayouts(
        Array.isArray(payoutPage?.content)
          ? payoutPage.content.filter(
              (row: any) => row.providerType === "TRANSPORT"
            )
          : []
      );
    } catch (reason) {
      if (requestId !== requestSequence.current) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải báo cáo vận hành."
      );
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [payoutPageIndex]);

  const rows = Array.isArray(report?.ordersByMethodAndStatus)
    ? (report.ordersByMethodAndStatus as Array<Record<string, unknown>>)
    : [];
  const totalOrders = rows.reduce(
    (sum, row) => sum + Number(row.order_count || 0),
    0
  );
  const totalBooked = rows.reduce(
    (sum, row) => sum + Number(row.booked_amount || 0),
    0
  );
  const totalRefunded = rows.reduce(
    (sum, row) => sum + Number(row.refunded_amount || 0),
    0
  );

  const handleConfirmWithdraw = async () => {
    if (!selectedPayoutToWithdraw) return;
    setWithdrawing(true);
    setError("");
    try {
      await httpClient.post(
        `/api/v1/payouts/transport/${selectedPayoutToWithdraw}/withdraw`
      );
      setSelectedPayoutToWithdraw(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể gửi yêu cầu rút tiền."
      );
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Báo cáo Doanh thu & Đối soát"
        eyebrow="Kênh Nhà Xe · Tài chính"
        description="Số liệu tổng hợp trực tiếp từ các đơn vé vận tải liên tỉnh và các khoản đối soát thanh toán."
      />

      {/* Date Range Bar */}
      <SurfaceCard
        variant="glass"
        className="shadow-glass flex flex-wrap items-end gap-3.5 rounded-[28px] border border-white/80 p-5"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Từ ngày
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="block rounded-full border border-gray-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Đến ngày
          </label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="block rounded-full border border-gray-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
          />
        </div>
        <Button
          onClick={() => void load()}
          disabled={loading}
          className="shadow-brand-sm cursor-pointer rounded-full bg-[var(--gt-brand)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--gt-brand-hover)]"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Cập nhật số liệu
        </Button>
      </SurfaceCard>

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi báo cáo"
          message={error}
          onClose={() => setError("")}
        />
      )}

      {loading ? (
        <SurfaceCard
          variant="glass"
          className="rounded-[28px] p-12 text-center"
        >
          <LoadingState message="Đang tổng hợp báo cáo tài chính..." />
        </SurfaceCard>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Đơn vé trong kỳ"
              value={totalOrders.toLocaleString("vi-VN")}
              icon={Ticket}
              variant="default"
            />
            <MetricCard
              label="Giá trị đặt vé"
              value={formatVnd(String(totalBooked))}
              icon={WalletCards}
              variant="coral"
            />
            <MetricCard
              label="Đã hoàn trả"
              value={formatVnd(String(totalRefunded))}
              icon={RefreshCw}
              variant="coral"
            />
          </div>

          {/* Breakdown Table */}
          <SurfaceCard
            variant="glass"
            className="shadow-glass overflow-hidden rounded-[28px] border border-white/80 p-0"
          >
            <div className="border-b border-gray-100/80 bg-white/60 p-4 backdrop-blur-md sm:p-5">
              <h2 className="text-sm font-bold text-gray-900">
                Phân bổ theo Phương thức thanh toán & Trạng thái
              </h2>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Chưa có dữ liệu giao dịch trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100/80 bg-white/60 font-bold text-gray-500 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3.5">Phương thức</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right">Số đơn</th>
                      <th className="px-5 py-3.5 text-right">Tổng giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {rows.map((row, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-white/60"
                      >
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          {String(row.payment_method || "—")}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full border border-gray-200/80 bg-white/90 px-3 py-0.5 text-[11px] font-semibold text-gray-700 shadow-2xs">
                            {String(row.status || "—")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-gray-600">
                          {String(row.order_count || 0)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <MoneyText
                            amount={Number(row.booked_amount || 0)}
                            weight="bold"
                            variant="coral"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>

          {/* Payouts Table */}
          <SurfaceCard
            variant="glass"
            className="shadow-glass overflow-hidden rounded-[28px] border border-white/80 p-0"
          >
            <div className="border-b border-gray-100/80 bg-white/60 p-4 backdrop-blur-md sm:p-5">
              <h2 className="text-sm font-bold text-gray-900">
                Khoản đối soát và Yêu cầu giải ngân
              </h2>
            </div>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Chưa có khoản đối soát vận tải nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100/80 bg-white/60 font-bold text-gray-500 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3.5">Mã đơn / Đối soát</th>
                      <th className="px-5 py-3.5 text-right">Thực nhận</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {payouts.map((row) => (
                      <tr
                        key={String(row.payoutId)}
                        className="transition-colors hover:bg-white/60"
                      >
                        <td className="px-5 py-3.5">
                          <IdText id={String(row.orderId || row.payoutId)} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <MoneyText
                            amount={Number(row.hostAmount || 0)}
                            weight="extrabold"
                            variant="ink"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full border border-gray-200/80 bg-white/90 px-3 py-0.5 text-[11px] font-semibold text-gray-700 shadow-2xs">
                            {row.settlementSimulated === true
                              ? "Đã chi trả mô phỏng"
                              : payoutStatusLabels[String(row.status)] ||
                                String(row.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {["PENDING", "AVAILABLE"].includes(
                            String(row.status)
                          ) && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setSelectedPayoutToWithdraw(
                                  String(row.payoutId)
                                )
                              }
                              className="rounded-full bg-emerald-600 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
                            >
                              <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                              Yêu cầu rút
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>
        </>
      )}

      <Pagination
        currentPage={payoutPageIndex}
        totalPages={payoutPages}
        totalItems={payoutTotal}
        onPageChange={setPayoutPageIndex}
        disabled={loading}
      />

      {/* Confirm withdraw dialog */}
      <ConfirmDialog
        open={Boolean(selectedPayoutToWithdraw)}
        onOpenChange={(open) => !open && setSelectedPayoutToWithdraw(null)}
        title="Xác nhận yêu cầu rút tiền"
        description="Bạn có chắc chắn muốn gửi yêu cầu giải ngân khoản đối soát này về tài khoản ngân hàng của nhà xe?"
        confirmLabel="Gửi yêu cầu rút tiền"
        cancelLabel="Hủy"
        onConfirm={handleConfirmWithdraw}
      />
    </div>
  );
};
