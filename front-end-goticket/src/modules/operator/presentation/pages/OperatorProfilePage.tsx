import React, { useEffect, useState } from 'react';
import { Building2, Save, ShieldCheck, Image as ImageIcon, Loader2 } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  Button,
} from '@/shared/presentation/components';

type OperatorProfile = {
  id: string;
  name: string;
  displayName?: string;
  logoUrl?: string;
  contactPhone?: string;
  contactAddress?: string;
  description?: string;
  status: 'ACTIVE' | 'SUSPENDED';
};

export const OperatorProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    logoUrl: '',
    contactPhone: '',
    contactAddress: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await httpClient.get<OperatorProfile>('/api/v1/operators/me/profile');
      setProfile(data);
      setForm({
        displayName: data.displayName || data.name || '',
        logoUrl: data.logoUrl || '',
        contactPhone: data.contactPhone || '',
        contactAddress: data.contactAddress || '',
        description: data.description || '',
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ nhà xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    if (key === 'logoUrl') setLogoPreviewError(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await httpClient.patch<OperatorProfile>('/api/v1/operators/me/profile', {
        displayName: form.displayName.trim(),
        logoUrl: form.logoUrl.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactAddress: form.contactAddress.trim() || null,
        description: form.description.trim() || null,
      });
      setProfile(data);
      setMessage('Đã lưu thành công thông tin hồ sơ hiển thị của nhà xe.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ nhà xe.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải hồ sơ nhà xe..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Hồ sơ thương hiệu nhà xe"
        eyebrow="Kênh Nhà Xe · Thông tin hiển thị"
        description="Thông tin hiển thị cho hành khách khi tìm kiếm chuyến và đặt vé trên GoTicket."
      />

      {/* Brand Identity Preview Card */}
      <SurfaceCard variant="glass" className="p-6 rounded-[28px] border border-white/80 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/80 border border-white/90 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {form.logoUrl && !logoPreviewError ? (
                <img
                  src={form.logoUrl}
                  alt={form.displayName || 'Logo'}
                  className="h-full w-full object-cover"
                  onError={() => setLogoPreviewError(true)}
                />
              ) : (
                <Building2 className="h-7 w-7 text-[#FF385C]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {form.displayName || profile?.name || 'Nhà xe đối tác'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Pháp nhân KYC: <strong>{profile?.name}</strong></span>
                <span>·</span>
                <span>Mã: <strong className="font-mono">{profile?.id?.slice(0, 8)}...</strong></span>
              </div>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-2xs ${
                profile?.status === 'ACTIVE'
                  ? 'bg-emerald-50/90 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50/90 text-rose-800 border border-rose-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã đình chỉ'}
            </span>
          </div>
        </div>
      </SurfaceCard>

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi hồ sơ"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {message && (
        <InlineAlert
          variant="success"
          title="Thông báo"
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      {/* Profile Form */}
      <SurfaceCard variant="glass" className="p-6 rounded-[28px] border border-white/80 shadow-glass">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tên thương hiệu hiển thị <span className="text-rose-600">*</span>
              </label>
              <input
                required
                minLength={3}
                maxLength={120}
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                placeholder="VD: Xe Khách Phương Trang"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Số điện thoại liên hệ
              </label>
              <input
                maxLength={30}
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                placeholder="VD: 1900 6067"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Địa chỉ văn phòng / bến liên hệ
              </label>
              <input
                maxLength={255}
                value={form.contactAddress}
                onChange={(e) => update('contactAddress', e.target.value)}
                placeholder="VD: 272 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                URL ảnh Logo (kích thước đề xuất: 256x256)
              </label>
              <input
                type="url"
                maxLength={1000}
                value={form.logoUrl}
                onChange={(e) => update('logoUrl', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Giới thiệu dịch vụ & chính sách nhà xe
              </label>
              <textarea
                rows={5}
                maxLength={2000}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Giới thiệu về kinh nghiệm phục vụ, các tuyến thế mạnh, tiêu chuẩn dòng xe..."
                className="w-full rounded-[24px] border border-gray-200/80 bg-white/90 p-4 text-xs font-medium text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100/80 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-full px-7 py-2.5 font-bold shadow-md glow-coral-sm cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu hồ sơ nhà xe
                </>
              )}
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
};
