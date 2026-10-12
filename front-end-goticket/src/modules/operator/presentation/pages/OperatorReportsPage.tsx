import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Ticket, WalletCards, ArrowUpRight } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { formatVnd } from '@/shared/domain/money.vo';
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
} from '@/shared/presentation/components';

const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const initialFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return dateInput(date);
};

export const OperatorReportsPage: React.FC = () => {
  const [from, setFrom] = useState(initialFrom());
  const [to, setTo] = useState(dateInput(new Date()));
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Withdraw confirm dialog
  const [selectedPayoutToWithdraw, setSelectedPayoutToWithdraw] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [reportData, payoutPage] = await Promise.all([
        httpClient.get<Record<string, unknown>>('/api/v1/orders/transport/vendor/reports', {
          params: { from, to },
        }),
        httpClient.get<any>('/api/v1/payouts/me', { params: { page: 0, size: 50 } }),
      ]);
      setReport(reportData);
      setPayouts(
        Array.isArray(payoutPage?.content)
          ? payoutPage.content.filter((row: any) => row.providerType === 'TRANSPORT')
          : []
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo vận hành.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = Array.isArray(report?.ordersByMethodAndStatus)
    ? (report.ordersByMethodAndStatus as Array<Record<string, unknown>>)
    : [];
  const totalOrders = rows.reduce((sum, row) => sum + Number(row.order_count || 0), 0);
  const totalBooked = rows.reduce((sum, row) => sum + Number(row.booked_amount || 0), 0);
  const totalRefunded = rows.reduce((sum, row) => sum + Number(row.refunded_amount || 0), 0);

  const handleConfirmWithdraw = async () => {
    if (!selectedPayoutToWithdraw) return;
    setWithdrawing(true);
    setError('');
    try {
      await httpClient.post(`/api/v1/payouts/transport/${selectedPayoutToWithdraw}/withdraw`);
      setSelectedPayoutToWithdraw(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể gửi yêu cầu rút tiền.');
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
      <SurfaceCard className="p-5 flex flex-wrap items-end gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--gt-muted)] mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="block rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--gt-muted)] mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="block rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
          />
        </div>
        <Button
          onClick={() => void load()}
          disabled={loading}
          className="bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-2xl text-xs font-bold px-4"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Cập nhật số liệu
        </Button>
      </SurfaceCard>

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi báo cáo"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {loading ? (
        <SurfaceCard className="p-12 text-center">
          <LoadingState message="Đang tổng hợp báo cáo tài chính..." />
        </SurfaceCard>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Đơn vé trong kỳ"
              value={totalOrders.toLocaleString('vi-VN')}
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
          <SurfaceCard className="overflow-hidden p-0">
            <div className="border-b border-[var(--gt-border)] p-4 sm:p-5">
              <h2 className="font-bold text-sm text-[var(--gt-ink)]">
                Phân bổ theo Phương thức thanh toán & Trạng thái
              </h2>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--gt-muted)]">
                Chưa có dữ liệu giao dịch trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--gt-canvas)] font-bold text-[var(--gt-muted)] border-b border-[var(--gt-border)]">
                    <tr>
                      <th className="px-5 py-3.5">Phương thức</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right">Số đơn</th>
                      <th className="px-5 py-3.5 text-right">Tổng giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gt-border)]">
                    {rows.map((row, index) => (
                      <tr key={index} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-[var(--gt-ink)]">
                          {String(row.payment_method || '—')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full bg-[var(--gt-canvas)] border border-[var(--gt-border)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--gt-ink)]">
                            {String(row.status || '—')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium">
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
          <SurfaceCard className="overflow-hidden p-0">
            <div className="border-b border-[var(--gt-border)] p-4 sm:p-5">
              <h2 className="font-bold text-sm text-[var(--gt-ink)]">
                Khoản đối soát và Yêu cầu giải ngân
              </h2>
            </div>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--gt-muted)]">
                Chưa có khoản đối soát vận tải nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--gt-canvas)] font-bold text-[var(--gt-muted)] border-b border-[var(--gt-border)]">
                    <tr>
                      <th className="px-5 py-3.5">Mã đơn / Đối soát</th>
                      <th className="px-5 py-3.5 text-right">Thực nhận</th>
                      <th className="px-5 py-3.5">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gt-border)]">
                    {payouts.map((row) => (
                      <tr key={String(row.payoutId)} className="hover:bg-stone-50 transition-colors">
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
                          <span className="rounded-full bg-[var(--gt-canvas)] border border-[var(--gt-border)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--gt-ink)]">
                            {String(row.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {['PENDING', 'AVAILABLE'].includes(String(row.status)) && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedPayoutToWithdraw(String(row.payoutId))}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
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
