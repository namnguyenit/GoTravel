import React, { useEffect, useRef, useState } from 'react';
import { ApiError, httpClient } from '@/shared/infrastructure/http/HttpPort';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';
import { tripService } from '@/modules/trip/composition';
import type { TripEntity } from '@/modules/trip/domain/entity/trip.entity';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  EmptyState,
  Button,
  ConfirmDialog,
  IdText,
} from '@/shared/presentation/components';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  User,
  Armchair,
  MapPin,
  Clock,
  ShieldCheck,
  Camera,
  CameraOff,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface CheckInResult {
  ticketId: string;
  tripId: string;
  seatCode: string;
  passengerName: string;
  checkedInAt: string;
  status: string;
}

interface ManifestPassenger {
  ticketId: string;
  passengerName: string;
  status: string;
  revision: number;
  seat?: { code?: string };
}

export const StaffCheckInPage: React.FC = () => {
  const { user } = useAuth();
  const [tokenInput, setTokenInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [trips, setTrips] = useState<TripEntity[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraHint, setCameraHint] = useState('');
  const [offlineQueue, setOfflineQueue] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('goticket-checkin-queue') || '[]');
    } catch {
      return [];
    }
  });

  // No show confirm state
  const [ticketToMarkNoShow, setTicketToMarkNoShow] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  const saveOfflineQueue = (tokens: string[]) => {
    const unique = [...new Set(tokens)].slice(-50);
    setOfflineQueue(unique);
    sessionStorage.setItem('goticket-checkin-queue', JSON.stringify(unique));
  };

  const toCheckInResult = (response: any): CheckInResult => ({
    ticketId: response?.ticketId || response?.id || '',
    tripId: response?.tripId || '',
    seatCode: response?.seatCode || response?.seat?.code || 'Đã xác nhận',
    passengerName: response?.passengerName || response?.fullName || 'Hành khách',
    checkedInAt: new Date().toLocaleTimeString('vi-VN'),
    status: 'CHECKED_IN',
  });

  const retryOfflineQueue = async () => {
    if (!offlineQueue.length || loading) return;
    setLoading(true);
    setError(null);
    const remaining: string[] = [];
    let latest: CheckInResult | null = null;
    for (const token of offlineQueue) {
      try {
        latest = toCheckInResult(
          await httpClient.post<any>('/api/v1/tickets/check-in', { token })
        );
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 0) remaining.push(token);
      }
    }
    saveOfflineQueue(remaining);
    if (latest) {
      setLastCheckIn(latest);
      if (selectedTripId) void loadManifest(selectedTripId);
    }
    if (remaining.length) setError(`Còn ${remaining.length} mã chưa gửi được vì mất kết nối.`);
    setLoading(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setError(null);
    setCameraHint('Đang mở camera…');
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setError('Trình duyệt này chưa hỗ trợ đọc QR trực tiếp. Hãy dùng Chrome/Edge mới hoặc nhập mã token bên dưới.');
      setCameraHint('');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraHint('Đưa toàn bộ mã QR trên vé điện tử vào giữa khung hình camera.');
      window.setTimeout(async () => {
        if (!videoRef.current || !streamRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({ formats: ['qr_code'] });
        scanTimerRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            const value = String(codes?.[0]?.rawValue ?? '').trim();
            if (value) {
              setTokenInput(value);
              setCameraHint('Đã đọc mã thành công. Vui lòng bấm Xác nhận soát vé.');
              stopCamera();
            }
          } catch {
            /* skip unclear frame */
          }
        }, 350);
      }, 0);
    } catch (reason) {
      stopCamera();
      setCameraHint('');
      setError(
        reason instanceof Error ? `Không thể mở camera: ${reason.message}` : 'Không thể mở camera.'
      );
    }
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const rows =
          user?.isStaff() && !user?.isVendor()
            ? await tripService.getAssignedStaffTrips()
            : (await tripService.getTrips({ page: 1, limit: 100 })).data;
        setTrips(rows);
      } catch {
        setTrips([]);
      }
    };
    void loadTrips();
  }, [user]);

  const loadManifest = async (tripId = selectedTripId) => {
    if (!tripId) {
      setManifest([]);
      return;
    }
    setManifestLoading(true);
    setError(null);
    try {
      const data = await httpClient.get<any>(`/api/v1/trips/${tripId}/manifest`);
      setManifest(Array.isArray(data?.passengers) ? data.passengers : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách hành khách.');
    } finally {
      setManifestLoading(false);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!selectedTripId || !ticketToMarkNoShow) return;
    const ticketId = ticketToMarkNoShow;
    setTicketToMarkNoShow(null);
    setManifestLoading(true);
    setError(null);
    try {
      await httpClient.post(`/api/v1/trips/${selectedTripId}/tickets/${ticketId}/no-show`);
      await loadManifest(selectedTripId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa thể đánh dấu vắng mặt.');
    } finally {
      setManifestLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.post<any>('/api/v1/tickets/check-in', {
        token: tokenInput.trim(),
      });

      const result = toCheckInResult(response);

      setLastCheckIn(result);
      setTokenInput('');
      if (selectedTripId) void loadManifest(selectedTripId);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 0) {
        saveOfflineQueue([...offlineQueue, tokenInput.trim()]);
        setTokenInput('');
        setError('Thiết bị đang mất kết nối. Mã đã được giữ tạm trong phiên này; hãy gửi lại khi có mạng.');
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Mã vé không hợp lệ, đã bị hủy hoặc đã được soát vé trước đó.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Soát vé & Check-in hành khách"
        eyebrow="Kênh Nhân Viên · Tác nghiệp bến xe"
        description="Quét mã QR trên vé điện tử hành khách hoặc nhập token để xác thực và đánh dấu lên xe theo thời gian thực."
        actions={
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--gt-coral-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--gt-coral)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quyền: CHECK_IN</span>
          </div>
        }
      />

      {offlineQueue.length > 0 && (
        <SurfaceCard className="bg-amber-50/60 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{offlineQueue.length} mã vé</strong> đang chờ gửi lại do mất kết nối. Các mã này chưa được ghi nhận trên máy chủ.
            </span>
          </div>
          <Button
            size="sm"
            disabled={loading}
            onClick={() => void retryOfflineQueue()}
            className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Gửi lại ngay
          </Button>
        </SurfaceCard>
      )}

      {/* Input & Scanner Form */}
      <SurfaceCard className="p-6 space-y-5">
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-2">
              Mã vé điện tử / Token soát vé (QR Token)
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Quét mã QR hoặc dán chuỗi token vé tại đây..."
                className="w-full px-4 py-3 bg-[var(--gt-canvas)] border border-[var(--gt-border)] rounded-2xl text-base font-mono text-[var(--gt-ink)] focus:outline-none focus:border-[var(--gt-coral)] focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="py-3.5 rounded-2xl text-xs font-bold text-white bg-[#FF385C] hover:bg-[#E61E4F] shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang kiểm tra vé...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Xác nhận soát vé lên xe
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => (cameraOpen ? stopCamera() : void startCamera())}
              className="py-3.5 rounded-2xl text-xs font-bold"
            >
              {cameraOpen ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2 text-rose-600" />
                  Đóng camera
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2 text-[var(--gt-coral)]" />
                  Quét QR bằng camera
                </>
              )}
            </Button>
          </div>
        </form>

        {(cameraOpen || cameraHint) && (
          <div className="overflow-hidden rounded-2xl border border-[var(--gt-border)] bg-stone-900">
            {cameraOpen && (
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-video w-full object-cover"
              />
            )}
            <p className="px-4 py-3 text-center text-xs font-semibold text-white">
              {cameraHint}
            </p>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <InlineAlert
            variant="error"
            title="Soát vé không thành công"
            message={error}
            onClose={() => setError(null)}
          />
        )}
      </SurfaceCard>

      {/* Last Successful Check-in Result Card */}
      {lastCheckIn && (
        <SurfaceCard className="bg-emerald-50/60 border border-emerald-200 p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm">Soát vé thành công!</span>
            </div>
            <span className="text-xs text-emerald-700 font-mono font-bold">
              {lastCheckIn.checkedInAt}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--gt-muted)] block">Vị trí ghế ngồi</span>
              <strong className="text-xl font-black text-emerald-950 font-mono">
                Ghế {lastCheckIn.seatCode}
              </strong>
            </div>

            <div>
              <span className="text-[var(--gt-muted)] block">Hành khách</span>
              <strong className="text-base font-bold text-emerald-950">
                {lastCheckIn.passengerName}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-emerald-800">
            Trạng thái vé đã được cập nhật thành:{' '}
            <strong className="uppercase">ĐÃ SOÁT VÉ (CHECKED_IN)</strong> trên hệ thống.
          </p>
        </SurfaceCard>
      )}

      {/* Manifest section */}
      <SurfaceCard className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--gt-border)] pb-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-sm text-[var(--gt-ink)]">
              <User className="h-4 w-4 text-[var(--gt-coral)]" />
              Danh sách hành khách theo chuyến (Manifest)
            </h2>
            <p className="mt-1 text-xs text-[var(--gt-muted)]">
              Theo dõi vé hợp lệ, trạng thái đã lên xe và xử lý vắng mặt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTripId}
              onChange={(event) => {
                setSelectedTripId(event.target.value);
                void loadManifest(event.target.value);
              }}
              className="min-h-10 max-w-xs rounded-2xl border border-[var(--gt-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gt-ink)] focus:border-[var(--gt-coral)] outline-none"
            >
              <option value="">Chọn chuyến xe</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.getSummaryRoute()} · {new Date(trip.departureTime).toLocaleString('vi-VN')}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedTripId || manifestLoading}
              onClick={() => void loadManifest()}
              className="rounded-2xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${manifestLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {manifestLoading ? (
          <div className="py-8">
            <LoadingState message="Đang tải danh sách hành khách..." />
          </div>
        ) : selectedTripId && manifest.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--gt-muted)]">
            Chuyến này chưa có hành khách đặt chỗ.
          </div>
        ) : manifest.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--gt-canvas)] font-bold text-[var(--gt-muted)] border-b border-[var(--gt-border)]">
                <tr>
                  <th className="px-4 py-3">Ghế</th>
                  <th className="px-4 py-3">Hành khách</th>
                  <th className="px-4 py-3">Bản sửa</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gt-border)]">
                {manifest.map((passenger) => (
                  <tr key={passenger.ticketId} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[var(--gt-coral)]">
                      <Armchair className="mr-1.5 inline h-4 w-4" />
                      {passenger.seat?.code || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--gt-ink)]">
                      {passenger.passengerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--gt-muted)]">
                      R{passenger.revision}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          passenger.status === 'CHECKED_IN'
                            ? 'CONFIRMED'
                            : passenger.status === 'ACTIVE'
                            ? 'PENDING'
                            : 'CANCELLED'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {passenger.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTicketToMarkNoShow(passenger.ticketId)}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs rounded-xl"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Đánh dấu vắng mặt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SurfaceCard>

      {/* No show confirm dialog */}
      <ConfirmDialog
        open={Boolean(ticketToMarkNoShow)}
        onOpenChange={(open) => !open && setTicketToMarkNoShow(null)}
        title="Xác nhận hành khách vắng mặt"
        description="Bạn có chắc chắn muốn đánh dấu hành khách này không có mặt lên xe (No-show)? Thao tác này sẽ cập nhật trạng thái vé của chuyến."
        confirmLabel="Xác nhận vắng mặt"
        cancelLabel="Đóng"
        variant="danger"
        onConfirm={handleConfirmNoShow}
      />
    </div>
  );
};
