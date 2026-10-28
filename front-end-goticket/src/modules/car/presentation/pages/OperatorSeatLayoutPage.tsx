import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Armchair, Check, MousePointer2 } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { PageHeader, SurfaceCard, InlineAlert, LoadingState, Button } from '@/shared/presentation/components';
import { DEFAULT_SEAT_CLASSES, type SeatClassOption } from '../../domain/seat-classes';

type SeatDraft = { code: string; level: number; seatClass: string; row: number; column: number };
type CarDetail = { id: string; name: string; licensePlate: string; totalSeats: number; seatTemplates: SeatDraft[] };
const columnCount = (rows: SeatDraft[]) => Math.max(1, ...rows.map(s => s.column + 1));
const inputClass = 'min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-[#FF385C] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20';

export const OperatorSeatLayoutPage: React.FC = () => {
  const { carId } = useParams<{ carId: string }>();
  const [car, setCar] = useState<CarDetail | null>(null);
  const [seats, setSeats] = useState<SeatDraft[]>([]);
  const [classes, setClasses] = useState<SeatClassOption[]>(DEFAULT_SEAT_CLASSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [deck, setDeck] = useState(1);
  const columns = columnCount(seats);
  const [focused, setFocused] = useState<number | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkClass, setBulkClass] = useState('STANDARD');
  const [presetCode, setPresetCode] = useState('');
  const [presetLabel, setPresetLabel] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setMessage(''); setSelected([]); setDirty(false);
    void Promise.all([
      httpClient.get<CarDetail>(`/api/v1/cars/${carId}`),
      httpClient.get<SeatClassOption[]>('/api/v1/cars/seat-classes'),
    ]).then(([data, catalog]) => {
      if (!active) return;
      setCar(data);
      setFocused(null); setMultiSelect(false);
      setSeats(data.seatTemplates.map(s => ({ code: s.code, level: s.level, seatClass: s.seatClass, row: s.row, column: s.column })));
      setClasses(catalog);
      setDeck(data.seatTemplates[0]?.level ?? 1);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được sơ đồ. Hãy tải lại trang.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [carId]);

  const update = (index: number, patch: Partial<SeatDraft>) => {
    if ((patch.row !== undefined && (!Number.isInteger(patch.row) || patch.row < 0 || patch.row > 100)) ||
        (patch.column !== undefined && (!Number.isInteger(patch.column) || patch.column < 0 || patch.column > 10))) {
      setError('Hàng phải từ 1 đến 101, cột từ 1 đến 11.'); return;
    }
    const current = seats[index];
    const targetRow = patch.row ?? current.row;
    const targetColumn = patch.column ?? current.column;
    if (patch.level === undefined && (patch.row !== undefined || patch.column !== undefined)) {
      const occupied = seats.find((s, i) => i !== index && s.level === current.level && s.row === targetRow && s.column === targetColumn);
      if (occupied) { setError(`Vị trí này đang có ghế ${occupied.code}. Hãy chọn vị trí trống hoặc sắp xếp lại sơ đồ.`); return; }
    }
    setError(''); setDirty(true); setMessage('');
    setSeats(rows => rows.map((s, i) => {
      if (i !== index) return s;
      if (patch.level !== undefined && patch.level !== s.level) {
        const target = rows.filter((r, n) => n !== index && r.level === patch.level);
        let position = 0;
        while (target.some(r => r.row === Math.floor(position / columns) && r.column === position % columns)) position++;
        return { ...s, ...patch, row: Math.floor(position / columns), column: position % columns };
      }
      return { ...s, ...patch };
    }));
  };
  const split = (count: number) => {
    setDirty(true); setSelected([]); setFocused(null); setDeck(1); setMessage('');
    const lower = count === 1 ? seats.length : Math.ceil(seats.length / 2);
    setSeats(rows => rows.map((s, i) => {
      const position = i < lower ? i : i - lower;
      return { ...s, level: i < lower ? 1 : 2, row: Math.floor(position / columns), column: position % columns };
    }));
  };
  const save = async () => {
    if (!car || saving) return;
    const normalized = seats.map(s => ({ ...s, code: s.code.trim().toUpperCase() }));
    if (normalized.length !== car.totalSeats || normalized.some(s => !s.code || s.code.length > 32 || !Number.isInteger(s.row) || s.row < 0 || s.row > 100 || !Number.isInteger(s.column) || s.column < 0 || s.column > 10) || new Set(normalized.map(s => s.code)).size !== seats.length) {
      setError('Cần đúng số ghế của xe, mã không trùng và hàng/cột là số nguyên hợp lệ.'); return;
    }
    if (new Set(normalized.map(s => `${s.level}:${s.row}:${s.column}`)).size !== seats.length) {
      setError('Có ghế trùng hàng/cột trên cùng tầng. Hãy điều chỉnh vị trí trước khi lưu.'); return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      await httpClient.put(`/api/v1/cars/${carId}/seats`, { seats: normalized });
      setSeats(normalized); setDirty(false);
      setMessage('Đã lưu sơ đồ. Các chuyến mở bán sau áp dụng cấu hình mới; vé và chuyến đã mở bán giữ nguyên sơ đồ.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được sơ đồ.'); }
    finally { setSaving(false); }
  };
  const addPreset = async (event: React.FormEvent) => {
    event.preventDefault(); if (savingPreset) return;
    setSavingPreset(true); setError('');
    try {
      await httpClient.post('/api/v1/cars/seat-classes', { code: presetCode.trim().toUpperCase(), label: presetLabel.trim() });
      setClasses(await httpClient.get<SeatClassOption[]>('/api/v1/cars/seat-classes'));
      setBulkClass(presetCode.trim().toUpperCase()); setPresetCode(''); setPresetLabel('');
      setMessage('Đã lưu hạng ghế cho nhà xe. Chọn ghế rồi áp dụng hạng này; bấm Lưu thay đổi để cập nhật sơ đồ.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được hạng ghế.'); }
    finally { setSavingPreset(false); }
  };
  if (loading) return <LoadingState message="Đang tải sơ đồ ghế..." />;
  const visible = seats.map((seat, index) => ({ seat, index })).filter(r => r.seat.level === deck);
  const chosen = focused !== null && seats[focused]?.level === deck ? seats[focused] : null;
  const maxColumn = Math.max(0, ...visible.map(r => r.seat.column));
  const maxRow = Math.max(0, ...visible.map(r => r.seat.row));
  const decks = [...new Set([1, 2, ...seats.map(s => s.level)])].sort();
  const classLabel = (code: string) => classes.find(c => c.code === code)?.label || code;
  const reflow = (nextColumns: number) => {
    setSeats(rows => {
      const positions: Record<number, number> = {};
      // Preserve codes, decks and seat classes, sort by physical position per deck.
      const arranged = new Map<number, { row: number; column: number }>();
      rows.map((seat, index) => ({ seat, index })).sort((a, b) => a.seat.level - b.seat.level || a.seat.row - b.seat.row || a.seat.column - b.seat.column).forEach(({ seat, index }) => {
        const position = positions[seat.level] ?? 0;
        arranged.set(index, { row: Math.floor(position / nextColumns), column: position % nextColumns });
        positions[seat.level] = position + 1;
      });
      return rows.map((seat, index) => ({ ...seat, ...arranged.get(index)! }));
    });
    setDirty(true); setError(''); setMessage('');
  };
  return <div className="space-y-6">
    <Link to="/operator/cars" onClick={e => { if (dirty && !window.confirm('Bạn chưa lưu sơ đồ. Rời trang và bỏ các thay đổi?')) e.preventDefault(); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#B8173B]"><ArrowLeft size={16} />Đội xe</Link>
    <PageHeader title={car?.name || 'Sơ đồ ghế'} description={`${car?.licensePlate || ''} · ${seats.length} ghế. Sửa sơ đồ không làm thay đổi vé và chuyến đã mở bán.`} actions={<Button className="min-h-11 bg-[#BE123C] text-white hover:bg-[#9F1239]" onClick={() => void save()} disabled={saving || !dirty || !car}><Save size={16} className="mr-2" />{saving ? 'Đang lưu...' : dirty ? 'Lưu thay đổi' : 'Sơ đồ đã lưu'}</Button>} />
    {error && <InlineAlert variant="error" title="Chưa hoàn tất" message={error} onClose={() => setError('')} />}
    {message && <InlineAlert variant="success" title="Đã cập nhật" message={message} onClose={() => setMessage('')} />}
    {dirty && <p role="status" className="text-sm font-semibold text-amber-800">Có thay đổi chưa lưu. Bấm “Lưu thay đổi” để áp dụng cho các chuyến mở bán sau.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <SurfaceCard className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2" aria-label="Chọn tầng">{decks.map(level => <Button key={level} variant={deck === level ? 'default' : 'outline'} aria-pressed={deck === level} className={`min-h-11 border ${deck === level ? 'border-[#BE123C] bg-[#FFF0F2] text-[#9F1239]' : 'border-gray-200 bg-white text-gray-700'}`} disabled={saving} onClick={() => { setDeck(level); setFocused(null); }}>Tầng {level} · {seats.filter(s => s.level === level).length} ghế</Button>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">{multiSelect ? 'Chọn các ghế cần đổi hạng, sau đó áp dụng ở bên cạnh.' : 'Bấm một ghế để xem và chỉnh sửa chi tiết.'}</p>
          <Button variant="outline" disabled={saving} aria-pressed={multiSelect} onClick={() => { setMultiSelect(!multiSelect); setSelected([]); }}> {multiSelect ? 'Xong chọn nhiều' : 'Chọn nhiều ghế'}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-y border-gray-100 py-4">
          <label className="text-sm font-semibold">Số cột ghế
            <select aria-label="Số cột sơ đồ ghế" disabled={saving || !car} value={columnCount(seats)} onChange={e => reflow(Number(e.target.value))} className={`${inputClass} mt-2 min-w-32`}>
              {[...new Set([2, 3, 4, columnCount(seats)])].sort((a, b) => a - b).map(count => <option key={count} value={count}>{count} cột</option>)}
            </select>
          </label>
          <p className="max-w-md text-sm text-gray-600">Đổi số cột để sắp xếp ngay cả hai tầng. Giữ nguyên mã, hạng và số ghế mỗi tầng; bấm “Lưu thay đổi” để lưu.</p>
        </div>
        {!visible.length ? <p className="py-10 text-center text-gray-600">Tầng này chưa có ghế. Mở “Sắp xếp sơ đồ” bên dưới để chia tầng.</p> : <div className="overflow-x-auto pb-2">
          <div className="mx-auto w-max max-w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <div className="mb-5 flex items-center justify-between gap-8 border-b border-gray-200 pb-4 text-sm font-semibold text-gray-600"><span>Đầu xe</span><span>Tầng {deck}</span></div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${maxColumn + 1}, minmax(48px, 64px))` }}>
              {Array.from({ length: maxRow + 1 }, (_, row) => Array.from({ length: maxColumn + 1 }, (_, column) => {
                const entry = visible.find(item => item.seat.row === row && item.seat.column === column);
                if (!entry) return <span key={`${row}:${column}`} aria-hidden="true" />;
                const { seat, index } = entry;
                const highlighted = multiSelect ? selected.includes(index) : focused === index;
                return <button type="button" key={`${row}:${column}`} disabled={saving} aria-pressed={highlighted} aria-label={`Ghế ${seat.code}, tầng ${seat.level}, ${classLabel(seat.seatClass)}`} onClick={() => {
                  setFocused(index);
                  if (window.innerWidth < 1024) requestAnimationFrame(() => document.getElementById('seat-detail-panel')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
                  if (multiSelect) setSelected(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
                }} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF385C] disabled:opacity-50 ${highlighted ? 'border-[#FF385C] bg-[var(--gt-coral-soft)] text-[#B8173B]' : 'border-gray-200 bg-white text-gray-800 hover:border-[#FF385C]'}`}>
                  {highlighted ? <Check size={19} /> : <Armchair size={19} />}<strong className="max-w-full truncate">{seat.code}</strong>
                  <span className="w-full truncate text-[11px]" title={classLabel(seat.seatClass)}>{classLabel(seat.seatClass)}</span>
                </button>;
              }))}
            </div>
            <p className="mt-5 border-t border-gray-200 pt-3 text-center text-xs font-semibold text-gray-500">Cuối xe</p>
          </div>
        </div>}
        <details className="border-t border-gray-100 pt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Sắp xếp sơ đồ</summary>
          <p className="my-3 text-sm text-gray-600">Sơ đồ hiện có {columnCount(seats)} cột. Gộp hoặc chia tầng sẽ dùng số cột này; thay đổi cần được lưu để áp dụng.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={saving || !car} onClick={() => split(1)}>Gộp thành 1 tầng</Button><Button variant="outline" disabled={saving || seats.length < 2} onClick={() => split(2)}>Chia đều thành 2 tầng</Button></div>
          <p className="mt-3 text-sm text-gray-600">Các thao tác này tạo bản chỉnh sửa. Kiểm tra lại sơ đồ rồi lưu thay đổi.</p>
        </details>
      </SurfaceCard>
      <SurfaceCard id="seat-detail-panel" variant="flat" className="scroll-mt-5 space-y-4 p-5 lg:sticky lg:top-5">
        {multiSelect ? <>
          <h2 className="text-lg font-bold">Đổi hạng ghế hàng loạt</h2>
          <p className="text-sm text-gray-600">Đã chọn {selected.length} ghế trên các tầng.</p>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!visible.length || saving} checked={visible.length > 0 && visible.every(r => selected.includes(r.index))} onChange={e => setSelected(prev => e.target.checked ? [...new Set([...prev, ...visible.map(r => r.index)])] : prev.filter(i => !visible.some(r => r.index === i)))} />Chọn cả tầng {deck}</label>
          <label className="block text-sm font-semibold">Hạng ghế<select aria-label="Hạng ghế áp dụng hàng loạt" className={`${inputClass} mt-2`} disabled={saving} value={bulkClass} onChange={e => setBulkClass(e.target.value)}>{classes.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
          <Button className="min-h-11 bg-[#BE123C] text-white hover:bg-[#9F1239]" disabled={!selected.length || saving} onClick={() => { setSeats(rows => rows.map((s, i) => selected.includes(i) ? { ...s, seatClass: bulkClass } : s)); setDirty(true); setMessage(''); }}>Áp dụng cho {selected.length} ghế</Button>
        </> : chosen && focused !== null ? <fieldset disabled={saving} className="space-y-4">
          <legend className="mb-3 text-lg font-bold">Chi tiết ghế {chosen.code}</legend>
          <label className="block text-sm font-semibold">Mã ghế<input aria-label="Mã ghế đang chọn" className={`${inputClass} mt-2`} maxLength={32} value={chosen.code} onChange={e => update(focused, { code: e.target.value.toUpperCase() })} /></label>
          <label className="block text-sm font-semibold">Hạng ghế<select aria-label="Hạng ghế đang chọn" className={`${inputClass} mt-2`} value={chosen.seatClass} onChange={e => update(focused, { seatClass: e.target.value })}>{!classes.some(c => c.code === chosen.seatClass) && <option value={chosen.seatClass}>{chosen.seatClass} (hạng cũ)</option>}{classes.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
          <label className="block text-sm font-semibold">Tầng<select aria-label="Tầng ghế đang chọn" className={`${inputClass} mt-2`} value={chosen.level} onChange={e => { update(focused, { level: Number(e.target.value) }); setDeck(Number(e.target.value)); }}>{decks.map(n => <option key={n} value={n}>Tầng {n}</option>)}</select></label>
          <p className="text-sm text-gray-600">Những thay đổi này nằm trong bản chỉnh sửa. Bấm “Lưu thay đổi” ở đầu trang để lưu sơ đồ.</p>
        </fieldset> : <div className="py-6 text-center"><MousePointer2 className="mx-auto mb-3 text-[#B8173B]" size={28} /><h2 className="font-bold">Chọn ghế trên sơ đồ</h2><p className="mt-2 text-sm text-gray-600">Bấm một ghế để sửa mã, hạng và tầng. Có thể đổi hạng nhiều ghế cùng lúc.</p></div>}
      </SurfaceCard>
    </div>
    <SurfaceCard className="p-5"><details><summary className="min-h-11 cursor-pointer py-2 text-base font-semibold">Hạng ghế dùng chung cho đội xe</summary><p className="my-3 text-sm text-gray-600">Lưu trước hạng ghế để chọn cho mọi xe của nhà xe. Giá bán được cấu hình riêng ở từng chuyến.</p>
      <ul className="mb-4 flex flex-wrap gap-2">{classes.map(c => <li key={c.code} className="rounded-lg border px-3 py-2 text-sm">{c.label}</li>)}</ul>
      <form onSubmit={addPreset} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Mã hạng<input aria-label="Mã hạng mới" required maxLength={32} pattern="[A-Z0-9_]+" placeholder="VD: CABIN_DOI" value={presetCode} onChange={e => setPresetCode(e.target.value.toUpperCase())} className={`${inputClass} mt-1`} /></label>
        <label className="text-sm">Tên hiển thị<input aria-label="Tên hạng mới" required maxLength={80} placeholder="VD: Cabin đôi" value={presetLabel} onChange={e => setPresetLabel(e.target.value)} className={`${inputClass} mt-1`} /></label>
        <Button type="submit" className="min-h-11 bg-[#BE123C] text-white hover:bg-[#9F1239]" disabled={savingPreset}>{savingPreset ? 'Đang lưu...' : 'Lưu hạng ghế'}</Button>
      </form></details></SurfaceCard>
  </div>;
};
