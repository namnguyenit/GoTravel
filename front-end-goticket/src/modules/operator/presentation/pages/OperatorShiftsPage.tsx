import React, { useEffect, useState } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';
import { tripService } from '@/modules/trip/composition';
import type { TripEntity } from '@/modules/trip/domain/entity/trip.entity';
import { formatVnd } from '@/shared/domain/money.vo';
import {
  PageHeader,
  SurfaceCard,
  MetricCard,
  MoneyText,
  IdText,
  InlineAlert,
  LoadingState,
  Button,
  StatusBadge,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  Receipt,
  ShieldAlert,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ShiftReceipt {
  id: string;
  receiptNo: string;
  orderId: string;
  shiftId: string;
  amount: string | number;
  receivedAt: string;
}

interface ShiftAdjustment {
  kind: 'TOPUP' | 'REFUND';
  operation_id: string;
  amount: string | number;
  reference?: string;
  recorded_at: string;
}

interface ShiftDetail {
  id: string;
  actorId: string;
  operatorId: string;
  openedAt: string;
  closedAt?: string | null;
  grossAmount?: string | number;
  expectedAmount?: string | number;
  countedAmount?: string | number;
  variance?: string | number;
  commissionDue?: string | number;
  commissionVersion?: string;
  receipts?: ShiftReceipt[];
  adjustments?: ShiftAdjustment[];
}

interface BasicShift {
  id: string;
  actorId: string;
  operatorId: string;
  openedAt: string;
  commissionVersion?: string;
  commissionRate?: string | number;
}

export const OperatorShiftsPage: React.FC = () => {
  const { user } = useAuth();

  // Active & history shift states
  const [activeShiftDetail, setActiveShiftDetail] = useState<ShiftDetail | null>(null);
  const [shiftHistory, setShiftHistory] = useState<BasicShift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Trips to open shift
  const [availableTrips, setAvailableTrips] = useState<TripEntity[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [opening, setOpening] = useState<boolean>(false);

  // Close shift dialog state
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [countedAmount, setCountedAmount] = useState<string>('0');
  const [closing, setClosing] = useState<boolean>(false);
  const [closeSuccessDetail, setCloseSuccessDetail] = useState<any | null>(null);

  const hasCashView =
    user?.hasCapability('CASH_VIEW') ||
    user?.hasCapability('SELL_CASH') ||
    user?.isVendor() ||
    user?.isAdmin();

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch staff shifts via GET /shifts/me
      const res = await httpClient.get<any>('/api/v1/orders/transport/cash/shifts/me');
      const shifts: BasicShift[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setShiftHistory(shifts);

      // 2. Fetch active shift details
      try {
        const activeRes = await httpClient.get<any>(
          '/api/v1/orders/transport/cash/shifts/active/detail'
        );
        const detailData = activeRes?.data || activeRes;
        if (detailData && detailData.id) {
          setActiveShiftDetail(detailData);
        } else {
          setActiveShiftDetail(null);
        }
      } catch {
        setActiveShiftDetail(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách ca thu tiền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasCashView) {
      fetchShifts();
    }
  }, [hasCashView]);

  useEffect(() => {
    let isMounted = true;
    const fetchTripsForShift = async () => {
      try {
        let tripsList: any[] = [];
        if (user?.isStaff() && !user?.isVendor()) {
          tripsList = await tripService.getAssignedStaffTrips();
        } else {
          const res = await tripService.getTrips({ limit: 50 });
          tripsList = res.data;
        }

        if (isMounted) {
          const valid = tripsList.filter(
            (t) => t.status === 'ON_SALE' || t.status === 'PUBLISHING' || t.status === 'STOP_SALE'
          );
          setAvailableTrips(valid.length > 0 ? valid : tripsList);
          if (valid[0]) setSelectedTripId(valid[0].id);
          else if (tripsList[0]) setSelectedTripId(tripsList[0].id);
        }
      } catch {
        if (isMounted) setAvailableTrips([]);
      }
    };

    if (hasCashView) {
      fetchTripsForShift();
    }

    return () => {
      isMounted = false;
    };
  }, [user, hasCashView]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) {
      setError('Vui lòng chọn hoặc nhập mã chuyến xe hợp lệ để mở ca.');
      return;
    }

    setOpening(true);
    setError(null);
    try {
      await httpClient.post<any>('/api/v1/orders/transport/cash/shifts/open', {
        tripId: selectedTripId,
      });
      await fetchShifts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể mở ca thu tiền.');
    } finally {
      setOpening(false);
    }
  };

  const handleConfirmCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedAmount || isNaN(Number(countedAmount)) || Number(countedAmount) < 0) {
      setError('Vui lòng nhập số tiền thực tế kiểm đếm hợp lệ (lớn hơn hoặc bằng 0).');
      return;
    }

    setClosing(true);
    setError(null);
    try {
      const res = await httpClient.post<any>('/api/v1/orders/transport/cash/shifts/close', {
        countedAmount: Number(countedAmount),
      });
      setCloseSuccessDetail(res?.data || res);
      setShowCloseModal(false);
      await fetchShifts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chốt ca thất bại.');
    } finally {
      setClosing(false);
    }
  };

  if (!hasCashView) {
    return (
      <SurfaceCard className="max-w-md mx-auto my-16 p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="font-bold text-base text-[var(--gt-ink)] mb-1">
          Quyền truy cập bị giới hạn
        </h3>
        <p className="text-xs text-[var(--gt-muted)]">
          Bạn cần có quyền CASH_VIEW hoặc SELL_CASH để thực hiện quản lý và chốt ca thu tiền mặt.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Ca thu tiền mặt"
        eyebrow="Kênh Nhà Xe · Quản lý Tiền mặt"
        description="Mở ca gắn với chuyến xe, đối soát biên nhận tiền mặt tại quầy và kiểm đếm chốt ca."
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Thông báo"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {closeSuccessDetail && (
        <SurfaceCard className="p-5 bg-emerald-50/60 border border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Đã chốt và đóng ca thu tiền thành công!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div>
              <span className="text-[var(--gt-muted)]">Doanh thu ghi nhận:</span>
              <p className="font-bold text-emerald-950">
                {formatVnd(closeSuccessDetail.grossAmount || 0)}
              </p>
            </div>
            <div>
              <span className="text-[var(--gt-muted)]">Thực tế kiểm đếm:</span>
              <p className="font-bold text-emerald-950">
                {formatVnd(closeSuccessDetail.countedAmount || 0)}
              </p>
            </div>
            <div>
              <span className="text-[var(--gt-muted)]">Chênh lệch:</span>
              <p className="font-bold text-emerald-950">
                {formatVnd(closeSuccessDetail.variance || 0)}
              </p>
            </div>
            <div>
              <span className="text-[var(--gt-muted)]">Hoa hồng đối soát:</span>
              <p className="font-bold text-emerald-950">
                {formatVnd(closeSuccessDetail.commissionDue || 0)}
              </p>
            </div>
          </div>
        </SurfaceCard>
      )}

      {loading ? (
        <SurfaceCard className="p-8 text-center">
          <LoadingState message="Đang tải thông tin ca thu tiền mặt..." />
        </SurfaceCard>
      ) : activeShiftDetail ? (
        /* Active Open Shift Card */
        <SurfaceCard className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gt-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                  Ca đang mở hoạt động
                </span>
                <IdText id={activeShiftDetail.id} prefix="Mã ca" />
              </div>
            </div>

            <Button
              onClick={() => {
                setCountedAmount(
                  String(activeShiftDetail.expectedAmount || activeShiftDetail.grossAmount || 0)
                );
                setShowCloseModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              <span>Chốt & Đóng ca</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <MetricCard
              label="Tổng tiền mặt đã thu"
              value={formatVnd(activeShiftDetail.grossAmount || 0)}
              icon={Wallet}
              variant="coral"
            />
            <MetricCard
              label="Số biên nhận trong ca"
              value={`${activeShiftDetail.receipts?.length || 0} biên nhận`}
              icon={Receipt}
              variant="default"
            />
            <MetricCard
              label="Thời gian mở ca"
              value={
                activeShiftDetail.openedAt
                  ? new Date(activeShiftDetail.openedAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
              icon={Clock}
              variant="default"
            />
          </div>

          {/* Receipts list */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-[var(--gt-ink)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--gt-coral)]" />
              Danh sách biên nhận thu tiền mặt trong ca
            </h3>
            {activeShiftDetail.receipts && activeShiftDetail.receipts.length > 0 ? (
              <div className="border border-[var(--gt-border)] rounded-2xl overflow-hidden divide-y divide-[var(--gt-border)] text-xs">
                {activeShiftDetail.receipts.map((rcp) => (
                  <div
                    key={rcp.id}
                    className="p-3.5 flex items-center justify-between hover:bg-[var(--gt-canvas)] transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[var(--gt-ink)]">{rcp.receiptNo}</span>
                      <span className="text-[var(--gt-muted)] ml-2 text-[11px]">
                        {new Date(rcp.receivedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    <MoneyText amount={rcp.amount} weight="bold" variant="ink" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--gt-muted)] italic py-2">
                Chưa có giao dịch thu tiền nào trong ca này.
              </p>
            )}
          </div>
        </SurfaceCard>
      ) : (
        /* No Open Shift -> Form to Open Shift */
        <SurfaceCard className="p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--gt-canvas)] text-[var(--gt-muted)] flex items-center justify-center mx-auto border border-[var(--gt-border)]">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--gt-ink)]">
              Hiện chưa có ca thu tiền nào đang mở
            </h2>
            <p className="text-xs text-[var(--gt-muted)] mt-1 max-w-sm mx-auto">
              Nhân viên cần chọn chuyến xe được phân công và mở ca trước khi thực hiện bán vé thu tiền mặt tại quầy.
            </p>
          </div>

          <form onSubmit={handleOpenShift} className="max-w-md mx-auto space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--gt-ink)] text-left mb-1.5">
                Chọn chuyến xe gắn với ca làm việc <span className="text-rose-600">*</span>
              </label>
              {availableTrips.length > 0 ? (
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--gt-border)] rounded-2xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] font-semibold outline-none"
                >
                  {availableTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.route ? `${trip.route.origin} ➔ ${trip.route.destination}` : 'Chuyến xe'} (
                      {new Date(trip.departureTime).toLocaleString('vi-VN')})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  placeholder="Nhập mã UUID chuyến xe (tripId)..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--gt-border)] rounded-2xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none"
                />
              )}
            </div>

            <Button
              type="submit"
              disabled={opening || !selectedTripId}
              className="w-full py-3 bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold rounded-2xl shadow-xs"
            >
              {opening ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Đang mở ca...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 mr-2" />
                  <span>Mở ca thu tiền mới</span>
                </>
              )}
            </Button>
          </form>
        </SurfaceCard>
      )}

      {/* History Shifts */}
      {shiftHistory.length > 0 && (
        <SurfaceCard className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-[var(--gt-ink)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--gt-coral)]" />
            Lịch sử các ca thu tiền gần đây
          </h3>
          <div className="divide-y divide-[var(--gt-border)] text-xs">
            {shiftHistory.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <IdText id={s.id} prefix="Mã ca" />
                  <span className="text-[var(--gt-muted)] ml-3 text-[11px]">
                    Mở lúc: {new Date(s.openedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--gt-canvas)] text-[var(--gt-muted)] border border-[var(--gt-border)]">
                  {s.commissionVersion ? `Hoa hồng: ${s.commissionVersion}` : 'Đã ghi nhận'}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Close Shift Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Xác nhận chốt & đóng ca thu tiền
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              Doanh thu hệ thống ghi nhận trong ca: <strong>{formatVnd(activeShiftDetail?.grossAmount || 0)}</strong>.
              Vui lòng kiểm đếm số tiền mặt thực tế trong két và nhập vào bên dưới để tính chênh lệch đối soát.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCloseShift} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1">
                Số tiền kiểm đếm thực tế (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--gt-border)] rounded-2xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] font-bold outline-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={closing}
                onClick={() => setShowCloseModal(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={closing}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {closing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Đang chốt ca...
                  </>
                ) : (
                  'Xác nhận đóng ca'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
