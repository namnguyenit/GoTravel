import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  SurfaceCard,
  InlineAlert,
  Button,
  IdText,
} from '@/shared/presentation/components';

export const OperatorOfferContentPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await httpClient.put(`/api/v1/catalog/transport/offers/${listingId}/content`, {
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnailUrl.trim() || null,
      });
      setMessage('Đã cập nhật nội dung hiển thị của listing trên GoTicket thành công.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật nội dung.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Nội dung niêm yết mở bán"
        eyebrow="Kênh Nhà Xe · Quản lý Nội dung"
        description={
          <div className="flex items-center gap-2 pt-0.5">
            <IdText id={listingId || ''} prefix="Listing" />
            <span>·</span>
            <span>Cập nhật tiêu đề, mô tả và hình ảnh đại diện khách thấy trên GoTicket.</span>
          </div>
        }
        breadcrumbs={[
          { label: 'Quản lý đơn vé', to: '/operator/orders' },
          { label: 'Nội dung niêm yết' },
        ]}
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Thông báo lỗi"
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

      <SurfaceCard className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1.5">
              Tiêu đề hiển thị của tuyến xe <span className="text-rose-600">*</span>
            </label>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Xe Limousine Sài Gòn - Đà Lạt giường phòng VIP"
              className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1.5">
              Mô tả chi tiết tiện ích & lịch trình <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              maxLength={10000}
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả các tiện ích: wifi, cổng sạc, nước uống, chính sách đón trả tận nơi..."
              className="w-full rounded-2xl border border-[var(--gt-border)] bg-white p-3.5 text-xs font-medium text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1.5">
              URL ảnh đại diện banner (Thumbnail)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                maxLength={1000}
                value={thumbnailUrl}
                onChange={(e) => {
                  setImageError(false);
                  setThumbnailUrl(e.target.value);
                }}
                placeholder="https://..."
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-medium text-[var(--gt-ink)] outline-none focus:border-[var(--gt-coral)]"
              />
            </div>
          </div>

          {thumbnailUrl && !imageError && (
            <div className="rounded-2xl border border-[var(--gt-border)] overflow-hidden">
              <img
                src={thumbnailUrl}
                alt="Xem trước ảnh đại diện"
                className="h-48 w-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          <div className="pt-4 border-t border-[var(--gt-border)] flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-2xl px-6 font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu nội dung niêm yết
                </>
              )}
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
};
