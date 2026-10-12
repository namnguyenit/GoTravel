import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Coins,
  FileCheck2,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Scale,
  ArrowRight,
  Shield,
  FileText,
  DollarSign,
  User,
  Sliders,
  ChevronDown,
  ChevronRight,
  Send,
  Eye,
  X,
  CreditCard,
  Building2,
  AlertOctagon,
} from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { formatVnd } from '@/shared/domain/money.vo';
import {
  PageHeader,
  MetricCard,
  SurfaceCard,
  StatusBadge,
  MoneyText,
  IdText,
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingState,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Mode =
  | 'offers'
  | 'refunds'
  | 'cancellations'
  | 'reconciliation'
  | 'payouts'
  | 'accounts'
  | 'policies';

type Row = Record<string, any>;

const unwrapRows = (value: any): Row[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const messageOf = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'Thao tác chưa thể hoàn tất.';

const config: Record<
  Mode,
  { title: string; description: string; icon: React.ElementType }
> = {
  offers: {
    title: 'Kiểm duyệt Nội dung Bán vé',
    description: 'Duyệt, ẩn hoặc kích hoạt nội dung do nhà xe công bố trên Catalog GoTicket.',
    icon: FileCheck2,
  },
  refunds: {
    title: 'Hoàn tiền & Ngoại lệ Đơn vé',
    description: 'Xử lý các đơn vận tải cần can thiệp và lưu bằng chứng hoàn tiền thủ công.',
    icon: RotateCcw,
  },
  cancellations: {
    title: 'Điều phối Hủy chuyến',
    description: 'Hủy chuyến ở cấp quản trị và theo dõi tiến trình hoàn trả ghế, hủy vé, mở hoàn tiền.',
    icon: Ban,
  },
  reconciliation: {
    title: 'Đối soát & Hàng đợi Thông báo',
    description: 'Theo dõi sai lệch trạng thái đơn hàng, email sự cố và ngoại lệ đổi vé.',
    icon: Scale,
  },
  payouts: {
    title: 'Quyết toán Doanh thu & Hoa hồng',
    description: 'Đối soát số liệu, ghi nhận chi trả nhà xe và quản lý hoa hồng hệ thống.',
    icon: Coins,
  },
  accounts: {
    title: 'Tài khoản & Phân quyền',
    description: 'Tra cứu danh tính người dùng, khóa/mở tài khoản và phân quyền quản trị.',
    icon: AlertTriangle,
  },
  policies: {
    title: 'Chính sách Hệ thống',
    description: 'Cấu hình hoa hồng sàn và thông tin minh bạch các chính sách đang do máy chủ cố định.',
    icon: Scale,
  },
};

export const AdminOperationsPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [secondaryRows, setSecondaryRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Mode Specific States
  const [tripId, setTripId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelProgress, setCancelProgress] = useState<Row | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [commission, setCommission] = useState<Row | null>(null);
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionReason, setCommissionReason] = useState('');

  const [cashSummary, setCashSummary] = useState<Row | null>(null);
  const [cashShiftId, setCashShiftId] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const [exchangeOldOrderId, setExchangeOldOrderId] = useState('');
  const [exchangeNewOrderId, setExchangeNewOrderId] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeCase, setExchangeCase] = useState<Row | null>(null);

  // Dialog States replacing window.prompt
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    row: Row | null;
    amount: string;
    reference: string;
    evidenceUrl: string;
  }>({ open: false, row: null, amount: '', reference: '', evidenceUrl: '' });

  const [cashPaidDialog, setCashPaidDialog] = useState<{
    open: boolean;
    reference: string;
    evidenceUrl: string;
  }>({ open: false, reference: '', evidenceUrl: '' });

  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onSubmit: (note: string) => Promise<void>;
  }>({ open: false, title: '', description: '', onSubmit: async () => {} });

  const [noteInput, setNoteInput] = useState('');

  const [payoutDialog, setPayoutDialog] = useState<{
    open: boolean;
    row: Row | null;
    reference: string;
    evidenceUrl: string;
  }>({ open: false, row: null, reference: '', evidenceUrl: '' });

  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    userId: string;
    mode: 'GRANT' | 'REVOKE';
    role: string;
  }>({ open: false, userId: '', mode: 'GRANT', role: 'TICKET_VENDOR' });

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'primary' | 'warning';
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: 'Xác nhận',
    variant: 'primary',
    onConfirm: async () => {},
  });

  const page = config[mode];
  const Icon = page.icon;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'offers') {
        const data = await httpClient.get<any>('/api/v1/catalog/admin/listings', {
          params: { page: 0, size: 100 },
        });
        setRows(
          unwrapRows(data).filter(
            (row) =>
              String(row.category ?? row.listingType ?? row.providerType ?? '').toUpperCase().includes('TRANSPORT') ||
              String(row.metadata?.providerType ?? '').toUpperCase().includes('TRANSPORT')
          )
        );
        setSecondaryRows([]);
      } else if (mode === 'refunds') {
        const [orders, operations] = await Promise.all([
          httpClient.get<any>('/api/v1/orders/transport/admin/attention', { params: { page: 0, size: 100 } }),
          httpClient.get<any>('/api/v1/orders/transport/admin/item-operations/attention'),
        ]);
        setRows([
          ...unwrapRows(operations).map((row) => ({ ...row, _kind: 'ITEM_OPERATION' })),
          ...unwrapRows(orders).map((row) => ({ ...row, _kind: 'ORDER_REFUND' })),
        ]);
        setSecondaryRows([]);
      } else if (mode === 'reconciliation') {
        const [findings, notifications, exchanges] = await Promise.all([
          httpClient.get<any>('/api/v1/orders/transport/admin/reconciliation', { params: { limit: 100 } }),
          httpClient.get<any>('/api/v1/orders/transport/admin/notifications'),
          httpClient.get<any>('/api/v1/orders/transport/admin/exchanges/exceptions'),
        ]);
        setRows(unwrapRows(findings));
        setSecondaryRows([
          ...unwrapRows(notifications).map((row) => ({ ...row, _kind: 'NOTIFICATION' })),
          ...unwrapRows(exchanges).map((row) => ({ ...row, _kind: 'EXCHANGE' })),
        ]);
      } else if (mode === 'payouts') {
        const [payouts, currentCommission, currentCashSummary] = await Promise.all([
          httpClient.get<any>('/api/v1/payouts/all', { params: { page: 0, size: 100 } }),
          httpClient.get<any>('/api/v1/payouts/admin/commission'),
          httpClient.get<any>('/api/v1/payouts/transport/cash-summary'),
        ]);
        setRows(
          unwrapRows(payouts).filter((row) => String(row.providerType ?? '').toUpperCase() === 'TRANSPORT')
        );
        setCommission(currentCommission ?? null);
        setCommissionRate(String(currentCommission?.rate ?? ''));
        setCashSummary(currentCashSummary ?? null);
        setSecondaryRows([]);
      } else if (mode === 'accounts') {
        const data = await httpClient.get<any>('/api/v1/admin/users', { params: { page: 0, size: 100 } });
        setRows(unwrapRows(data));
        setSecondaryRows([]);
      } else if (mode === 'policies') {
        const currentCommission = await httpClient.get<any>('/api/v1/payouts/admin/commission');
        setCommission(currentCommission ?? null);
        setCommissionRate(String(currentCommission?.rate ?? ''));
        setRows([]);
        setSecondaryRows([]);
      } else {
        setRows([]);
        setSecondaryRows([]);
      }
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy('');
    }
  };

  const updateOffer = (row: Row, status: 'ACTIVE' | 'HIDDEN') => {
    const id = row.listingId ?? row.id;
    if (!id) return;
    setConfirmState({
      open: true,
      title: status === 'ACTIVE' ? 'Duyệt công bố vé?' : 'Ẩn nội dung vé?',
      description:
        status === 'ACTIVE'
          ? `Nội dung listing "${row.title ?? id}" sẽ được hiển thị trên catalog tìm kiếm cho khách hàng.`
          : `Nội dung listing "${row.title ?? id}" sẽ bị ẩn khỏi kết quả tìm kiếm vé.`,
      confirmText: status === 'ACTIVE' ? 'Duyệt công bố' : 'Ẩn nội dung',
      variant: status === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        await run(
          `offer-${id}`,
          () => httpClient.patch(`/api/v1/catalog/admin/listings/${id}/status?status=${status}`),
          `Đã chuyển nội dung sang ${status}.`
        );
      },
    });
  };

  const openRefundModal = (row: Row) => {
    const defaultAmount = String(row.plan?.refundDue ?? row.totalAmount ?? row.refundAmount ?? '');
    setRefundDialog({
      open: true,
      row,
      amount: defaultAmount,
      reference: '',
      evidenceUrl: '',
    });
  };

  const handleConfirmRefund = async () => {
    const { row, amount, reference, evidenceUrl } = refundDialog;
    if (!row || !amount.trim() || !reference.trim()) return;
    const id = row.plan?.operationId ?? row.orderId ?? row.id;
    const request =
      row._kind === 'ITEM_OPERATION'
        ? () =>
            httpClient.post(`/api/v1/orders/transport/admin/item-operations/${id}/refund`, {
              amount: amount.trim(),
              reference: reference.trim(),
              evidenceUrl: evidenceUrl.trim(),
              refundMethod: row.plan?.paymentMethod === 'CASH' ? 'CASH' : 'GOPAY',
              cashShiftId: row.plan?.originalCashShiftId ?? null,
            })
        : () =>
            httpClient.put(`/api/v1/orders/transport/admin/refunds/${id}/complete`, {
              amount: amount.trim(),
              reference: reference.trim(),
              evidenceUrl: evidenceUrl.trim(),
            });
    setRefundDialog((d) => ({ ...d, open: false }));
    await run(`refund-${id}`, request, 'Đã lưu bằng chứng hoàn tiền thành công.');
  };

  const submitCancellation = async () => {
    if (!tripId.trim() || !cancelReason.trim()) return;
    setBusy('cancel');
    setError(null);
    setNotice(null);
    try {
      const result = await httpClient.post<Row>(
        `/api/v1/trips/${tripId.trim()}/admin-cancellation`,
        { reason: cancelReason.trim() }
      );
      setCancelProgress(result);
      setNotice('Đã khởi tạo quy trình hủy chuyến xe. Tiến trình đang được saga xử lý.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy('');
    }
  };

  const checkCancellation = async () => {
    if (!tripId.trim()) return;
    setBusy('progress');
    setError(null);
    try {
      const res = await httpClient.get<Row>(
        `/api/v1/orders/transport/admin/trip-cancellations/${tripId.trim()}`
      );
      setCancelProgress(res);
      setNotice('Đã cập nhật trạng thái tiến trình hủy chuyến.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy('');
    }
  };

  const setAdminLifecycle = (status: 'DEPARTED' | 'COMPLETED') => {
    if (!tripId.trim()) return;
    setConfirmState({
      open: true,
      title: `Chuyển trạng thái chuyến sang ${status}?`,
      description: `Bạn có chắc chắn muốn can thiệp cập nhật trạng thái vòng đời chuyến ${tripId.trim()} thành ${status}?`,
      confirmText: `Xác nhận ${status}`,
      variant: 'primary',
      onConfirm: async () => {
        await run(
          `lifecycle-${status}`,
          () => httpClient.put(`/api/v1/trips/${tripId.trim()}/admin-lifecycle`, { status }),
          `Đã chuyển chuyến xe sang ${status}.`
        );
      },
    });
  };

  const createAssistedExchange = async () => {
    if (!exchangeOldOrderId.trim() || !exchangeNewOrderId.trim() || !exchangeReason.trim()) return;
    setBusy('exchange-create');
    setError(null);
    try {
      const res = await httpClient.post<Row>('/api/v1/orders/transport/admin/exchanges', {
        oldOrderId: exchangeOldOrderId.trim(),
        newOrderId: exchangeNewOrderId.trim(),
        reason: exchangeReason.trim(),
      });
      setExchangeCase(res);
      setNotice('Đã tạo hồ sơ đổi vé hỗ trợ thành công.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy('');
    }
  };

  const saveCommission = () => {
    const rate = Number(commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      setError('Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 0.5 (tối đa 50%).');
      return;
    }
    setConfirmState({
      open: true,
      title: 'Lưu thay đổi tỷ lệ hoa hồng?',
      description: `Tỷ lệ hoa hồng mới sẽ là ${(rate * 100).toFixed(2)}%. Thao tác này sẽ ảnh hưởng đến các đơn vé phát sinh tiếp theo.`,
      confirmText: 'Lưu hoa hồng',
      variant: 'primary',
      onConfirm: async () => {
        await run(
          'commission',
          () =>
            httpClient.put('/api/v1/payouts/admin/commission', {
              rate,
              reason: commissionReason.trim() || 'Cập nhật từ cổng quản trị vận tải GoTicket',
            }),
          'Đã cập nhật tỷ lệ hoa hồng hệ thống thành công.'
        );
      },
    });
  };

  const markCashCommissionPaid = () => {
    if (!cashShiftId.trim() || !cashAmount.trim()) {
      setError('Vui lòng nhập mã ca và số tiền hoa hồng cần ghi nhận.');
      return;
    }
    setCashPaidDialog({
      open: true,
      reference: '',
      evidenceUrl: '',
    });
  };

  const handleConfirmCashPaid = async () => {
    const { reference, evidenceUrl } = cashPaidDialog;
    if (!reference.trim()) return;
    setCashPaidDialog((d) => ({ ...d, open: false }));
    await run(
      'cash-paid',
      () =>
        httpClient.put(
          `/api/v1/payouts/transport/cash-settlements/${cashShiftId.trim()}/mark-paid`,
          {
            amount: cashAmount,
            reference: reference.trim(),
            evidenceUrl: evidenceUrl.trim(),
          }
        ),
      'Đã ghi nhận hoa hồng tiền mặt của ca thành công.'
    );
  };

  const openPayoutModal = (row: Row) => {
    setPayoutDialog({
      open: true,
      row,
      reference: '',
      evidenceUrl: '',
    });
  };

  const handleConfirmPayout = async () => {
    const { row, reference, evidenceUrl } = payoutDialog;
    if (!row || !reference.trim()) return;
    const id = row.payoutId ?? row.id;
    setPayoutDialog((d) => ({ ...d, open: false }));
    await run(
      `paid-${id}`,
      () =>
        httpClient.put(`/api/v1/payouts/transport/${id}/mark-paid`, {
          amount: row.hostAmount,
          reference: reference.trim(),
          evidenceUrl: evidenceUrl.trim(),
        }),
      'Đã ghi nhận quyết toán chi trả cho nhà xe.'
    );
  };

  const handleConfirmRoleChange = async () => {
    const { userId, mode, role } = roleDialog;
    if (!userId || !role) return;
    setRoleDialog((d) => ({ ...d, open: false }));
    if (mode === 'GRANT') {
      await run(
        `grant-${userId}`,
        () => httpClient.post(`/api/v1/admin/users/${userId}/role?role=${encodeURIComponent(role.trim().toUpperCase())}`),
        `Đã cấp vai trò ${role} cho người dùng.`
      );
    } else {
      await run(
        `revoke-${userId}`,
        () => httpClient.post(`/api/v1/admin/users/${userId}/revokerole?role=${encodeURIComponent(role.trim().toUpperCase())}`),
        `Đã thu hồi vai trò ${role} của người dùng.`
      );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title={page.title}
        description={page.description}
        breadcrumbs={[
          { label: 'Admin GoTicket', to: '/admin' },
          { label: page.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-coral-soft text-coral text-xs font-semibold">
              {rows.length} mục dữ liệu
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </Button>
          </div>
        }
      />

      {/* Notifications and Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* MODE 1: CANCELLATIONS */}
      {mode === 'cancellations' && (
        <div className="space-y-6">
          <SurfaceCard className="p-6 space-y-4">
            <h2 className="font-serif font-bold text-base text-ink flex items-center gap-2">
              <Ban className="w-5 h-5 text-coral" />
              <span>Khởi tạo Hủy chuyến cấp Quản trị</span>
            </h2>
            <p className="text-xs text-muted">
              Hủy toàn bộ chuyến xe, tự động giải phóng ghế, đánh dấu hủy vé và chuyển các đơn đã thanh toán sang trạng thái hoàn tiền saga.
            </p>

            <div className="grid gap-4 sm:grid-cols-[1fr_1.8fr]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Mã UUID Chuyến xe</label>
                <input
                  type="text"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  placeholder="Nhập UUID chuyến xe cần hủy..."
                  className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Lý do hủy chuyến (bắt buộc)</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Lý do hủy chuyến (Ví dụ: Thời tiết bão lũ, sự cố kỹ thuật xe...)"
                  maxLength={500}
                  className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== '' || !tripId.trim()}
                  onClick={() => void checkCancellation()}
                >
                  Kiểm tra tiến trình
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== '' || !tripId.trim()}
                  onClick={() => setAdminLifecycle('DEPARTED')}
                >
                  Đánh dấu Đã khởi hành
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== '' || !tripId.trim()}
                  onClick={() => setAdminLifecycle('COMPLETED')}
                >
                  Đánh dấu Hoàn thành
                </Button>
              </div>

              <Button
                variant="destructive"
                size="sm"
                disabled={busy !== '' || !tripId.trim() || !cancelReason.trim()}
                onClick={() => void submitCancellation()}
              >
                Hủy chuyến xe
              </Button>
            </div>
          </SurfaceCard>

          {/* Cancellation Progress Structured Card */}
          {cancelProgress && (
            <SurfaceCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-serif font-bold text-base text-ink">
                    Tiến trình Hủy chuyến Saga
                  </h3>
                  <p className="text-xs text-muted">
                    Trạng thái phân tán: Giải phóng ghế & hoàn tiền đơn hàng
                  </p>
                </div>
                <StatusBadge
                  status={String(cancelProgress.status ?? cancelProgress.state ?? 'PROCESSING')}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[10px] text-muted font-bold uppercase">Mã chuyến</span>
                  <IdText id={tripId} />
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[10px] text-muted font-bold uppercase">Số vé đã xử lý</span>
                  <span className="text-sm font-bold text-ink block mt-0.5">
                    {cancelProgress.processedTickets ?? cancelProgress.refundedCount ?? '—'}
                  </span>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[10px] text-muted font-bold uppercase">Tổng tiền hoàn</span>
                  <span className="text-sm font-bold text-coral block mt-0.5">
                    {formatVnd(String(cancelProgress.totalRefundAmount ?? 0))}
                  </span>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3">
                  <span className="text-[10px] text-muted font-bold uppercase">Lỗi ngoại lệ</span>
                  <span className="text-sm font-bold text-rose-600 block mt-0.5">
                    {cancelProgress.errors?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Technical Details Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral hover:underline"
                >
                  {showTechnicalDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>{showTechnicalDetails ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật (Saga Payload)'}</span>
                </button>

                {showTechnicalDetails && (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-line bg-canvas p-4 text-[11px] font-mono text-ink">
                    {JSON.stringify(cancelProgress, null, 2)}
                  </pre>
                )}
              </div>
            </SurfaceCard>
          )}
        </div>
      )}

      {/* MODE 2 & 7: POLICIES & PAYOUTS COMMISSION BAR */}
      {(mode === 'payouts' || mode === 'policies') && (
        <SurfaceCard className="p-6 space-y-4">
          <div className="space-y-0.5">
            <h2 className="font-serif font-bold text-base text-ink flex items-center gap-2">
              <Coins className="w-5 h-5 text-coral" />
              <span>Cấu hình Tỷ lệ Hoa hồng Sàn GoTicket</span>
            </h2>
            <p className="text-xs text-muted">
              Tỷ lệ phần trăm doanh thu sàn khấu trừ trên mỗi vé bán thành công.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Tỷ lệ hoa hồng (0 – 0.5)
              </label>
              <input
                type="number"
                min="0"
                max="0.5"
                step="0.0001"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-40 h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>

            <div className="space-y-1 flex-1 min-w-[240px]">
              <label className="text-xs font-semibold text-ink">
                Lý do điều chỉnh chính sách
              </label>
              <input
                type="text"
                value={commissionReason}
                onChange={(e) => setCommissionReason(e.target.value)}
                placeholder={String(commission?.reason ?? 'Nhập lý do thay đổi...')}
                className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              disabled={busy !== ''}
              onClick={saveCommission}
            >
              Lưu hoa hồng
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* CASH COMMISSION SETTLEMENT FOR PAYOUTS */}
      {mode === 'payouts' && (
        <SurfaceCard className="p-6 space-y-4">
          <div className="space-y-0.5">
            <h2 className="font-serif font-bold text-base text-ink flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-coral" />
              <span>Đối soát & Quyết toán Hoa hồng Tiền mặt</span>
            </h2>
            <p className="text-xs text-muted">
              Tổng kết thu chi ca bán vé tiền mặt tại quầy của các đối tác nhà xe.
            </p>
          </div>

          {/* KPI Grid */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 pt-1">
            {[
              { label: 'Số ca tiền mặt', key: 'shifts', isMoney: false },
              { label: 'Tổng doanh số', key: 'grossAmount', isMoney: true },
              { label: 'Đã hoàn tiền', key: 'refundedAmount', isMoney: true },
              { label: 'Hoa hồng phải thu', key: 'commissionDue', isMoney: true },
              { label: 'Hoa hồng đã nộp', key: 'commissionPaid', isMoney: true },
              { label: 'Còn thiếu', key: 'outstandingAmount', isMoney: true },
            ].map(({ label, key, isMoney }) => (
              <div key={key} className="rounded-xl border border-line bg-canvas p-3">
                <span className="block text-[10px] font-bold uppercase text-muted">
                  {label}
                </span>
                <strong className="mt-1 block text-sm font-bold text-ink">
                  {isMoney
                    ? formatVnd(String(cashSummary?.[key] ?? 0))
                    : String(cashSummary?.[key] ?? 0)}
                </strong>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-line">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Mã ca tiền mặt</label>
              <input
                type="text"
                value={cashShiftId}
                onChange={(e) => setCashShiftId(e.target.value)}
                placeholder="UUID ca tiền mặt..."
                className="w-64 h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Số tiền hoa hồng</label>
              <input
                type="text"
                inputMode="numeric"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Số tiền VND..."
                className="w-44 h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={busy !== ''}
              onClick={markCashCommissionPaid}
            >
              Ghi nhận đã nộp
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* BACKEND-FIXED POLICIES NOTICE */}
      {mode === 'policies' && (
        <SurfaceCard className="p-6 space-y-2 border-amber-200 bg-amber-50/60">
          <h2 className="font-serif font-bold text-base text-amber-950 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-700" />
            <span>Chính sách nghiệp vụ được backend kiểm soát</span>
          </h2>
          <p className="text-xs text-amber-900 leading-relaxed">
            Các chính sách như thời hạn giữ ghế tạm (hold TTL: 15 phút), điều kiện đổi vé, phí hủy vé tự động, thuế VAT và mã giảm giá hiện đang được cố định an toàn trong logic nghiệp vụ của backend. Giao diện không dựng các biểu mẫu lưu cấu hình giả lập.
          </p>
        </SurfaceCard>
      )}

      {/* MAIN DATA TABLE FOR GENERAL MODES */}
      {mode !== 'cancellations' && mode !== 'policies' && (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
            <h2 className="font-serif font-bold text-base text-ink">
              Danh sách Hồ sơ Vận hành ({rows.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12">
              <LoadingState message="Đang tải dữ liệu hồ sơ..." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="Không có hồ sơ nào cần xử lý"
                description="Tất cả các nghiệp vụ trong phân hệ này đã được đồng bộ hoàn tất."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-canvas/70 font-semibold text-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Mã ID</th>
                    <th className="px-5 py-3.5">Đối tượng</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5">Chi tiết / Giá trị</th>
                    <th className="px-5 py-3.5 text-right">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rows.map((row, index) => {
                    const id =
                      row.listingId ??
                      row.payoutId ??
                      row.plan?.operationId ??
                      row.orderId ??
                      row.id ??
                      `${mode}-${index}`;
                    const status =
                      row.status ??
                      row.state ??
                      row.code ??
                      row.severity ??
                      (row.isActive === false ? 'BANNED' : 'ACTIVE');

                    return (
                      <tr key={String(id)} className="hover:bg-coral-soft/20 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-ink">
                          <IdText id={id} />
                        </td>
                        <td className="px-5 py-4">
                          <strong className="block text-ink text-xs font-semibold">
                            {row.title ?? row.name ?? row.orderNumber ?? row.providerType ?? row.message ?? 'Hồ sơ vận tải'}
                          </strong>
                          <span className="text-muted text-[11px] block mt-0.5">
                            {row.hostId
                              ? `Nhà cung cấp: ${String(row.hostId).slice(0, 8)}...`
                              : row.createdAt
                              ? new Date(row.createdAt).toLocaleString('vi-VN')
                              : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={String(status)} size="sm" />
                        </td>
                        <td className="px-5 py-4 text-muted max-w-sm">
                          {mode === 'payouts' ? (
                            <MoneyText
                              amount={row.hostAmount ?? row.totalAmount ?? 0}
                              variant="coral"
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-ink block">
                              {String(row.description ?? row.reason ?? row.detail ?? row.totalAmount ?? '—')}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Offers actions */}
                            {mode === 'offers' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => updateOffer(row, 'ACTIVE')}
                                  className="h-7 text-xs"
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => updateOffer(row, 'HIDDEN')}
                                  className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  Ẩn
                                </Button>
                              </>
                            )}

                            {/* Refunds order refund actions */}
                            {mode === 'refunds' && row._kind === 'ORDER_REFUND' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    void run(
                                      `review-${id}`,
                                      () => httpClient.put(`/api/v1/orders/transport/admin/refunds/${id}/open-paid-review`),
                                      'Đã mở hồ sơ rà soát hoàn tiền.'
                                    )
                                  }
                                  className="h-7 text-xs"
                                >
                                  Mở rà soát
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => openRefundModal(row)}
                                  className="h-7 text-xs"
                                >
                                  Ghi nhận hoàn
                                </Button>
                              </>
                            )}

                            {/* Refunds item operation actions */}
                            {mode === 'refunds' && row._kind === 'ITEM_OPERATION' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    void run(
                                      `retry-${id}`,
                                      () => httpClient.post(`/api/v1/orders/transport/admin/item-operations/${id}/retry`),
                                      'Đã yêu cầu worker xử lý lại nghiệp vụ.'
                                    )
                                  }
                                  className="h-7 text-xs"
                                >
                                  Chạy lại
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    void run(
                                      `abort-${id}`,
                                      () => httpClient.post(`/api/v1/orders/transport/admin/item-operations/${id}/abort`),
                                      'Đã yêu cầu dừng nghiệp vụ.'
                                    )
                                  }
                                  className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  Dừng
                                </Button>
                                {Number(row.plan?.refundDue ?? 0) > 0 && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    disabled={busy !== ''}
                                    onClick={() => openRefundModal(row)}
                                    className="h-7 text-xs"
                                  >
                                    Ghi nhận hoàn
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Reconciliation actions */}
                            {mode === 'reconciliation' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    void run(
                                      `refresh-${id}`,
                                      () => httpClient.put(`/api/v1/orders/transport/admin/reconciliation/${row.orderId ?? id}/refresh`),
                                      'Đã quét lại đơn hàng thành công.'
                                    )
                                  }
                                  className="h-7 text-xs"
                                >
                                  Quét lại
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => {
                                    setNoteInput('');
                                    setNoteDialog({
                                      open: true,
                                      title: 'Ghi chú xử lý đối soát',
                                      description: `Nhập ghi chú cho mã đơn ${row.orderId ?? id} và mã lỗi ${row.code}`,
                                      onSubmit: async (note) => {
                                        await run(
                                          `note-${id}`,
                                          () => httpClient.post(`/api/v1/orders/transport/admin/reconciliation/${row.orderId ?? id}/${row.code}/notes`, { note }),
                                          'Đã lưu ghi chú đối soát.'
                                        );
                                      },
                                    });
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Ghi chú
                                </Button>
                              </>
                            )}

                            {/* Payouts actions */}
                            {mode === 'payouts' && String(row.status).toUpperCase() !== 'PAID' && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={busy !== ''}
                                onClick={() => openPayoutModal(row)}
                                className="h-7 text-xs"
                              >
                                Đánh dấu đã chi
                              </Button>
                            )}

                            {/* Accounts actions */}
                            {mode === 'accounts' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => {
                                    const nextStatus = row.isActive === false ? 'ACTIVE' : 'BANNED';
                                    setConfirmState({
                                      open: true,
                                      title: nextStatus === 'ACTIVE' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
                                      description: `Xác nhận ${nextStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'} tài khoản người dùng ${row.username ?? id}?`,
                                      confirmText: nextStatus === 'ACTIVE' ? 'Mở khóa' : 'Khóa tài khoản',
                                      variant: nextStatus === 'ACTIVE' ? 'primary' : 'danger',
                                      onConfirm: async () => {
                                        await run(
                                          `status-${id}`,
                                          () => httpClient.put(`/api/v1/admin/accounts/${id}/status`, { status: nextStatus }),
                                          nextStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.'
                                        );
                                      },
                                    });
                                  }}
                                  className={`h-7 text-xs ${
                                    row.isActive === false
                                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                      : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                  }`}
                                >
                                  {row.isActive === false ? 'Mở khóa' : 'Khóa'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    setRoleDialog({
                                      open: true,
                                      userId: id,
                                      mode: 'GRANT',
                                      role: 'TICKET_VENDOR',
                                    })
                                  }
                                  className="h-7 text-xs"
                                >
                                  Cấp quyền
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() =>
                                    setRoleDialog({
                                      open: true,
                                      userId: id,
                                      mode: 'REVOKE',
                                      role: 'TICKET_VENDOR',
                                    })
                                  }
                                  className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                >
                                  Thu hồi
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      )}

      {/* SECONDARY ROWS FOR RECONCILIATION */}
      {mode === 'reconciliation' && secondaryRows.length > 0 && (
        <SurfaceCard className="p-6 space-y-4">
          <h2 className="font-serif font-bold text-base text-ink">
            Thông báo Lỗi & Ngoại lệ Đổi vé ({secondaryRows.length})
          </h2>
          <div className="space-y-2.5">
            {secondaryRows.map((row, index) => {
              const id = row.eventId ?? row.oldOrderId ?? row.id ?? index;
              return (
                <div
                  key={`${row._kind}-${id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3.5 text-xs"
                >
                  <div>
                    <strong className="text-ink font-semibold">
                      {row._kind === 'NOTIFICATION' ? 'Thông báo email chưa gửi' : 'Ngoại lệ đổi vé'}
                    </strong>
                    <p className="mt-0.5 text-muted">
                      {row.message ?? row.reason ?? String(id)}
                    </p>
                  </div>
                  {row._kind === 'NOTIFICATION' ? (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={busy !== ''}
                      onClick={() =>
                        void run(
                          `notification-${id}`,
                          () => httpClient.post(`/api/v1/orders/transport/admin/notifications/${id}/retry`),
                          'Đã đưa thông báo vào hàng đợi gửi lại.'
                        )
                      }
                      className="h-7 text-xs"
                    >
                      Gửi lại
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy !== ''}
                      onClick={() => {
                        setNoteInput('');
                        setNoteDialog({
                          open: true,
                          title: 'Đóng ngoại lệ đổi vé',
                          description: 'Nhập kết luận xử lý để hoàn tất đóng ngoại lệ',
                          onSubmit: async (note) => {
                            await run(
                              `exchange-${id}`,
                              () => httpClient.post(`/api/v1/orders/transport/admin/exchanges/${row.oldOrderId ?? id}/resolve-exception`, { note }),
                              'Đã đóng ngoại lệ đổi vé.'
                            );
                          },
                        });
                      }}
                      className="h-7 text-xs"
                    >
                      Đóng ngoại lệ
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </SurfaceCard>
      )}

      {/* ASSISTED EXCHANGE FORM */}
      {mode === 'reconciliation' && (
        <SurfaceCard className="p-6 space-y-4">
          <div className="space-y-0.5">
            <h2 className="font-serif font-bold text-base text-ink">
              Đổi vé Hỗ trợ Giữa hai Đơn đã Thanh toán
            </h2>
            <p className="text-xs text-muted">
              Dành cho hồ sơ legacy cần đối chiếu thủ công; luồng đổi từng vé của khách vẫn chạy qua item operation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Mã đơn cũ</label>
              <input
                type="text"
                value={exchangeOldOrderId}
                onChange={(e) => setExchangeOldOrderId(e.target.value)}
                placeholder="UUID đơn cũ..."
                className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Mã đơn mới</label>
              <input
                type="text"
                value={exchangeNewOrderId}
                onChange={(e) => setExchangeNewOrderId(e.target.value)}
                placeholder="UUID đơn mới..."
                className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Lý do hỗ trợ</label>
              <input
                type="text"
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                placeholder="Lý do đổi vé hỗ trợ..."
                className="w-full h-10 px-3 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none"
              />
            </div>
          </div>

          <Button
            variant="default"
            size="sm"
            disabled={
              busy !== '' ||
              !exchangeOldOrderId.trim() ||
              !exchangeNewOrderId.trim() ||
              !exchangeReason.trim()
            }
            onClick={() => void createAssistedExchange()}
          >
            Tạo hồ sơ đổi vé
          </Button>

          {exchangeCase && (
            <div className="mt-3 rounded-xl border border-line bg-canvas p-4 text-xs font-mono text-ink">
              <h4 className="font-bold mb-2">Hồ sơ đổi vé đã tạo:</h4>
              <pre>{JSON.stringify(exchangeCase, null, 2)}</pre>
            </div>
          )}
        </SurfaceCard>
      )}

      {/* DIALOG 1: REFUND FORM DIALOG */}
      <Dialog
        open={refundDialog.open}
        onOpenChange={(open) => setRefundDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              Ghi nhận Hoàn tiền Thủ công
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Nhập chứng từ và số tiền hoàn trả cho khách hàng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-ink">Số tiền hoàn (VND) *</label>
              <input
                type="text"
                value={refundDialog.amount}
                onChange={(e) =>
                  setRefundDialog((d) => ({ ...d, amount: e.target.value }))
                }
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-ink">Mã tham chiếu giao dịch *</label>
              <input
                type="text"
                value={refundDialog.reference}
                onChange={(e) =>
                  setRefundDialog((d) => ({ ...d, reference: e.target.value }))
                }
                placeholder="Ví dụ: REFUND_VNPAY_123456"
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-ink">Đường dẫn bằng chứng / biên lai</label>
              <input
                type="text"
                value={refundDialog.evidenceUrl}
                onChange={(e) =>
                  setRefundDialog((d) => ({ ...d, evidenceUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundDialog((d) => ({ ...d, open: false }))}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!refundDialog.amount.trim() || !refundDialog.reference.trim()}
              onClick={handleConfirmRefund}
            >
              Lưu bằng chứng hoàn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: CASH COMMISSION MARK PAID */}
      <Dialog
        open={cashPaidDialog.open}
        onOpenChange={(open) => setCashPaidDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              Ghi nhận Nộp Hoa hồng Tiền mặt
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Xác nhận đã thu hoa hồng cho ca #{cashShiftId} với số tiền {formatVnd(cashAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-ink">Mã tham chiếu chứng từ *</label>
              <input
                type="text"
                value={cashPaidDialog.reference}
                onChange={(e) =>
                  setCashPaidDialog((d) => ({ ...d, reference: e.target.value }))
                }
                placeholder="Ví dụ: CASH_RECEIPT_0987"
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-ink">Đường dẫn biên lai</label>
              <input
                type="text"
                value={cashPaidDialog.evidenceUrl}
                onChange={(e) =>
                  setCashPaidDialog((d) => ({ ...d, evidenceUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashPaidDialog((d) => ({ ...d, open: false }))}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!cashPaidDialog.reference.trim()}
              onClick={handleConfirmCashPaid}
            >
              Xác nhận đã nộp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: NOTE DIALOG */}
      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => setNoteDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              {noteDialog.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              {noteDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Nhập nội dung ghi chú..."
              className="w-full p-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteDialog((d) => ({ ...d, open: false }))}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!noteInput.trim()}
              onClick={async () => {
                const text = noteInput.trim();
                setNoteDialog((d) => ({ ...d, open: false }));
                await noteDialog.onSubmit(text);
              }}
            >
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: PAYOUT MARK PAID */}
      <Dialog
        open={payoutDialog.open}
        onOpenChange={(open) => setPayoutDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              Đánh dấu Đã Chi trả Quyết toán
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Xác nhận lệnh chuyển khoản cho đối tác nhà xe với số tiền {formatVnd(String(payoutDialog.row?.hostAmount ?? 0))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-ink">Mã tham chiếu ngân hàng *</label>
              <input
                type="text"
                value={payoutDialog.reference}
                onChange={(e) =>
                  setPayoutDialog((d) => ({ ...d, reference: e.target.value }))
                }
                placeholder="Ví dụ: FT2310129994"
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-ink">Đường dẫn ủy nhiệm chi / biên lai</label>
              <input
                type="text"
                value={payoutDialog.evidenceUrl}
                onChange={(e) =>
                  setPayoutDialog((d) => ({ ...d, evidenceUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full h-9 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayoutDialog((d) => ({ ...d, open: false }))}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!payoutDialog.reference.trim()}
              onClick={handleConfirmPayout}
            >
              Xác nhận đã chi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: ROLE ASSIGNMENT */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) => setRoleDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              {roleDialog.mode === 'GRANT' ? 'Cấp Vai trò Người dùng' : 'Thu hồi Vai trò'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Tài khoản #{roleDialog.userId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-ink">Chọn vai trò</label>
              <select
                aria-label="Chọn vai trò người dùng"
                value={roleDialog.role}
                onChange={(e) =>
                  setRoleDialog((d) => ({ ...d, role: e.target.value }))
                }
                className="w-full h-10 px-3 bg-canvas border border-line rounded-xl focus:border-coral focus:outline-none text-ink"
              >
                <option value="TICKET_VENDOR">TICKET_VENDOR (Chủ nhà xe)</option>
                <option value="STAFF">STAFF (Nhân viên vận hành)</option>
                <option value="ADMIN">ADMIN (Quản trị viên)</option>
                <option value="USER">USER (Khách hàng thông thường)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleDialog((d) => ({ ...d, open: false }))}
            >
              Hủy
            </Button>
            <Button
              variant={roleDialog.mode === 'GRANT' ? 'default' : 'destructive'}
              size="sm"
              onClick={handleConfirmRoleChange}
            >
              {roleDialog.mode === 'GRANT' ? 'Cấp quyền' : 'Thu hồi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GENERAL CONFIRM DIALOG */}
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((c) => ({ ...c, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        loading={busy !== ''}
      />
    </div>
  );
};
