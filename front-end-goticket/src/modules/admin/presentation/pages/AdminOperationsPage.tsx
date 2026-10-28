import { AdminPayoutsPage } from './AdminPayoutsPage';
import { TransportCommissionSettings } from './TransportCommissionSettings';
import { AdminStatusBadge as StatusBadge } from './AdminStatusBadge';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Coins,
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
  MoneyText,
  IdText,
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Pagination,
  DateTimeText,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';

type Mode =
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
  cancellations: {
    title: 'Điều phối Hủy chuyến',
    description:
      'Hủy chuyến ở cấp quản trị và theo dõi tiến trình hoàn trả ghế, hủy vé, mở hoàn tiền.',
    icon: Ban,
  },
  reconciliation: {
    title: 'Đối soát & Hàng đợi Thông báo',
    description:
      'Một đơn có thể có nhiều cảnh báo. Hệ thống tự đóng cảnh báo khi đối chiếu lại đã khớp; ghi chú chỉ lưu nội dung xử lý. Theo dõi riêng email chờ gửi và ngoại lệ đổi vé.',
    icon: Scale,
  },
  payouts: {
    title: 'Quyết toán Doanh thu & Hoa hồng',
    description:
      'Đối soát số liệu, ghi nhận chi trả nhà xe và quản lý hoa hồng hệ thống.',
    icon: Coins,
  },
  accounts: {
    title: 'Tài khoản & Phân quyền',
    description:
      'Danh tính dùng chung GoTravel / GoTicket. Khóa tài khoản ảnh hưởng toàn hệ sinh thái; quyền nhà xe qua duyệt KYC, nhân viên do nhà xe phân công.',
    icon: AlertTriangle,
  },
  policies: {
    title: 'Chính sách Hệ thống',
    description:
      'Cấu hình hoa hồng sàn và thông tin minh bạch các chính sách đang do máy chủ cố định.',
    icon: Scale,
  },
};

const AdminOperationsContent: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { user: currentUser } = useAuth();
  const [listPage, setListPage] = useState(1);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const sequence = useRef(0);
  const busyRef = useRef(false);
  const [tripPreview, setTripPreview] = useState<Row | null>(null);
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

  const [cashSummary, setCashSummary] = useState<Row | null>(null);
  const [cashShiftId, setCashShiftId] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const [exchangeOldOrderId, setExchangeOldOrderId] = useState('');
  const [exchangeNewOrderId, setExchangeNewOrderId] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeCase, setExchangeCase] = useState<Row | null>(null);

  // Dialog States replacing window.prompt
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
  }>({ open: false, userId: '', mode: 'GRANT', role: 'USER' });

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
    const current = ++sequence.current;
    setLoading(true);
    setError(null);
    const fetch = async <T,>(
      url: string,
      options?: Parameters<typeof httpClient.get>[1],
    ): Promise<T> => {
      const data = await httpClient.get<T>(url, options);
      if (sequence.current !== current) throw new Error('STALE_REQUEST');
      return data;
    };
    try {
      if (mode === 'reconciliation') {
        const [findings, notifications, exchanges] = await Promise.all([
          fetch<any>('/api/v1/orders/transport/admin/reconciliation', {
            params: { limit: 100 },
          }),
          fetch<any>('/api/v1/orders/transport/admin/notifications'),
          fetch<any>('/api/v1/orders/transport/admin/exchanges/exceptions'),
        ]);
        setRows(unwrapRows(findings));
        setSecondaryRows([
          ...unwrapRows(notifications).map((row) => ({
            ...row,
            eventId: row.id,
            message: row.last_error || `Email ${row.kind}: ${row.status}`,
            _kind: 'NOTIFICATION',
          })),
          ...unwrapRows(exchanges).map((row) => ({
            ...row,
            oldOrderId: row.old_order_id,
            newOrderId: row.new_order_id,
            message: row.last_error,
            _kind: 'EXCHANGE',
          })),
        ]);
      } else if (mode === 'payouts') {
        const [payouts, , currentCashSummary] = await Promise.all([
          fetch<any>('/api/v1/payouts/all', {
            params: {
              page: listPage - 1,
              size: 20,
              providerType: 'TRANSPORT',
            },
          }),
          fetch<any>('/api/v1/payouts/transport/commission'),
          fetch<any>('/api/v1/payouts/transport/cash-summary'),
        ]);
        setRows(unwrapRows(payouts));
        setTotalPages(payouts.totalPages ?? 0);
        setTotalItems(payouts.totalElements ?? 0);
        setCashSummary(currentCashSummary ?? null);
        setSecondaryRows([]);
      } else if (mode === 'accounts') {
        const data = await fetch<any>('/api/v1/admin/users', {
          params: { page: listPage - 1, size: 20, keyword },
        });
        setRows(unwrapRows(data));
        setTotalPages(data.totalPages ?? 0);
        setTotalItems(data.totalElements ?? 0);
        setSecondaryRows([]);
      } else if (mode === 'policies') {
        setRows([]);
        setSecondaryRows([]);
      } else {
        setRows([]);
        setSecondaryRows([]);
      }
    } catch (reason) {
      if (sequence.current === current) setError(messageOf(reason));
    } finally {
      if (sequence.current === current) setLoading(false);
    }
  }, [mode, listPage, keyword]);

  useEffect(() => {
    void load();
    return () => {
      sequence.current++;
    };
  }, [load]);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setConfirmState((c) => ({ ...c, open: false }));
      setCashPaidDialog((c) => ({ ...c, open: false }));
      setPayoutDialog((c) => ({ ...c, open: false }));
      setRoleDialog((c) => ({ ...c, open: false }));
      setNoteDialog((c) => ({ ...c, open: false }));
      setNotice(success);
      await load();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  };

  const lookupTrip = async () => {
    setTripPreview(null);
    setCancelProgress(null);
    const requested = tripId.trim();
    await run(
      'trip-lookup',
      async () => {
        const data = await httpClient.get<Row>(
          `/api/v1/trips/${requested}/admin-summary`,
        );
        setTripPreview(data);
      },
      'Đã tải thông tin chuyến. Kiểm tra kỹ trước khi thao tác.',
    );
  };

  const submitCancellation = () => {
    if (
      !tripPreview ||
      tripPreview.tripId !== tripId.trim() ||
      !cancelReason.trim()
    )
      return;
    const selectedId = tripPreview.tripId;
    const reason = cancelReason.trim();
    setConfirmState({
      open: true,
      title: 'Hủy toàn bộ chuyến xe?',
      description: `${tripPreview.origin} → ${tripPreview.destination}. Tất cả vé trên chuyến sẽ được xử lý hủy; các khoản đã thu sẽ phát sinh nghĩa vụ hoàn tiền. Lý do: ${reason}`,
      confirmText: 'Xác nhận hủy chuyến',
      variant: 'danger',
      onConfirm: () =>
        run(
          'cancel',
          async () => {
            await httpClient.post(
              `/api/v1/trips/${selectedId}/admin-cancellation`,
              { reason },
            );
            const progress = await httpClient.get<Row>(
              `/api/v1/orders/transport/admin/trip-cancellations/${selectedId}`,
            );
            setCancelProgress(progress);
            setTripPreview(null);
          },
          'Đã gửi yêu cầu hủy chuyến. Việc hủy vé và hoàn tiền tiếp tục theo tiến trình, chưa đồng nghĩa đã hoàn tiền xong.',
        ),
    });
  };

  const checkCancellation = async () => {
    const id = tripId.trim();
    if (!id) return;
    await run(
      'progress',
      async () => {
        setCancelProgress(
          await httpClient.get<Row>(
            `/api/v1/orders/transport/admin/trip-cancellations/${id}`,
          ),
        );
      },
      'Đã cập nhật tiến trình hủy chuyến.',
    );
  };

  const setAdminLifecycle = (status: 'COMPLETED') => {
    if (!tripPreview || tripPreview.tripId !== tripId.trim()) return;
    const selectedId = tripPreview.tripId;
    setConfirmState({
      open: true,
      title: `Chuyển trạng thái chuyến sang ${status}?`,
      description: `Bạn có chắc chắn muốn can thiệp cập nhật trạng thái vòng đời chuyến ${tripId.trim()} thành ${status}?`,
      confirmText: `Xác nhận ${status}`,
      variant: 'primary',
      onConfirm: async () => {
        await run(
          `lifecycle-${status}`,
          async () => {
            await httpClient.put(
              `/api/v1/trips/${selectedId}/admin-lifecycle`,
              { status },
            );
            setTripPreview(null);
          },
          `Đã chuyển chuyến xe sang ${status}.`,
        );
      },
    });
  };

  const createAssistedExchange = async () => {
    if (
      busyRef.current ||
      !exchangeOldOrderId.trim() ||
      !exchangeNewOrderId.trim() ||
      !exchangeReason.trim()
    )
      return;
    if (exchangeOldOrderId.trim() === exchangeNewOrderId.trim()) {
      setError('Hai đơn đổi vé phải khác nhau.');
      return;
    }
    busyRef.current = true;
    setBusy('exchange-create');
    setError(null);
    try {
      const res = await httpClient.post<Row>(
        '/api/v1/orders/transport/admin/exchanges',
        {
          oldOrderId: exchangeOldOrderId.trim(),
          newOrderId: exchangeNewOrderId.trim(),
          reason: exchangeReason.trim(),
        },
      );
      setExchangeCase(res);
      setNotice('Đã tạo hồ sơ đổi vé hỗ trợ thành công.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  };

  const markCashCommissionPaid = () => {
    if (!cashShiftId.trim() || !/^\d+$/.test(cashAmount.trim())) {
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
    if (!reference.trim() || !/^https:\/\/[^\s]+$/.test(evidenceUrl.trim())) {
      setError('Cần mã giao dịch và đường dẫn chứng từ HTTPS hợp lệ.');
      return;
    }
    await run(
      'cash-paid',
      () =>
        httpClient.put(
          `/api/v1/payouts/transport/cash-settlements/${cashShiftId.trim()}/mark-paid`,
          {
            amount: cashAmount,
            reference: reference.trim(),
            evidenceUrl: evidenceUrl.trim(),
          },
        ),
      'Đã ghi nhận hoa hồng tiền mặt của ca thành công.',
    );
  };

  const openPayoutModal = async (row: Row) => {
    if (busyRef.current || row.status !== 'REQUESTED') return;
    busyRef.current = true;
    setBusy('payout-prepare');
    setError(null);
    setNotice(null);
    try {
      const prepared = await httpClient.post<Row>(
        `/api/v1/payouts/transport/${row.payoutId ?? row.id}/prepare`,
      );
      setPayoutDialog({
        open: true,
        row: prepared,
        reference: '',
        evidenceUrl: '',
      });
      await load();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  };

  const handleConfirmPayout = async () => {
    const { row, reference, evidenceUrl } = payoutDialog;
    if (!row || row.status !== 'REQUESTED') return;
    if (!reference.trim() || !/^https:\/\/[^\s]+$/.test(evidenceUrl.trim())) {
      setError('Cần mã giao dịch và chứng từ HTTPS hợp lệ.');
      return;
    }
    const id = row.payoutId ?? row.id;
    await run(
      `paid-${id}`,
      () =>
        httpClient.put(`/api/v1/payouts/transport/${id}/mark-paid`, {
          amount: row.hostAmount,
          reference: reference.trim(),
          evidenceUrl: evidenceUrl.trim(),
        }),
      'Đã ghi nhận quyết toán chi trả cho nhà xe.',
    );
  };

  const handleConfirmRoleChange = async () => {
    const { userId, mode, role } = roleDialog;
    if (!userId || !role) return;
    if (mode === 'GRANT') {
      await run(
        `grant-${userId}`,
        () =>
          httpClient.post(
            `/api/v1/admin/users/${userId}/role?role=${encodeURIComponent(role.trim().toUpperCase())}`,
          ),
        `Đã cấp vai trò ${role} cho người dùng.`,
      );
    } else {
      await run(
        `revoke-${userId}`,
        () =>
          httpClient.post(
            `/api/v1/admin/users/${userId}/revokerole?role=${encodeURIComponent(role.trim().toUpperCase())}`,
          ),
        `Đã thu hồi vai trò ${role} của người dùng.`,
      );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title={page.title}
        eyebrow="Trung tâm Tác nghiệp Điều hành Admin"
        description={page.description}
        breadcrumbs={[
          { label: 'Admin GoTicket', to: '/admin' },
          { label: page.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] text-xs font-bold border border-[var(--gt-coral)]/20 shadow-xs">
              {rows.length} mục trong lượt tải
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-full border-white/80 bg-white/80 backdrop-blur-md shadow-xs gap-2 px-4 py-2 text-xs font-bold"
            >
              <RefreshCcw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Tải lại</span>
            </Button>
          </div>
        }
      />

      {/* Notifications and Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-[24px] border border-rose-200/80 bg-rose-50/80 backdrop-blur-md p-4 text-xs sm:text-sm text-rose-800 shadow-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 backdrop-blur-md p-4 text-xs sm:text-sm text-emerald-800 shadow-xs">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{notice}</span>
        </div>
      )}

      {/* MODE 1: CANCELLATIONS */}
      {mode === 'cancellations' && (
        <div className="space-y-6">
          <SurfaceCard className="p-6 sm:p-7 space-y-5 rounded-[32px]">
            <div className="space-y-1">
              <h2 className="font-black text-base text-[var(--gt-ink)] flex items-center gap-2">
                <Ban className="w-5 h-5 text-[var(--gt-coral)]" />
                <span>Khởi tạo Hủy chuyến cấp Quản trị</span>
              </h2>
              <p className="text-xs text-[var(--gt-muted)]">
                Hủy toàn bộ chuyến xe, tự động giải phóng ghế, đánh dấu hủy vé
                và chuyển các đơn đã thanh toán sang trạng thái hoàn tiền saga.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1.8fr]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--gt-ink)]">
                  Mã UUID Chuyến xe
                </label>
                <input
                  type="text"
                  value={tripId}
                  disabled={busy !== ''}
                  onChange={(e) => {
                    setTripId(e.target.value);
                    setTripPreview(null);
                    setCancelProgress(null);
                  }}
                  placeholder="Nhập UUID chuyến xe cần hủy..."
                  className="w-full h-11 px-4 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--gt-ink)]">
                  Lý do hủy chuyến (bắt buộc)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Lý do hủy chuyến (Ví dụ: Thời tiết bão lũ, sự cố kỹ thuật xe...)"
                  maxLength={500}
                  className="w-full h-11 px-4 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs font-semibold"
                />
              </div>
            </div>

            <Button
              variant="outline"
              disabled={busy !== '' || !tripId.trim()}
              onClick={() => void lookupTrip()}
            >
              Xem thông tin chuyến
            </Button>
            {tripPreview && (
              <div className="rounded-2xl border p-4 space-y-2 text-sm">
                <strong>
                  {tripPreview.origin} → {tripPreview.destination}
                </strong>
                <p>
                  {tripPreview.operator?.name} · {tripPreview.vehicle?.name} ·{' '}
                  {tripPreview.vehicle?.licensePlate}
                </p>
                <p>
                  Khởi hành: <DateTimeText value={tripPreview.departureAt} /> ·
                  Đến: <DateTimeText value={tripPreview.arrivalAt} />
                </p>
                <StatusBadge status={tripPreview.status} />
                {tripPreview.cancellationRequested && (
                  <p>Chuyến đã có yêu cầu hủy. Xem tiến trình bên dưới.</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--gt-border)]/60">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== '' || !tripId.trim()}
                  onClick={() => void checkCancellation()}
                  className="rounded-full text-xs font-bold px-4 py-2 border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
                >
                  Kiểm tra tiến trình
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    busy !== '' ||
                    !tripPreview ||
                    tripPreview.tripId !== tripId.trim() ||
                    ['CANCELLED', 'COMPLETED'].includes(tripPreview.status) ||
                    new Date(tripPreview.arrivalAt).getTime() > Date.now()
                  }
                  onClick={() => setAdminLifecycle('COMPLETED')}
                  className="rounded-full text-xs font-bold px-4 py-2 border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
                >
                  Đánh dấu Hoàn thành
                </Button>
              </div>

              <Button
                variant="destructive"
                size="sm"
                disabled={
                  busy !== '' ||
                  !tripPreview ||
                  tripPreview.tripId !== tripId.trim() ||
                  !cancelReason.trim() ||
                  tripPreview.cancellationRequested ||
                  ['CANCELLED', 'COMPLETED'].includes(tripPreview.status)
                }
                onClick={() => void submitCancellation()}
                className="rounded-full text-xs font-bold px-5 py-2.5 shadow-xs"
              >
                Hủy chuyến xe
              </Button>
            </div>
          </SurfaceCard>

          {/* Cancellation Progress Structured Card */}
          {cancelProgress && (
            <SurfaceCard className="p-6 sm:p-7 space-y-5 rounded-[32px]">
              <div className="flex items-center justify-between border-b border-[var(--gt-border)]/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-[var(--gt-ink)]">
                    Tiến trình Hủy chuyến Saga
                  </h3>
                  <p className="text-xs text-[var(--gt-muted)]">
                    Trạng thái phân tán: Giải phóng ghế & hoàn tiền đơn hàng
                  </p>
                </div>
                <StatusBadge
                  status={String(
                    cancelProgress.status ??
                      cancelProgress.state ??
                      'PROCESSING',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs">
                  <span className="text-[10px] text-[var(--gt-muted)] font-bold uppercase tracking-wider">
                    Mã chuyến
                  </span>
                  <div className="mt-1">
                    <IdText id={tripId} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs">
                  <span className="text-[10px] text-[var(--gt-muted)] font-bold uppercase tracking-wider">
                    Số vé đã xử lý
                  </span>
                  <span className="text-base font-black text-[var(--gt-ink)] block mt-0.5">
                    {cancelProgress.processedTickets ??
                      cancelProgress.refundedCount ??
                      '—'}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs">
                  <span className="text-[10px] text-[var(--gt-muted)] font-bold uppercase tracking-wider">
                    Tổng tiền hoàn
                  </span>
                  <span className="text-base font-black text-[var(--gt-coral)] block mt-0.5 font-mono">
                    {formatVnd(String(cancelProgress.totalRefundAmount ?? 0))}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs">
                  <span className="text-[10px] text-[var(--gt-muted)] font-bold uppercase tracking-wider">
                    Lỗi ngoại lệ
                  </span>
                  <span className="text-base font-black text-rose-600 block mt-0.5">
                    {cancelProgress.errors?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Technical Details Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--gt-coral)] hover:underline"
                >
                  {showTechnicalDetails ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showTechnicalDetails
                      ? 'Ẩn chi tiết kỹ thuật'
                      : 'Xem chi tiết kỹ thuật (Saga Payload)'}
                  </span>
                </button>

                {showTechnicalDetails && (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md p-4 text-[11px] font-mono text-[var(--gt-ink)] shadow-xs">
                    {JSON.stringify(cancelProgress, null, 2)}
                  </pre>
                )}
              </div>
            </SurfaceCard>
          )}
        </div>
      )}

      {(mode === 'payouts' || mode === 'policies') && (
        <TransportCommissionSettings />
      )}

      {/* CASH COMMISSION SETTLEMENT FOR PAYOUTS */}
      {mode === 'payouts' && (
        <SurfaceCard className="p-6 sm:p-7 space-y-5 rounded-[32px]">
          <div className="space-y-0.5">
            <h2 className="font-bold text-base text-[var(--gt-ink)] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--gt-coral)]" />
              <span>Đối soát & Quyết toán Hoa hồng Tiền mặt</span>
            </h2>
            <p className="text-xs text-[var(--gt-muted)]">
              Tổng kết thu chi ca bán vé tiền mặt tại quầy của các đối tác nhà
              xe.
            </p>
          </div>

          {/* KPI Grid */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 pt-1">
            {[
              { label: 'Số ca tiền mặt', key: 'shifts', isMoney: false },
              { label: 'Tổng doanh số', key: 'grossAmount', isMoney: true },
              { label: 'Đã hoàn tiền', key: 'refundedAmount', isMoney: true },
              {
                label: 'Hoa hồng phải thu',
                key: 'commissionDue',
                isMoney: true,
              },
              {
                label: 'Hoa hồng đã nộp',
                key: 'commissionPaid',
                isMoney: true,
              },
              { label: 'Còn thiếu', key: 'outstandingAmount', isMoney: true },
            ].map(({ label, key, isMoney }) => (
              <div
                key={key}
                className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs"
              >
                <span className="block text-[10px] font-bold uppercase text-[var(--gt-muted)] tracking-wider">
                  {label}
                </span>
                <strong className="mt-1 block text-sm font-black text-[var(--gt-ink)] font-mono">
                  {isMoney
                    ? loading || error
                      ? '—'
                      : formatVnd(String(cashSummary?.[key] ?? 0))
                    : loading || error
                      ? '—'
                      : String(cashSummary?.[key] ?? 0)}
                </strong>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3.5 pt-3 border-t border-[var(--gt-border)]/60">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--gt-ink)]">
                Mã ca tiền mặt
              </label>
              <input
                type="text"
                value={cashShiftId}
                onChange={(e) => setCashShiftId(e.target.value)}
                placeholder="UUID ca tiền mặt..."
                className="w-64 h-11 px-4 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--gt-ink)]">
                Số tiền hoa hồng
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cashAmount}
                onChange={(e) =>
                  setCashAmount(e.target.value.replace(/\D/g, ''))
                }
                placeholder="Số tiền VND..."
                className="w-48 h-11 px-4 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs font-semibold"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={busy !== ''}
              onClick={markCashCommissionPaid}
              className="h-11 rounded-full text-xs font-bold px-5 border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
            >
              Ghi nhận đã nộp
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* BACKEND-FIXED POLICIES NOTICE */}
      {mode === 'policies' && (
        <SurfaceCard className="p-6 sm:p-7 space-y-2 rounded-[32px] border-amber-400/40 bg-amber-500/10 backdrop-blur-xl shadow-glass">
          <h2 className="font-bold text-base text-amber-950 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-700" />
            <span>Chính sách nghiệp vụ được backend kiểm soát</span>
          </h2>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            Thời hạn giữ ghế, điều kiện đổi/hủy vé và phí liên quan hiện đang
            được cố định an toàn trong logic nghiệp vụ của backend. Giao diện
            không dựng các biểu mẫu lưu cấu hình giả lập.
          </p>
        </SurfaceCard>
      )}

      {/* MAIN DATA TABLE FOR GENERAL MODES */}
      {mode === 'accounts' && <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); setKeyword(keywordInput.trim()); setListPage(1); }}>
        <input aria-label="Tìm tài khoản" value={keywordInput} maxLength={120} onChange={event => setKeywordInput(event.target.value)} placeholder="Tên tài khoản, họ tên, email hoặc số điện thoại" className="min-h-11 min-w-48 flex-1 rounded-xl border bg-white p-3 text-base" />
        <Button type="submit" disabled={loading}>Tìm kiếm</Button>
        {keyword && <Button type="button" variant="outline" onClick={() => { setKeyword(''); setKeywordInput(''); setListPage(1); }}>Xóa tìm kiếm</Button>}
        <p className="w-full text-sm text-muted">Bản ghi mới nhất được hiển thị trước.</p>
      </form>}
      {mode !== 'cancellations' && mode !== 'policies' && !error && (
        <SurfaceCard className="p-0 overflow-hidden rounded-[32px]">
          <div className="p-5 sm:p-6 border-b border-[var(--gt-border)]/60 flex items-center justify-between">
            <h2 className="font-black text-base text-[var(--gt-ink)]">
              {mode === 'reconciliation'
                ? 'Cảnh báo đối soát đang mở'
                : 'Danh sách hồ sơ vận hành'}{' '}
              ({rows.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-14">
              <LoadingState message="Đang tải dữ liệu hồ sơ..." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-14">
              <EmptyState
                title="Không có hồ sơ nào cần xử lý"
                description="Không có bản ghi trong lượt tải này. Đây không phải xác nhận toàn hệ thống đã đối soát xong."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--gt-border)]/60 bg-white/50 backdrop-blur-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-4">Mã ID</th>
                    <th className="px-5 py-4">Đối tượng</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Chi tiết / Giá trị</th>
                    <th className="px-5 py-4 text-right">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
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
                      row.issueCode ??
                      row.severity ??
                      (row.isDeleted
                        ? 'DELETED'
                        : row.isActive === false
                          ? 'BANNED'
                          : 'ACTIVE');

                    return (
                      <tr
                        key={`${id}-${row.issueCode ?? index}`}
                        className="hover:bg-white/60 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-[var(--gt-ink)]">
                          <IdText id={id} />
                        </td>
                        <td className="px-5 py-4">
                          <strong className="block text-[var(--gt-ink)] text-xs font-bold">
                            {row.title ??
                              row.userProfile?.fullName ??
                              row.username ??
                              row.name ??
                              row.orderNumber ??
                              row.providerType ??
                              row.message ??
                              'Hồ sơ vận tải'}
                          </strong>
                          <span className="text-[var(--gt-muted)] text-[11px] block mt-0.5 font-medium">
                            {mode === 'reconciliation' && row.orderStatus && (
                              <div className="my-1">
                                Đơn:{' '}
                                <StatusBadge
                                  status={row.orderStatus}
                                  size="sm"
                                />
                              </div>
                            )}
                            {row.hostId
                              ? `Nhà cung cấp: ${String(row.hostId).slice(0, 8)}...`
                              : row.createdAt
                                ? new Date(row.createdAt).toLocaleString(
                                    'vi-VN',
                                  )
                                : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              mode === 'reconciliation'
                                ? 'PENDING'
                                : String(status)
                            }
                            label={
                              mode === 'reconciliation'
                                ? 'Cần đối chiếu'
                                : undefined
                            }
                            size="sm"
                          />
                        </td>
                        <td className="px-5 py-4 text-[var(--gt-muted)] max-w-sm">
                          {mode === 'payouts' ? (
                            <MoneyText
                              amount={row.hostAmount ?? row.totalAmount ?? 0}
                              variant="coral"
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-[var(--gt-ink)] block font-medium">
                              {mode === 'accounts'
                                ? `${row.email || ''} · Quyền: ${(row.roles || []).join(', ')}`
                                : String(
                                    row.issueCode
                                      ? row.detail || row.issueCode
                                      : (row.description ??
                                          row.reason ??
                                          row.detail ??
                                          row.totalAmount ??
                                          '—'),
                                  )}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                                      () =>
                                        httpClient.put(
                                          `/api/v1/orders/transport/admin/reconciliation/${row.orderId ?? id}/refresh`,
                                        ),
                                      'Đã quét lại đơn hàng thành công.',
                                    )
                                  }
                                  className="h-8 rounded-full text-xs px-3 font-bold border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
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
                                      description: `Nhập ghi chú cho đơn ${row.orderNumber ?? row.orderId ?? id}. Ghi chú không tự đóng cảnh báo; hệ thống sẽ đối chiếu lại để xác nhận đã khắc phục.`,
                                      onSubmit: async (note) => {
                                        await run(
                                          `note-${id}`,
                                          () =>
                                            httpClient.post(
                                              `/api/v1/orders/transport/admin/reconciliation/${row.orderId ?? id}/${row.issueCode}/notes`,
                                              { note },
                                            ),
                                          'Đã lưu ghi chú đối soát.',
                                        );
                                      },
                                    });
                                  }}
                                  className="h-8 rounded-full text-xs px-3 font-bold border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
                                >
                                  Ghi chú
                                </Button>
                              </>
                            )}

                            {/* Payouts actions */}
                            {mode === 'payouts' &&
                              String(row.status).toUpperCase() ===
                                'REQUESTED' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={busy !== ''}
                                  onClick={() => openPayoutModal(row)}
                                  className="h-8 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-coral-sm text-xs px-4 font-bold"
                                >
                                  Đối chiếu & Ghi chứng từ chi
                                </Button>
                              )}

                            {/* Accounts actions */}
                            {mode === 'accounts' &&
                              !row.isDeleted &&
                              row.id !== currentUser?.id && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={busy !== ''}
                                    onClick={() => {
                                      const nextStatus =
                                        row.isActive === false
                                          ? 'ACTIVE'
                                          : 'BANNED';
                                      setConfirmState({
                                        open: true,
                                        title:
                                          nextStatus === 'ACTIVE'
                                            ? 'Mở khóa tài khoản?'
                                            : 'Khóa tài khoản?',
                                        description: `Xác nhận ${nextStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'} tài khoản người dùng ${row.username ?? id}?`,
                                        confirmText:
                                          nextStatus === 'ACTIVE'
                                            ? 'Mở khóa'
                                            : 'Khóa tài khoản',
                                        variant:
                                          nextStatus === 'ACTIVE'
                                            ? 'primary'
                                            : 'danger',
                                        onConfirm: async () => {
                                          await run(
                                            `status-${id}`,
                                            () =>
                                              httpClient.put(
                                                `/api/v1/admin/accounts/${id}/status`,
                                                { status: nextStatus },
                                              ),
                                            nextStatus === 'ACTIVE'
                                              ? 'Đã mở khóa tài khoản.'
                                              : 'Đã khóa tài khoản.',
                                          );
                                        },
                                      });
                                    }}
                                    className={`h-8 rounded-full text-xs px-3 font-bold shadow-xs ${
                                      row.isActive === false
                                        ? 'border-emerald-200/80 text-emerald-700 hover:bg-emerald-50'
                                        : 'border-rose-200/80 text-rose-700 hover:bg-rose-50'
                                    }`}
                                  >
                                    {row.isActive === false
                                      ? 'Mở khóa'
                                      : 'Khóa'}
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
                                        role: 'USER',
                                      })
                                    }
                                    className="h-8 rounded-full text-xs px-3 font-bold border-white/80 bg-white/80 backdrop-blur-sm shadow-xs"
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
                                        role: 'USER',
                                      })
                                    }
                                    className="h-8 rounded-full text-xs px-3 font-bold border-amber-200/80 text-amber-700 hover:bg-amber-50 shadow-xs"
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

      {['payouts', 'accounts'].includes(mode) && !error && (
        <Pagination
          currentPage={listPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setListPage}
          disabled={loading || busy !== ''}
        />
      )}

      {/* SECONDARY ROWS FOR RECONCILIATION */}
      {mode === 'reconciliation' &&
        !loading &&
        !error &&
        secondaryRows.length > 0 && (
          <SurfaceCard className="p-6 space-y-4">
            <h2 className="text-base font-black text-[var(--gt-ink)] tracking-tight">
              Email chờ gửi / Thất bại & Ngoại lệ đổi vé ({secondaryRows.length}
              )
            </h2>
            <div className="space-y-2.5">
              {secondaryRows.map((row, index) => {
                const id = row.eventId ?? row.oldOrderId ?? row.id ?? index;
                return (
                  <div
                    key={`${row._kind}-${id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-4 text-xs shadow-xs"
                  >
                    <div>
                      <strong className="text-[var(--gt-ink)] font-bold">
                        {row._kind === 'NOTIFICATION'
                          ? 'Thông báo email chưa gửi'
                          : 'Ngoại lệ đổi vé'}
                      </strong>
                      <p className="mt-0.5 text-[var(--gt-muted)]">
                        {row.message ?? row.reason ?? String(id)}
                        {row._kind === 'NOTIFICATION' && ` · ${row.status}`}
                      </p>
                    </div>
                    {row._kind === 'NOTIFICATION' ? (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={busy !== '' || row.status !== 'FAILED'}
                        onClick={() =>
                          void run(
                            `notification-${id}`,
                            () =>
                              httpClient.post(
                                `/api/v1/orders/transport/admin/notifications/${id}/retry`,
                              ),
                            'Đã đưa thông báo vào hàng đợi gửi lại.',
                          )
                        }
                        className="h-8 rounded-full bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white text-xs px-4 font-bold shadow-coral-sm"
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
                            description:
                              'Nhập kết luận xử lý để hoàn tất đóng ngoại lệ',
                            onSubmit: async (note) => {
                              await run(
                                `exchange-${id}`,
                                () =>
                                  httpClient.post(
                                    `/api/v1/orders/transport/admin/exchanges/${row.oldOrderId ?? id}/resolve-exception`,
                                    { note },
                                  ),
                                'Đã đóng ngoại lệ đổi vé.',
                              );
                            },
                          });
                        }}
                        className="h-8 rounded-full border-white/80 bg-white/70 hover:bg-white text-[var(--gt-ink)] text-xs px-4 font-bold shadow-xs"
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
            <h2 className="text-base font-black text-[var(--gt-ink)] tracking-tight">
              Đổi vé Hỗ trợ Giữa hai Đơn đã Thanh toán
            </h2>
            <p className="text-xs text-[var(--gt-muted)]">
              Dành cho hồ sơ legacy cần đối chiếu thủ công; luồng đổi từng vé
              của khách vẫn chạy qua item operation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--gt-ink)]">
                Mã đơn cũ
              </label>
              <input
                type="text"
                value={exchangeOldOrderId}
                onChange={(e) => setExchangeOldOrderId(e.target.value)}
                placeholder="UUID đơn cũ..."
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--gt-ink)]">
                Mã đơn mới
              </label>
              <input
                type="text"
                value={exchangeNewOrderId}
                onChange={(e) => setExchangeNewOrderId(e.target.value)}
                placeholder="UUID đơn mới..."
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--gt-ink)]">
                Lý do hỗ trợ
              </label>
              <input
                type="text"
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                placeholder="Lý do đổi vé hỗ trợ..."
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
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
            className="rounded-full bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white px-5 py-2 text-xs font-bold shadow-coral-sm"
          >
            Tạo hồ sơ đổi vé
          </Button>

          {exchangeCase && (
            <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md p-4 text-xs font-mono text-[var(--gt-ink)] shadow-xs">
              <h4 className="font-bold mb-2">Hồ sơ đổi vé đã tạo:</h4>
              <pre className="overflow-x-auto text-[11px]">
                {JSON.stringify(exchangeCase, null, 2)}
              </pre>
            </div>
          )}
        </SurfaceCard>
      )}

      {/* DIALOG 2: CASH COMMISSION MARK PAID */}
      <Dialog
        open={cashPaidDialog.open}
        onOpenChange={(open) => {
          if (!busyRef.current) setCashPaidDialog((d) => ({ ...d, open }));
        }}
      >
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-3.5">
            <DialogTitle className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
              Ghi nhận Nộp Hoa hồng Tiền mặt
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              Xác nhận đã thu hoa hồng cho ca #{cashShiftId} với số tiền{' '}
              {formatVnd(cashAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--gt-ink)]">
                Mã tham chiếu chứng từ *
              </label>
              <input
                type="text"
                value={cashPaidDialog.reference}
                onChange={(e) =>
                  setCashPaidDialog((d) => ({
                    ...d,
                    reference: e.target.value,
                  }))
                }
                placeholder="Ví dụ: CASH_RECEIPT_0987"
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[var(--gt-ink)]">
                Đường dẫn biên lai
              </label>
              <input
                type="text"
                value={cashPaidDialog.evidenceUrl}
                onChange={(e) =>
                  setCashPaidDialog((d) => ({
                    ...d,
                    evidenceUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-end pt-3 border-t border-[var(--gt-border)]/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashPaidDialog((d) => ({ ...d, open: false }))}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={
                busy !== '' ||
                !cashPaidDialog.reference.trim() ||
                !cashPaidDialog.evidenceUrl.trim()
              }
              onClick={handleConfirmCashPaid}
              className="rounded-full bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white px-5 text-xs font-bold shadow-coral-sm"
            >
              Xác nhận đã nộp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: NOTE DIALOG */}
      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => {
          if (!busyRef.current) setNoteDialog((d) => ({ ...d, open }));
        }}
      >
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-3.5">
            <DialogTitle className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
              {noteDialog.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              {noteDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <textarea
              rows={3}
              maxLength={1000}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Nhập nội dung ghi chú..."
              className="w-full p-3.5 bg-white/80 border border-white/80 rounded-2xl focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] text-xs shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-end pt-3 border-t border-[var(--gt-border)]/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteDialog((d) => ({ ...d, open: false }))}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy !== '' || !noteInput.trim()}
              onClick={async () => {
                const text = noteInput.trim();
                await noteDialog.onSubmit(text);
              }}
              className="rounded-full bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white px-5 text-xs font-bold shadow-coral-sm"
            >
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: PAYOUT MARK PAID */}
      <Dialog
        open={payoutDialog.open}
        onOpenChange={(open) => {
          if (!busyRef.current) setPayoutDialog((d) => ({ ...d, open }));
        }}
      >
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-3.5">
            <DialogTitle className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
              Đánh dấu Đã Chi trả Quyết toán
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              Chỉ xác nhận sau khi đã chuyển tiền cho nhà xe. Thao tác này không
              tự chuyển khoản. Số tiền đối chiếu mới nhất:{' '}
              {formatVnd(String(payoutDialog.row?.hostAmount ?? 0))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--gt-ink)]">
                Mã tham chiếu ngân hàng *
              </label>
              <input
                type="text"
                value={payoutDialog.reference}
                onChange={(e) =>
                  setPayoutDialog((d) => ({ ...d, reference: e.target.value }))
                }
                placeholder="Ví dụ: FT2310129994"
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[var(--gt-ink)]">
                Đường dẫn ủy nhiệm chi / biên lai
              </label>
              <input
                type="text"
                value={payoutDialog.evidenceUrl}
                onChange={(e) =>
                  setPayoutDialog((d) => ({
                    ...d,
                    evidenceUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all placeholder:text-[var(--gt-muted)]/70"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-end pt-3 border-t border-[var(--gt-border)]/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayoutDialog((d) => ({ ...d, open: false }))}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={
                busy !== '' ||
                !payoutDialog.reference.trim() ||
                !payoutDialog.evidenceUrl.trim()
              }
              onClick={handleConfirmPayout}
              className="rounded-full bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white px-5 text-xs font-bold shadow-coral-sm"
            >
              Xác nhận đã chi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: ROLE ASSIGNMENT */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) => {
          if (!busyRef.current) setRoleDialog((d) => ({ ...d, open }));
        }}
      >
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-3.5">
            <DialogTitle className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
              {roleDialog.mode === 'GRANT'
                ? 'Cấp Vai trò Người dùng'
                : 'Thu hồi Vai trò'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              Tài khoản #{roleDialog.userId}. Quyền nhà xe được cấp qua duyệt
              KYC; nhân viên do nhà xe mời và phân công.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--gt-ink)]">
                Chọn vai trò
              </label>
              <select
                aria-label="Chọn vai trò người dùng"
                value={roleDialog.role}
                onChange={(e) =>
                  setRoleDialog((d) => ({ ...d, role: e.target.value }))
                }
                className="w-full h-10 px-4 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[var(--gt-coral)]/30 focus:border-[var(--gt-coral)] focus:outline-none text-[var(--gt-ink)] shadow-xs backdrop-blur-sm transition-all"
              >
                {roleDialog.mode === 'REVOKE' && (
                  <option value="TICKET_VENDOR">
                    TICKET_VENDOR (Chủ nhà xe)
                  </option>
                )}
                <option value="ADMIN">ADMIN (Quản trị viên)</option>
                <option value="USER">USER (Khách hàng thông thường)</option>
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-end pt-3 border-t border-[var(--gt-border)]/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleDialog((d) => ({ ...d, open: false }))}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant={roleDialog.mode === 'GRANT' ? 'default' : 'destructive'}
              size="sm"
              disabled={busy !== ''}
              onClick={handleConfirmRoleChange}
              className={cn(
                'rounded-full px-5 text-xs font-bold',
                roleDialog.mode === 'GRANT'
                  ? 'bg-[var(--gt-coral)] hover:bg-[var(--gt-coral-dark)] text-white shadow-coral-sm'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
              )}
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

export const AdminOperationsPage: React.FC<{ mode: Mode }> = ({ mode }) =>
  mode === 'payouts' ? (
    <AdminPayoutsPage />
  ) : (
    <AdminOperationsContent mode={mode} />
  );
