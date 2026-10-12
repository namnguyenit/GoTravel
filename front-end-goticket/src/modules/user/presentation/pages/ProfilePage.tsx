import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userService } from "../../composition";
import type { UserProfileEntity } from "../../domain/entity/user-profile.entity";
import {
  CustomerPageContainer,
  SurfaceCard,
  PageHeader,
  StatusBadge,
  InlineAlert,
  LoadingState,
  ErrorState,
} from "@/shared/presentation/components";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  Check,
} from "lucide-react";
import { useAuth } from "@/modules/auth/presentation/context/AuthContext";

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileEntity | null>(null);
  const isUserAdmin = Boolean(profile?.isAdmin() || user?.isAdmin());
  const isUserOperator = Boolean(
    !isUserAdmin && (profile?.isOperator() || user?.isVendor())
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getProfile();
      setProfile(data);
      setFullName(data.fullName);
      setPhoneNumber(data.phoneNumber || "");
      setAddress(data.address || "");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể tải thông tin hồ sơ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await userService.updateProfile({
        fullName,
        phoneNumber,
        address,
      });
      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg("Cập nhật thông tin cá nhân thành công!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Cập nhật không thành công";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-12">
        <LoadingState message="Đang tải thông tin cá nhân..." />
      </CustomerPageContainer>
    );
  }

  if (error && !profile) {
    return (
      <CustomerPageContainer className="py-12">
        <ErrorState
          title="Không thể tải hồ sơ"
          message={error}
          actionLabel="Thử lại"
          onAction={() => void fetchProfile()}
        />
      </CustomerPageContainer>
    );
  }

  const initial = profile?.getDisplayName().charAt(0).toUpperCase() || "U";

  return (
    <CustomerPageContainer className="max-w-4xl space-y-8 py-8">
      {/* Profile Header Surface */}
      <SurfaceCard className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-3xl font-extrabold text-[var(--gt-coral)]">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.getDisplayName()}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initial
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[var(--gt-ink)]">
                  {profile?.getDisplayName()}
                </h1>
                <StatusBadge
                  status={isUserAdmin ? "ADMIN" : isUserOperator ? "OPERATOR" : "CUSTOMER"}
                  label={isUserAdmin ? "Quản trị viên" : isUserOperator ? "Đối tác Nhà xe" : "Thành viên"}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--gt-muted)]">
                @{profile?.username} · Email: {profile?.email || "Chưa cập nhật"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
              isEditing
                ? "border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] text-[var(--gt-text)] hover:bg-[var(--gt-border-soft)]"
                : "border border-[var(--gt-border)] bg-white text-[var(--gt-ink)] hover:border-[var(--gt-coral)] hover:text-[var(--gt-coral)]"
            }`}
          >
            {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa hồ sơ"}
          </button>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div className="mt-6">
            <InlineAlert variant="success" title="Thành công" message={successMsg} />
          </div>
        )}
        {error && (
          <div className="mt-6">
            <InlineAlert variant="error" title="Lỗi" message={error} />
          </div>
        )}

        {/* Info Grid or Edit Form */}
        <div className="mt-8 border-t border-[var(--gt-border-soft)] pt-6">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  Họ và tên <span className="text-[var(--gt-coral)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                    Địa chỉ liên hệ
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-2xl border border-[var(--gt-border)] bg-white px-5 py-2.5 text-xs font-bold text-[var(--gt-muted)] transition hover:bg-[var(--gt-surface-soft)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-coral flex items-center gap-2 px-6 py-2.5 text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  <User className="h-4 w-4 text-[var(--gt-coral)]" />
                  Họ và tên
                </span>
                <p className="mt-2 text-sm font-bold text-[var(--gt-ink)]">
                  {profile?.fullName || "Chưa cập nhật"}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  <Mail className="h-4 w-4 text-[var(--gt-coral)]" />
                  Email liên hệ
                </span>
                <p className="mt-2 text-sm font-bold text-[var(--gt-ink)]">
                  {profile?.email || "Chưa cập nhật"}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  <Phone className="h-4 w-4 text-[var(--gt-coral)]" />
                  Số điện thoại
                </span>
                <p className="mt-2 text-sm font-bold text-[var(--gt-ink)]">
                  {profile?.phoneNumber || "Chưa cập nhật"}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  <MapPin className="h-4 w-4 text-[var(--gt-coral)]" />
                  Địa chỉ
                </span>
                <p className="mt-2 text-sm font-bold text-[var(--gt-ink)]">
                  {profile?.address || "Chưa cập nhật"}
                </p>
              </div>
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* Role-specific Workspace Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--gt-muted)]">
          Không gian làm việc
        </h2>

        {isUserAdmin ? (
          <SurfaceCard className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--gt-ink)]">
                    Cổng Quản trị Hệ thống (Admin)
                  </h3>
                  <p className="text-xs text-[var(--gt-muted)]">
                    Quản lý và kiểm duyệt danh sách nhà xe đối tác, đơn hàng và các chính sách vận hành GoTicket.
                  </p>
                </div>
              </div>
              <Link
                to="/admin/operators"
                className="btn-coral flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 text-xs font-bold"
              >
                <UserCheck className="h-4 w-4" />
                Vào Quản trị Nhà xe
              </Link>
            </div>
          </SurfaceCard>
        ) : isUserOperator ? (
          <SurfaceCard className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--gt-ink)]">
                    Kênh Đối tác Nhà xe (Operator)
                  </h3>
                  <p className="text-xs text-[var(--gt-muted)]">
                    Quản lý đội xe, chuyến đi, điểm đón trả và hoạt động bán vé của nhà xe.
                  </p>
                </div>
              </div>
              <Link
                to="/operator/dashboard"
                className="btn-coral flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 text-xs font-bold"
              >
                <LayoutDashboard className="h-4 w-4" />
                Vào Kênh Nhà xe
              </Link>
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--gt-ink)]">
                    Đăng ký làm Đối tác Nhà xe GoTicket
                  </h3>
                  <p className="text-xs text-[var(--gt-muted)]">
                    Trở thành nhà xe đối tác uy tín để mở rộng quy mô kinh doanh chuyến xe liên tỉnh.
                  </p>
                </div>
              </div>
              <Link
                to="/operator/register"
                className="btn-coral flex items-center justify-center gap-2 whitespace-nowrap px-5 py-3 text-xs font-bold"
              >
                Đăng ký ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </SurfaceCard>
        )}
      </div>
    </CustomerPageContainer>
  );
};
