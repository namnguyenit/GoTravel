import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Armchair, CheckCircle2, Loader2, Plus, Save, Trash2, Layers, RefreshCw } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  ConfirmDialog,
  Button,
} from '@/shared/presentation/components';

type SeatDraft = {
  code: string;
  level: number;
  seatClass: string;
  row: number;
  column: number;
};

type CarDetail = {
  id: string;
  name: string;
  licensePlate: string;
  totalSeats: number;
  seatTemplates?: SeatDraft[];
};

export const OperatorSeatLayoutPage: React.FC = () => {
  const { carId } = useParams<{ carId: string }>();
  const [car, setCar] = useState<CarDetail | null>(null);
  const [seats, setSeats] = useState<SeatDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!carId) return;
      try {
        const data = await httpClient.get<CarDetail>(`/api/v1/cars/${carId}`);
        setCar(data);
        const current = Array.isArray(data.seatTemplates)
          ? data.seatTemplates.map((s) => ({
              code: s.code,
              level: Number(s.level) || 1,
              seatClass: s.seatClass || 'STANDARD',
              row: Number(s.row) || 0,
              column: Number(s.column) || 0,
            }))
          : [];

        setSeats(
          current.length
            ? current
            : Array.from({ length: data.totalSeats }, (_, i) => ({
                code: `A${String(i + 1).padStart(2, '0')}`,
                level: 1,
                seatClass: 'STANDARD',
                row: Math.floor(i / 4),
                column: i % 4,
              }))
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Không thể tải sơ đồ ghế.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [carId]);

  const levels = useMemo(() => [...new Set(seats.map((s) => s.level))].sort(), [seats]);

  const update = (index: number, patch: Partial<SeatDraft>) => {
    setIsDirty(true);
    setSeats((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const add = () => {
    setIsDirty(true);
    setSeats((rows) => [
      ...rows,
      {
        code: `S${rows.length + 1}`,
        level: 1,
        seatClass: 'STANDARD',
        row: Math.floor(rows.length / 4),
        column: rows.length % 4,
      },
    ]);
  };

  const remove = (index: number) => {
    setIsDirty(true);
    setSeats((rows) => rows.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!carId) return;
    const codes = seats.map((s) => s.code.trim().toUpperCase());
    if (!seats.length || codes.some((c) => !c) || new Set(codes).size !== codes.length) {
      setError('Mã ghế phải có giá trị và không được trùng lặp.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await httpClient.put(`/api/v1/cars/${carId}/seats`, {
        seats: seats.map((s, i) => ({
          ...s,
          code: codes[i],
          seatClass: s.seatClass.trim().toUpperCase(),
        })),
      });
      setMessage('Đã lưu sơ đồ ghế thành công. Các chuyến mới tạo sẽ tự động áp dụng mẫu này.');
      setIsDirty(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu sơ đồ ghế.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Đang tải sơ đồ ghế phương tiện..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/operator/cars"
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--gt-muted)] hover:text-[var(--gt-coral)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đội xe
      </Link>

      <PageHeader
        title={`Sơ đồ ghế: ${car?.name || ''}`}
        description={`Biển kiểm soát: ${car?.licensePlate} · Tổng cấu hình: ${seats.length} ghế`}
        eyebrow="Cấu hình phương tiện"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={add}
              disabled={seats.length >= 100}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm ghế
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving}
              className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isDirty ? `Lưu sơ đồ (${seats.length}) *` : `Đã lưu (${seats.length})`}
            </Button>
          </div>
        }
      />

      {error && (
        <InlineAlert variant="error" title="Lỗi sơ đồ ghế" message={error} onClose={() => setError('')} />
      )}
      {message && (
        <InlineAlert variant="success" title="Thành công" message={message} onClose={() => setMessage('')} />
      )}

      {/* Levels & Seats Grid */}
      <div className="space-y-6">
        {levels.map((level) => (
          <SurfaceCard key={level} className="p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[var(--gt-border-soft)] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[var(--gt-coral)]" />
                <h2 className="text-base font-bold text-[var(--gt-ink)]">
                  Cấu hình Tầng {level}
                </h2>
              </div>
              <span className="text-xs font-semibold text-[var(--gt-muted)]">
                {seats.filter((s) => s.level === level).length} vị trí
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {seats.map(
                (seat, index) =>
                  seat.level === level && (
                    <div
                      key={index}
                      className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Armchair className="h-4 w-4 text-[var(--gt-coral)]" />
                          <span className="font-mono font-bold text-sm text-[var(--gt-ink)]">
                            {seat.code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label="Xóa ghế"
                          className="rounded-xl p-1 text-[var(--gt-muted)] hover:text-[var(--gt-danger)] hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gt-muted)]">
                            Mã ghế
                          </label>
                          <input
                            value={seat.code}
                            onChange={(e) => update(index, { code: e.target.value.toUpperCase() })}
                            className="mt-1 w-full rounded-xl border border-[var(--gt-border)] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gt-muted)]">
                            Hạng ghế
                          </label>
                          <input
                            value={seat.seatClass}
                            onChange={(e) => update(index, { seatClass: e.target.value.toUpperCase() })}
                            className="mt-1 w-full rounded-xl border border-[var(--gt-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gt-muted)]">
                            Tầng
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={3}
                            value={seat.level}
                            onChange={(e) => update(index, { level: Number(e.target.value) })}
                            className="mt-1 w-full rounded-xl border border-[var(--gt-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--gt-muted)]">
                            Hàng / Cột
                          </label>
                          <div className="mt-1 flex gap-1">
                            <input
                              aria-label="Hàng"
                              type="number"
                              min={0}
                              max={50}
                              value={seat.row}
                              onChange={(e) => update(index, { row: Number(e.target.value) })}
                              className="w-1/2 rounded-xl border border-[var(--gt-border)] bg-white px-1.5 py-1.5 text-xs text-center font-semibold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
                            />
                            <input
                              aria-label="Cột"
                              type="number"
                              min={0}
                              max={10}
                              value={seat.column}
                              onChange={(e) => update(index, { column: Number(e.target.value) })}
                              className="w-1/2 rounded-xl border border-[var(--gt-border)] bg-white px-1.5 py-1.5 text-xs text-center font-semibold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
              )}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
};
