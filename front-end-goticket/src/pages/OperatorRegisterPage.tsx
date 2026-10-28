import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  ShieldCheck,
  Upload,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { ApiError, httpClient } from "@/shared/infrastructure/http/HttpPort";
import { useAuth } from "@/modules/auth/presentation/context/AuthContext";
import {
  CustomerPageContainer,
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
} from "@/shared/presentation/components";
import { OperatorLogoInput } from "@/shared/presentation/components/operator/OperatorLogoInput";
import { OperatorLogo } from "@/shared/presentation/components/operator/OperatorLogo";
import { Link } from "react-router-dom";

type KycProfile = {
  logoUrl?: string;
  companyName: string;
  companyAddress: string;
  representativeName: string;
  representativeIdNumber: string;
  taxCode?: string;
  contactPhone?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
};

const empty = {
  companyName: "",
  companyAddress: "",
  representativeName: "",
  representativeIdNumber: "",
  taxCode: "",
  contactPhone: "",
};

export const OperatorRegisterPage: React.FC = () => {
  const { refreshSession } = useAuth();
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [form, setForm] = useState(empty);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const submitting = useRef(false);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await httpClient.get<KycProfile>(
        "/api/v1/me/ticket-vendor-profile"
      );
      setProfile(data);
      setForm({
        companyName: data.companyName || "",
        companyAddress: data.companyAddress || "",
        representativeName: data.representativeName || "",
        representativeIdNumber: data.representativeIdNumber || "",
        taxCode: data.taxCode || "",
        contactPhone: data.contactPhone || "",
      });
      if (data.approvalStatus === "APPROVED") await refreshSession();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) setProfile(null);
      else
        setLoadError(
          reason instanceof Error
            ? reason.message
            : "Không tải được hồ sơ nhà xe."
        );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!logoImage && !profile?.logoUrl) {
      setError("Vui lòng chọn ảnh logo nhà xe từ máy.");
      return;
    }
    if (!profile && (!frontImage || !backImage)) {
      setError(
        "Vui lòng tải đủ hai mặt giấy tờ (CCCD/Hộ chiếu) của người đại diện."
      );
      return;
    }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (logoImage) body.append("logoImage", logoImage);
    if (frontImage) body.append("frontImage", frontImage);
    if (backImage) body.append("backImage", backImage);
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      if (profile)
        await httpClient.put("/api/v1/me/ticket-vendor-application", body);
      else await httpClient.post("/api/v1/me/ticket-vendor-application", body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi hồ sơ.");
    } finally {
      submitting.current = false;
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

  if (loadError)
    return (
      <CustomerPageContainer className="space-y-4 py-12">
        <InlineAlert
          variant="error"
          title="Chưa tải được hồ sơ"
          message={loadError}
        />
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 rounded-xl border px-5"
        >
          Thử tải lại
        </button>
      </CustomerPageContainer>
    );

  if (
    (profile?.approvalStatus === "PENDING" && profile.logoUrl) ||
    profile?.approvalStatus === "APPROVED"
  ) {
    const approved = profile.approvalStatus === "APPROVED";
    return (
      <CustomerPageContainer className="max-w-3xl py-12">
        <SurfaceCard
          variant="glass-elevated"
          className="overflow-hidden rounded-[32px] p-8 text-center sm:p-10"
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
              approved
                ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                : "border border-amber-200 bg-amber-50 text-amber-600"
            }`}
          >
            {approved ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Clock className="h-8 w-8" />
            )}
          </div>

          <div className="mt-5 flex justify-center">
            <OperatorLogo
              src={profile.logoUrl}
              name={profile.companyName}
              className="h-20 w-20"
            />
          </div>
          <p className="text-coral mt-4 text-xs font-bold tracking-wider uppercase">
            Hồ sơ đối tác GoTicket
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-gray-900 sm:text-3xl">
            {approved
              ? "Nhà xe đã được phê duyệt chính thức"
              : "Hồ sơ đang được thẩm định"}
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            {profile.companyName} · {profile.companyAddress}
          </p>

          <div className="mt-6 rounded-3xl border border-white/80 bg-white/70 p-5 text-sm text-gray-700 shadow-2xs backdrop-blur-xs">
            {approved ? (
              <div className="space-y-4">
                <p>
                  Quyền nhà xe và kênh quản trị của bạn đã sẵn sàng hoạt động.
                  Bạn có thể truy cập ngay Cổng Nhà Xe để quản lý đội xe và tạo
                  chuyến mới.
                </p>
                <Link
                  to="/operator/dashboard"
                  className="glow-coral-sm inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#E61E4F]"
                >
                  Truy cập Kênh Nhà Xe <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p>
                Đội ngũ kiểm duyệt GoTicket đang thẩm định giấy tờ pháp lý của
                bạn. Kết quả sẽ được cập nhật tại trang này sau khi hoàn tất.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 min-h-11 px-4 text-sm font-semibold underline"
          >
            Cập nhật kết quả xét duyệt
          </button>
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

      {profile?.approvalStatus === "REJECTED" && (
        <InlineAlert
          variant="error"
          title="Hồ sơ cần bổ sung / chỉnh sửa"
          message={
            profile.rejectionReason ||
            "Vui lòng kiểm tra lại thông tin và giấy tờ đính kèm."
          }
        />
      )}

      {profile?.approvalStatus === "PENDING" && !profile.logoUrl && (
        <InlineAlert
          variant="warning"
          title="Cần bổ sung logo nhà xe"
          message="Hồ sơ cũ chưa có logo. Chọn ảnh từ máy và gửi lại để admin có thể phê duyệt; giấy tờ đã gửi được giữ nguyên."
        />
      )}
      <form onSubmit={submit} className="space-y-6">
        <SurfaceCard variant="glass" className="p-6 md:p-8">
          <div className="flex items-center gap-2.5 border-b border-gray-100/80 pb-4">
            <Building2 className="text-coral h-5 w-5" />
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Thông tin pháp nhân doanh nghiệp / Hộ kinh doanh
              </h2>
              <p className="text-xs font-medium text-gray-500">
                Nhập chính xác như trên giấy chứng nhận đăng ký kinh doanh.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <OperatorLogoInput
              file={logoImage}
              currentUrl={profile?.logoUrl}
              name={form.companyName}
              disabled={saving}
              onChange={(file) => {
                setLogoImage(file);
                setError("");
              }}
            />
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Tên công ty / Tên nhà xe <span className="text-coral">*</span>
              </label>
              <input
                required
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                maxLength={255}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Ví dụ: Công ty TNHH Vận Tải Hành Khách Phương Trang"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Địa chỉ trụ sở kinh doanh <span className="text-coral">*</span>
              </label>
              <input
                required
                value={form.companyAddress}
                onChange={(e) => update("companyAddress", e.target.value)}
                maxLength={255}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Địa chỉ đăng ký doanh nghiệp"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Họ tên người đại diện pháp luật{" "}
                <span className="text-coral">*</span>
              </label>
              <input
                required
                value={form.representativeName}
                onChange={(e) => update("representativeName", e.target.value)}
                maxLength={255}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Số CCCD / Hộ chiếu người đại diện{" "}
                <span className="text-coral">*</span>
              </label>
              <input
                required
                value={form.representativeIdNumber}
                onChange={(e) =>
                  update("representativeIdNumber", e.target.value)
                }
                maxLength={30}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Số căn cước 12 chữ số"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Mã số thuế doanh nghiệp
              </label>
              <input
                value={form.taxCode}
                onChange={(e) => update("taxCode", e.target.value)}
                maxLength={255}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Mã số thuế (nếu có)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                maxLength={255}
                className="focus:border-coral focus:ring-coral/20 w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-2xs transition outline-none focus:ring-2"
                placeholder="Số hotline hoặc số di động"
              />
            </div>
          </div>
        </SurfaceCard>

        {/* Giấy tờ xác thực */}
        <SurfaceCard variant="glass" className="p-6 md:p-8">
          <div className="flex items-center gap-2.5 border-b border-gray-100/80 pb-4">
            <FileCheck2 className="text-coral h-5 w-5" />
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Ảnh giấy tờ tùy thân của người đại diện
              </h2>
              <p className="text-xs font-medium text-gray-500">
                Ảnh chụp rõ nét 2 mặt CCCD / Hộ chiếu. Ảnh chỉ dùng cho mục đích
                đối soát pháp lý.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Mặt trước CCCD{" "}
                {!profile?.documentFrontUrl && (
                  <span className="text-coral">*</span>
                )}
              </label>
              <div className="hover:border-coral/50 rounded-3xl border-2 border-dashed border-gray-200 bg-white/60 p-5 text-center backdrop-blur-xs transition">
                <input
                  type="file"
                  id="front"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFrontImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="front"
                  className="block cursor-pointer space-y-1.5"
                >
                  <Upload className="mx-auto h-6 w-6 text-gray-400" />
                  <p className="text-xs font-bold text-gray-900">
                    {frontImage ? frontImage.name : "Chọn ảnh mặt trước"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    JPG, PNG hoặc WebP
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Mặt sau CCCD{" "}
                {!profile?.documentBackUrl && (
                  <span className="text-coral">*</span>
                )}
              </label>
              <div className="hover:border-coral/50 rounded-3xl border-2 border-dashed border-gray-200 bg-white/60 p-5 text-center backdrop-blur-xs transition">
                <input
                  type="file"
                  id="back"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setBackImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="back"
                  className="block cursor-pointer space-y-1.5"
                >
                  <Upload className="mx-auto h-6 w-6 text-gray-400" />
                  <p className="text-xs font-bold text-gray-900">
                    {backImage ? backImage.name : "Chọn ảnh mặt sau"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    JPG, PNG hoặc WebP
                  </p>
                </label>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {error && (
          <InlineAlert variant="error" title="Lỗi gửi hồ sơ" message={error} />
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="glow-coral-sm flex cursor-pointer items-center gap-2 rounded-full bg-[#FF385C] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#E61E4F] disabled:opacity-50"
          >
            {saving
              ? "Đang gửi..."
              : profile
                ? "Cập nhật lại hồ sơ"
                : "Gửi hồ sơ xét duyệt đối tác"}
          </button>
        </div>
      </form>
    </CustomerPageContainer>
  );
};
