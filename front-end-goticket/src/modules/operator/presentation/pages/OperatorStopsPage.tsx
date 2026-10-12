import React, { useEffect, useState } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  MapPin,
  Plus,
  Loader2,
  Archive,
  Search,
  Edit2,
  Building,
} from 'lucide-react';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  ConfirmDialog,
  LoadingState,
  EmptyState,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface StopItem {
  id: string;
  name: string;
  address?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  archived?: boolean;
}

export const OperatorStopsPage: React.FC = () => {
  const [stops, setStops] = useState<StopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Edit dialog state
  const [editingStop, setEditingStop] = useState<StopItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editProvince, setEditProvince] = useState<string>('');

  // Archive confirm state
  const [archiveTarget, setArchiveTarget] = useState<StopItem | null>(null);

  const fetchStops = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await httpClient.get<any>('/api/v1/operators/me/stops');
      const list = Array.isArray(res?.stops)
        ? res.stops
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setStops(list.map((stop: any) => ({ ...stop, archived: stop.active === false })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách điểm dừng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await httpClient.post<any>('/api/v1/operators/me/stops', {
        name: name.trim(),
        address: address.trim(),
        province: city.trim(),
      });

      setName('');
      setAddress('');
      setCity('');
      await fetchStops();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Tạo điểm dừng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (stop: StopItem) => {
    setEditingStop(stop);
    setEditName(stop.name);
    setEditAddress(stop.address || '');
    setEditProvince(stop.province || '');
  };

  const submitEditStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop || !editName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await httpClient.patch(`/api/v1/operators/me/stops/${editingStop.id}`, {
        name: editName.trim(),
        address: editAddress.trim(),
        province: editProvince.trim(),
      });
      setEditingStop(null);
      await fetchStops();
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Không thể cập nhật điểm dừng.');
    } finally {
      setSubmitting(false);
    }
  };

  const executeArchive = async () => {
    if (!archiveTarget) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await httpClient.patch(`/api/v1/operators/me/stops/${archiveTarget.id}/archive`);
      setArchiveTarget(null);
      await fetchStops();
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Không thể lưu trữ điểm dừng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Điểm đón / Trả khách"
        description="Thiết lập danh mục các trạm dừng, bến xe, văn phòng để áp dụng vào các tuyến xe liên tỉnh."
        eyebrow="Kênh Nhà Xe"
      />

      {submitError && (
        <InlineAlert variant="error" title="Lỗi" message={submitError} onClose={() => setSubmitError(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Create Stop Form (5 cols) */}
        <SurfaceCard className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--gt-border-soft)] pb-3">
            <Plus className="w-4 h-4 text-[var(--gt-coral)]" />
            <h2 className="font-bold text-base text-[var(--gt-ink)]">
              Thêm điểm đón / trả mới
            </h2>
          </div>

          <form onSubmit={handleCreateStop} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tên điểm dừng <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Bến xe Miền Đông mới / VP Quận 1"
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Địa chỉ chi tiết <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 501 Hoàng Hữu Nam, Long Bình"
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tỉnh / Thành phố <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="VD: TP. Hồ Chí Minh"
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-coral flex w-full items-center justify-center gap-2 py-3 text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Đang tạo...' : 'Lưu điểm đón/trả mới'}
            </button>
          </form>
        </SurfaceCard>

        {/* Stop List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[var(--gt-ink)]">
              Danh sách điểm đón / trả ({stops.length})
            </h2>
          </div>

          {loading ? (
            <SurfaceCard className="p-8">
              <LoadingState message="Đang tải danh sách điểm đón trả..." />
            </SurfaceCard>
          ) : stops.length === 0 ? (
            <SurfaceCard className="p-8">
              <EmptyState
                icon={MapPin}
                title="Chưa có điểm đón/trả nào"
                description="Hãy dùng form bên trái để tạo các trạm đón và điểm trung chuyển đầu tiên."
              />
            </SurfaceCard>
          ) : (
            <div className="space-y-3">
              {stops.map((stop) => (
                <SurfaceCard
                  key={stop.id}
                  className={`p-4 transition ${
                    stop.archived ? 'opacity-60 bg-[var(--gt-surface-soft)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)] mt-0.5">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[var(--gt-ink)]">
                            {stop.name}
                          </h3>
                          <StatusBadge status={stop.archived ? 'CANCELLED' : 'ACTIVE'} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--gt-text)]">
                          {stop.address || 'Chưa cập nhật địa chỉ'}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[var(--gt-muted)]">
                          Khu vực: {stop.province || 'Toàn quốc'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(stop)}
                        className="rounded-xl border border-[var(--gt-border)] bg-white p-2 text-[var(--gt-muted)] hover:text-[var(--gt-ink)] hover:border-gray-400 transition"
                        title="Chỉnh sửa điểm"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {!stop.archived && (
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(stop)}
                          className="rounded-xl border border-[var(--gt-border)] bg-white p-2 text-[var(--gt-muted)] hover:text-[var(--gt-danger)] hover:border-rose-300 transition"
                          title="Lưu trữ điểm"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Stop Dialog (replaces window.prompt) */}
      <Dialog open={Boolean(editingStop)} onOpenChange={(isOpen) => !isOpen && setEditingStop(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--gt-ink)]">
              Chỉnh sửa điểm đón / trả
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submitEditStop} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tên điểm <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Địa chỉ
              </label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tỉnh / Thành phố
              </label>
              <input
                value={editProvince}
                onChange={(e) => setEditProvince(e.target.value)}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingStop(null)}
                className="rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--gt-muted)] hover:bg-[var(--gt-surface-soft)]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-coral px-5 py-2 text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(isOpen) => !isOpen && setArchiveTarget(null)}
        title="Lưu trữ điểm đón/trả"
        description={`Bạn có chắc muốn lưu trữ điểm "${archiveTarget?.name}"? Các chuyến và vé cũ đã sử dụng điểm này vẫn được giữ nguyên dữ liệu.`}
        confirmLabel="Lưu trữ điểm"
        variant="warning"
        loading={submitting}
        onConfirm={executeArchive}
      />
    </div>
  );
};
