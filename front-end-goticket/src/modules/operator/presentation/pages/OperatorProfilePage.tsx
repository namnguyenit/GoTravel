import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  Save,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { OperatorLogoInput } from "@/shared/presentation/components/operator/OperatorLogoInput";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  Button,
} from "@/shared/presentation/components";

type OperatorProfile = {
  id: string;
  name: string;
  displayName?: string;
  logoUrl?: string;
  contactPhone?: string;
  contactAddress?: string;
  description?: string;
  status: "ACTIVE" | "SUSPENDED";
};

export const OperatorProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    logoUrl: "",
    contactPhone: "",
    contactAddress: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const submitting = useRef(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await httpClient.get<OperatorProfile>(
        "/api/v1/operators/me/profile"
      );
      setProfile(data);
      setForm({
        displayName: data.displayName || data.name || "",
        logoUrl: data.logoUrl || "",
        contactPhone: data.contactPhone || "",
        contactAddress: data.contactAddress || "",
        description: data.description || "",
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải hồ sơ nhà xe."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    if (key === "logoUrl") setLogoPreviewError(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!logoImage && !form.logoUrl.trim()) {
      setError("Vui lòng chọn ảnh logo nhà xe trước khi lưu.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let logoUrl = form.logoUrl.trim();
      if (logoImage) {
        const body = new FormData();
        body.append("file", logoImage);
        body.append("folder", "operator-logos");
        const uploaded = await httpClient.post<{ url: string }>(
          "/api/v1/media/upload",
          body
        );
        if (!uploaded.url)
          throw new Error("Dịch vụ ảnh chưa trả về logo. Vui lòng thử lại.");
        logoUrl = uploaded.url;
        setForm((current) => ({ ...current, logoUrl }));
        setLogoImage(null);
        setLogoPreviewError(false);
      }
      const data = await httpClient.patch<OperatorProfile>(
        "/api/v1/operators/me/profile",
        {
          displayName: form.displayName.trim(),
          logoUrl,
          contactPhone: form.contactPhone.trim() || null,
          contactAddress: form.contactAddress.trim() || null,
          description: form.description.trim() || null,
        }
      );
      setProfile(data);
      setMessage("Đã lưu thành công thông tin hồ sơ hiển thị của nhà xe.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu hồ sơ nhà xe."
      );
    } finally {
      submitting.current = false;
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
      <SurfaceCard
        variant="glass"
        className="shadow-glass rounded-[28px] border border-white/80 p-6"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/90 bg-white/80 shadow-2xs">
              {form.logoUrl && !logoPreviewError ? (
                <img
                  src={form.logoUrl}
                  alt={form.displayName || "Logo"}
                  className="h-full w-full object-contain p-1"
                  onError={() => setLogoPreviewError(true)}
                />
              ) : (
                <Building2 className="h-7 w-7 text-[var(--gt-brand)]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {form.displayName || profile?.name || "Nhà xe đối tác"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>
                  Pháp nhân KYC: <strong>{profile?.name}</strong>
                </span>
                <span>·</span>
                <span>
                  Mã:{" "}
                  <strong className="font-mono">
                    {profile?.id?.slice(0, 8)}...
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-2xs ${
                profile?.status === "ACTIVE"
                  ? "border border-emerald-200 bg-emerald-50/90 text-emerald-800"
                  : "border border-rose-200 bg-rose-50/90 text-rose-800"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile?.status === "ACTIVE" ? "Đang hoạt động" : "Đã đình chỉ"}
            </span>
          </div>
        </div>
      </SurfaceCard>

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi hồ sơ"
          message={error}
          onClose={() => setError("")}
        />
      )}

      {message && (
        <InlineAlert
          variant="success"
          title="Thông báo"
          message={message}
          onClose={() => setMessage("")}
        />
      )}

      {/* Profile Form */}
      <SurfaceCard
        variant="glass"
        className="shadow-glass rounded-[28px] border border-white/80 p-6"
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Tên thương hiệu hiển thị{" "}
                <span className="text-rose-600">*</span>
              </label>
              <input
                required
                minLength={3}
                maxLength={120}
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                placeholder="VD: Xe Khách Phương Trang"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Số điện thoại liên hệ
              </label>
              <input
                maxLength={30}
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                placeholder="VD: 1900 6067"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Địa chỉ văn phòng / bến liên hệ
              </label>
              <input
                maxLength={255}
                value={form.contactAddress}
                onChange={(e) => update("contactAddress", e.target.value)}
                placeholder="VD: 272 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
              />
            </div>

            <div className="md:col-span-2">
              <OperatorLogoInput
                file={logoImage}
                currentUrl={form.logoUrl}
                name={form.displayName || profile?.name || "Nhà xe"}
                disabled={saving}
                onChange={(file) => {
                  setLogoImage(file);
                  setError("");
                  setMessage("");
                }}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Giới thiệu dịch vụ & chính sách nhà xe
              </label>
              <textarea
                rows={5}
                maxLength={2000}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Giới thiệu về kinh nghiệm phục vụ, các tuyến thế mạnh, tiêu chuẩn dòng xe..."
                className="w-full rounded-[24px] border border-gray-200/80 bg-white/90 p-4 text-xs font-medium text-gray-900 shadow-2xs outline-none focus:border-[var(--gt-brand)]"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100/80 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="shadow-brand-sm cursor-pointer rounded-full bg-[var(--gt-brand)] px-7 py-2.5 font-bold text-white shadow-md hover:bg-[var(--gt-brand-hover)]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
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
