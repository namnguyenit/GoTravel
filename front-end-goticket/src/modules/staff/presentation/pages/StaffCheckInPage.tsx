import jsQR from 'jsqr';
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
  const queueKey = `goticket-checkin-queue:${user?.id || 'anonymous'}`;
  const [tokenInput, setTokenInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [trips, setTrips] = useState<TripEntity[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const cameraRequest = useRef(0);
  const [cameraHint, setCameraHint] = useState('');
  const [offlineQueue, setOfflineQueue] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(queueKey) || '[]');
      return Array.isArray(saved) ? saved.filter((token) => typeof token === 'string') : [];
    } catch {
      return [];
    }
  });

  // No show confirm state
  const [ticketToMarkNoShow, setTicketToMarkNoShow] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const manifestRequest = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(queueKey) || '[]');
      setOfflineQueue(Array.isArray(saved) ? saved.filter((token) => typeof token === 'string') : []);
    } catch { setOfflineQueue([]); }
  }, [queueKey]);

  const stopCamera = () => {
    cameraRequest.current++;
    setCameraStarting(false);
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
    sessionStorage.setItem(queueKey, JSON.stringify(unique));
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

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const Detector = (window as any).BarcodeDetector;
    let detector: any = null;
    try { if (Detector) detector = new Detector({ formats: ['qr_code'] }); } catch { /* Use JS decoder. */ }
    let disposed = false;
    let scanning = false;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      if (!disposed) { stopCamera(); setError('Camera chưa phát được hình. Hãy đóng rồi mở lại camera và kiểm tra quyền truy cập.'); }
    });
    scanTimerRef.current = window.setInterval(async () => {
      if (disposed || scanning || video.readyState < 2 || !video.videoWidth) return;
      scanning = true;
      try {
        let value = '';
        if (detector) {
          try { value = String((await detector.detect(video))?.[0]?.rawValue ?? '').trim(); }
          catch { detector = null; }
        }
        if (!value && !detector && ctx) {
          const scale = Math.min(1, 800 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          value = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' })?.data?.trim() || '';
        }
        if (value && !disposed) {
          setTokenInput(value);
          stopCamera();
          setCameraHint('Đã đọc QR. Kiểm tra mã và bấm Xác nhận soát vé.');
        }
      } catch { /* Skip an unreadable frame; keep the camera usable. */ }
      finally { scanning = false; }
    }, 300);
    return () => {
      disposed = true;
      if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
      video.srcObject = null;
    };
  }, [cameraOpen]);

  const startCamera = async () => {
    if (cameraStarting) return;
    setError(null); setCameraHint('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera cần kết nối HTTPS và trình duyệt hỗ trợ quyền truy cập camera. Hãy mở trang bằng HTTPS hoặc nhập mã vé.');
      return;
    }
    const request = ++cameraRequest.current;
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false,
      });
      if (request !== cameraRequest.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraHint('Đưa mã QR trên vé vào giữa khung hình.');
    } catch (reason) {
      if (request !== cameraRequest.current) return;
      const name = reason instanceof DOMException ? reason.name : '';
      setError(name === 'NotAllowedError' ? 'Bạn chưa cho phép dùng camera. Mở quyền Camera trong cài đặt trang rồi thử lại.'
        : name === 'NotFoundError' ? 'Không tìm thấy camera trên thiết bị. Bạn có thể nhập mã vé.'
        : name === 'NotReadableError' ? 'Camera đang được ứng dụng khác sử dụng. Đóng ứng dụng đó rồi thử lại.'
        : 'Không mở được camera. Kiểm tra quyền truy cập và kết nối thiết bị rồi thử lại.');
    } finally { if (request === cameraRequest.current) setCameraStarting(false); }
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const rows =
          await tripService.getAssignedStaffTrips(user?.operatorId || undefined);
        const sorted = (rows || []).sort(
          (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
        );
        setTrips(sorted);
        if (sorted.length > 0) {
          const defaultTrip = sorted.find(t => t.status === 'ON_SALE' || t.status === 'STOP_SALE') || sorted[0];
          setSelectedTripId(defaultTrip.id);
          void loadManifest(defaultTrip.id);
        }
      } catch (reason) {
        setTrips([]);
        setError(reason instanceof Error ? reason.message : 'Không tải được chuyến được phân công. Hãy thử tải lại trang.');
      }
    };
    void loadTrips();
  }, [user]);

  const loadManifest = async (tripId = selectedTripId) => {
    const requestId = ++manifestRequest.current;
    setManifest([]);
    if (!tripId) {
      setManifest([]);
      setManifestLoading(false);
      return;
    }
    setManifestLoading(true);
    setError(null);
    try {
      const data = await httpClient.get<any>(`/api/v1/trips/${tripId}/manifest`);
      if (requestId !== manifestRequest.current) return;
      setManifest(Array.isArray(data?.passengers) ? data.passengers : []);
    } catch (reason) {
      if (requestId !== manifestRequest.current) return;
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách hành khách.');
    } finally {
      if (requestId === manifestRequest.current) setManifestLoading(false);
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
    if (!tokenInput.trim() || loading || !user?.canCheckIn()) return;

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
          <div className="flex items-center gap-2 rounded-full bg-[var(--gt-brand-soft)]/80 backdrop-blur-md border border-[var(--gt-brand)]/20 px-4 py-2 text-xs font-bold text-[var(--gt-brand)] shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Quyền: CHECK_IN</span>
          </div>
        }
      />

      {offlineQueue.length > 0 && (
        <SurfaceCard className="bg-amber-500/10 backdrop-blur-xl border border-amber-400/40 rounded-[28px] p-4.5 flex flex-wrap items-center justify-between gap-3 shadow-glass">
          <div className="flex items-center gap-3 text-xs text-amber-900 font-medium">
            <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            </span>
            <span>
              <strong className="font-bold">{offlineQueue.length} mã vé</strong> đang chờ gửi lại do mất kết nối. Các mã này chưa được ghi nhận trên máy chủ.
            </span>
          </div>
          <Button
            size="sm"
            disabled={loading}
            onClick={() => void retryOfflineQueue()}
            className="rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Gửi lại ngay
          </Button>
        </SurfaceCard>
      )}

      {/* Input & Scanner Form */}
      <SurfaceCard className="p-6 sm:p-8 space-y-6 rounded-[32px]">
        {/* Camera Scanner Viewport Capsule */}
        {cameraOpen ? (
          <div className="relative overflow-hidden rounded-[32px] bg-black/90 backdrop-blur-2xl border-2 border-white/80 shadow-glass-xl text-white">
            <div className="relative aspect-video w-full max-h-[420px] flex items-center justify-center overflow-hidden bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* HUD Targeting Reticle & Scanline */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Vignette */}
                <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60" />

                {/* Target Frame Box */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/40 rounded-3xl p-3 flex flex-col justify-between">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[var(--gt-brand)] rounded-tl-xl shadow-[0_0_12px_var(--gt-brand)]" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[var(--gt-brand)] rounded-tr-xl shadow-[0_0_12px_var(--gt-brand)]" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[var(--gt-brand)] rounded-bl-xl shadow-[0_0_12px_var(--gt-brand)]" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[var(--gt-brand)] rounded-br-xl shadow-[0_0_12px_var(--gt-brand)]" />

                  {/* Pulsing Scanline */}
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-[var(--gt-brand)] to-transparent shadow-[0_0_16px_var(--gt-brand)] animate-pulse" />
                </div>
              </div>

              {/* Top Status Capsule */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Camera quét vé</span>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-colors"
                  aria-label="Đóng camera"
                >
                  <CameraOff className="w-4 h-4 text-rose-400" />
                </button>
              </div>

              {/* Bottom Instructions Capsule */}
              <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none">
                <p className="px-5 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-medium text-white/90 text-center shadow-lg">
                  {cameraHint || 'Đưa toàn bộ mã QR trên vé điện tử vào giữa khung hình camera'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleCheckIn} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-2">
              Mã vé điện tử / Token soát vé (QR Token)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--gt-muted)] group-focus-within:text-[var(--gt-brand)] transition-colors">
                <QrCode className="w-5 h-5" />
              </div>
              <input
                type="text"
                autoFocus
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Quét mã QR hoặc dán chuỗi token vé tại đây..."
                className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl text-base font-mono text-[var(--gt-ink)] placeholder:text-[var(--gt-muted)]/60 focus:outline-none focus:border-[var(--gt-brand)] focus:ring-4 focus:ring-[var(--gt-brand)]/10 shadow-glass transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <Button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="py-4 rounded-full text-xs font-bold text-white bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] shadow-brand-sm hover:shadow-brand-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kiểm tra vé...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4.5 h-4.5" />
                  Xác nhận soát vé lên xe
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={cameraStarting}
              onClick={() => (cameraOpen ? stopCamera() : void startCamera())}
              className="py-4 rounded-full text-xs font-bold border-white/80 bg-white/70 backdrop-blur-md hover:bg-white text-[var(--gt-ink)] shadow-glass transition-all flex items-center justify-center gap-2"
            >
              {cameraOpen ? (
                <>
                  <CameraOff className="h-4 w-4 text-rose-600" />
                  Đóng camera quét
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 text-[var(--gt-brand)]" />
                  {cameraStarting ? 'Đang mở camera...' : 'Mở camera quét QR trực tiếp'}
                </>
              )}
            </Button>
          </div>
        </form>

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
        <SurfaceCard className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-400/40 rounded-[32px] p-6 sm:p-7 space-y-4 shadow-glass animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-emerald-200/50 pb-3.5">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-emerald-950 block">Soát vé thành công!</span>
                <span className="text-[11px] text-emerald-700/80">Hành khách hợp lệ và đã ghi nhận lên xe</span>
              </div>
            </div>
            <div className="rounded-full bg-white/80 backdrop-blur-sm px-3.5 py-1 text-xs text-emerald-800 font-mono font-bold border border-emerald-200/60 shadow-xs">
              {lastCheckIn.checkedInAt}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/80">
              <span className="text-[var(--gt-muted)] block text-[11px] font-semibold uppercase tracking-wider">Vị trí ghế ngồi</span>
              <strong className="text-2xl font-black text-emerald-950 font-mono mt-0.5 block">
                Ghế {lastCheckIn.seatCode}
              </strong>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/80">
              <span className="text-[var(--gt-muted)] block text-[11px] font-semibold uppercase tracking-wider">Hành khách</span>
              <strong className="text-lg font-bold text-emerald-950 mt-0.5 block">
                {lastCheckIn.passengerName}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50/80 rounded-xl px-3.5 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Trạng thái vé đã cập nhật: <strong className="uppercase font-bold">ĐÃ SOÁT VÉ (CHECKED_IN)</strong> trên hệ thống vận hành.
            </span>
          </div>
        </SurfaceCard>
      )}

      {/* Manifest section */}
      <SurfaceCard className="p-6 sm:p-7 space-y-5 rounded-[32px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--gt-border)]/60 pb-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-base text-[var(--gt-ink)]">
              <User className="h-4.5 w-4.5 text-[var(--gt-brand)]" />
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
              className="min-h-10 max-w-xs rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-4 py-2 text-xs font-semibold text-[var(--gt-ink)] focus:border-[var(--gt-brand)] outline-none shadow-xs"
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
              className="rounded-full text-xs px-3.5 py-2 bg-white/80 border-white/80 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${manifestLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {manifestLoading ? (
          <div className="py-12">
            <LoadingState message="Đang tải danh sách hành khách..." />
          </div>
        ) : !error && selectedTripId && manifest.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--gt-muted)]">
            Chuyến này chưa có hành khách đặt chỗ.
          </div>
        ) : manifest.length > 0 ? (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--gt-border)]/60 text-[11px] font-bold text-[var(--gt-muted)] uppercase tracking-wider">
                  <th className="px-4 py-3">Ghế</th>
                  <th className="px-4 py-3">Hành khách</th>
                  <th className="px-4 py-3">Bản sửa</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {manifest.map((passenger) => (
                  <tr key={passenger.ticketId} className="hover:bg-white/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[var(--gt-brand)]">
                      <div className="flex items-center gap-1.5">
                        <Armchair className="h-4 w-4" />
                        <span>{passenger.seat?.code || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[var(--gt-ink)]">
                      {passenger.passengerName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[var(--gt-muted)]">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100/80 text-[11px]">R{passenger.revision}</span>
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 text-right">
                      {passenger.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTicketToMarkNoShow(passenger.ticketId)}
                          className="border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs rounded-full px-3.5 py-1.5"
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

