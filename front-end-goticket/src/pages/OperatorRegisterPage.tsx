import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock, FileCheck2, ShieldCheck, Upload, AlertCircle, ArrowRight } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  CustomerPageContainer,
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
} from '@/shared/presentation/components';
import { Link } from 'react-router-dom';

type KycProfile = {
  companyName: string;
  companyAddress: string;
  representativeName: string;
  representativeIdNumber: string;
  taxCode?: string;
  contactPhone?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
};

const empty = {
  companyName: '',
  companyAddress: '',
  representativeName: '',
  representativeIdNumber: '',
  taxCode: '',
  contactPhone: '',
};

export const OperatorRegisterPage: React.FC = () => {
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [form, setForm] = useState(empty);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await httpClient.get<KycProfile>('/api/v1/me/ticket-vendor-profile');
      setProfile(data);
      setForm({
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        representativeName: data.representativeName || '',
        representativeIdNumber: data.representativeIdNumber || '',
        taxCode: data.taxCode || '',
        contactPhone: data.contactPhone || '',
      });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile && (!frontImage || !backImage)) {
      setError('Vui lòng tải đủ hai mặt giấy tờ (CCCD/Hộ chiếu) của người đại diện.');
      return;
    }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (frontImage) body.append('frontImage', frontImage);
    if (backImage) body.append('backImage', backImage);
    setSaving(true);
    setError('');
    try {
      if (profile) await httpClient.put('/api/v1/me/ticket-vendor-application', body);
      else await httpClient.post('/api/v1/me/ticket-vendor-application', body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-16">
        <LoadingState message="Đang kiểm tra hồ sơ đối tác nhà xe..." />
      </CustomerPageContainer>
    );
  }

  if (profile?.approvalStatus === 'PENDING' || profile?.approvalStatus === 'APPROVED') {
    const approved = profile.approvalStatus === 'APPROVED';
    return (
      <CustomerPageContainer className="max-w-3xl py-12">
        <SurfaceCard className="overflow-hidden p-8 text-center sm:p-10">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              approved
                ? 'bg-[var(--gt-success-soft)] text-[var(--gt-success)]'
                : 'bg-[var(--gt-warning-soft)] text-[var(--gt-warning)]'
            }`}
          >
            {approved ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--gt-coral)]">
            Hồ sơ đối tác GoTicket
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-[var(--gt-ink)] sm:text-3xl">
            {approved ? 'Nhà xe đã được phê duyệt chính thức' : 'Hồ sơ đang được thẩm định'}
          </h1>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">
            {profile.companyName} · {profile.companyAddress}
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-5 text-sm text-[var(--gt-text)]">
            {approved ? (
              <div className="space-y-4">
                <p>
                  Quyền nhà xe và kênh quản trị của bạn đã sẵn sàng hoạt động. Bạn có thể truy cập ngay Cổng Nhà Xe để quản lý đội xe và tạo chuyến mới.
                </p>
                <Link
                  to="/operator/dashboard"
                  className="btn-coral inline-flex items-center gap-2 px-6 py-3 text-xs font-bold"
                >
                  Truy cập Kênh Nhà Xe <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p>
                Đội ngũ kiểm duyệt GoTicket đang thẩm định giấy tờ pháp lý của bạn. Kết quả sẽ được cập nhật tại trang này sau khi hoàn tất.
              </p>
            )}
          </div>
        </SurfaceCard>
      </CustomerPageContainer>
    );
  }

  const update = (key: keyof typeof empty, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));

  return (
    <CustomerPageContainer className="max-w-4xl space-y-8 py-8">
      <PageHeader
        title="Đăng ký Đối tác Nhà xe GoTicket"
        description="Tham gia mạng lưới đối tác vận tải hành khách uy tín trên toàn quốc. Thông tin này dùng để thẩm định pháp nhân và khởi tạo kênh vận hành."
        eyebrow="Xác thực pháp nhân một lần"
      />

      {profile?.approvalStatus === 'REJECTED' && (
        <InlineAlert
          variant="error"
          title="Hồ sơ cần bổ sung / chỉnh sửa"
          message={profile.rejectionReason || 'Vui lòng kiểm tra lại thông tin và giấy tờ đính kèm.'}
        />
      )}

      <form onSubmit={submit} className="space-y-6">
        <SurfaceCard className="p-6 md:p-8">
          <div className="flex items-center gap-2.5 border-b border-[var(--gt-border-soft)] pb-4">
            <Building2 className="h-5 w-5 text-[var(--gt-coral)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--gt-ink)]">
                Thông tin pháp nhân doanh nghiệp / Hộ kinh doanh
              </h2>
              <p className="text-xs text-[var(--gt-muted)]">
                Nhập chính xác như trên giấy chứng nhận đăng ký kinh doanh.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tên công ty / Tên nhà xe <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                maxLength={255}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Ví dụ: Công ty TNHH Vận Tải Hành Khách Phương Trang"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Địa chỉ trụ sở kinh doanh <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={form.companyAddress}
                onChange={(e) => update('companyAddress', e.target.value)}
                maxLength={255}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Địa chỉ đăng ký doanh nghiệp"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Họ tên người đại diện pháp luật <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={form.representativeName}
                onChange={(e) => update('representativeName', e.target.value)}
                maxLength={255}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Số CCCD / Hộ chiếu người đại diện <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={form.representativeIdNumber}
                onChange={(e) => update('representativeIdNumber', e.target.value)}
                maxLength={30}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Số căn cước 12 chữ số"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Mã số thuế doanh nghiệp
              </label>
              <input
                value={form.taxCode}
                onChange={(e) => update('taxCode', e.target.value)}
                maxLength={255}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Mã số thuế (nếu có)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                maxLength={255}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                placeholder="Số hotline hoặc số di động"
              />
            </div>
          </div>
        </SurfaceCard>

        {/* Giấy tờ xác thực */}
        <SurfaceCard className="p-6 md:p-8">
          <div className="flex items-center gap-2.5 border-b border-[var(--gt-border-soft)] pb-4">
            <FileCheck2 className="h-5 w-5 text-[var(--gt-coral)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--gt-ink)]">
                Ảnh giấy tờ tùy thân của người đại diện
              </h2>
              <p className="text-xs text-[var(--gt-muted)]">
                Ảnh chụp rõ nét 2 mặt CCCD / Hộ chiếu. Ảnh chỉ dùng cho mục đích đối soát pháp lý.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Mặt trước CCCD {!profile?.documentFrontUrl && <span className="text-[var(--gt-coral)]">*</span>}
              </label>
              <div className="rounded-2xl border-2 border-dashed border-[var(--gt-border)] p-4 text-center transition hover:border-[var(--gt-coral)]">
                <input
                  type="file"
                  id="front"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFrontImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="front" className="cursor-pointer space-y-1">
                  <Upload className="mx-auto h-6 w-6 text-[var(--gt-muted)]" />
                  <p className="text-xs font-bold text-[var(--gt-ink)]">
                    {frontImage ? frontImage.name : 'Chọn ảnh mặt trước'}
                  </p>
                  <p className="text-[11px] text-[var(--gt-muted)]">JPG, PNG hoặc WebP</p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Mặt sau CCCD {!profile?.documentBackUrl && <span className="text-[var(--gt-coral)]">*</span>}
              </label>
              <div className="rounded-2xl border-2 border-dashed border-[var(--gt-border)] p-4 text-center transition hover:border-[var(--gt-coral)]">
                <input
                  type="file"
                  id="back"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setBackImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="back" className="cursor-pointer space-y-1">
                  <Upload className="mx-auto h-6 w-6 text-[var(--gt-muted)]" />
                  <p className="text-xs font-bold text-[var(--gt-ink)]">
                    {backImage ? backImage.name : 'Chọn ảnh mặt sau'}
                  </p>
                  <p className="text-[11px] text-[var(--gt-muted)]">JPG, PNG hoặc WebP</p>
                </label>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {error && <InlineAlert variant="error" title="Lỗi gửi hồ sơ" message={error} />}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-coral flex items-center gap-2 px-8 py-3.5 text-sm font-bold shadow-md disabled:opacity-50"
          >
            {saving ? 'Đang gửi...' : profile ? 'Cập nhật lại hồ sơ' : 'Gửi hồ sơ xét duyệt đối tác'}
          </button>
        </div>
      </form>
    </CustomerPageContainer>
  );
};
