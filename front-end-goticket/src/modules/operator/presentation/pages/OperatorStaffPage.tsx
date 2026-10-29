import React, { useEffect, useState } from "react";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import {
  PageHeader,
  SurfaceCard,
  IdText,
  InlineAlert,
  LoadingState,
  EmptyState,
  Button,
  ConfirmDialog,
} from "@/shared/presentation/components";
import {
  Users,
  UserPlus,
  Loader2,
  CheckCircle2,
  Shield,
  Ticket,
  Wallet,
  Calendar,
  Lock,
  Search,
  UserCheck,
  Mail,
  Phone,
  User,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

interface OperatorStaffMember {
  id: string;
  operatorId: string;
  userId: string;
  canSellCash: boolean;
  canCheckIn: boolean;
  canManageTrip?: boolean;
  canCloseShift?: boolean;
  active: boolean;
  tripIds?: string[];
  createdAt?: string;
  // Metadata nếu resolve được
  username?: string;
  email?: string;
  fullName?: string;
}

interface LookupStaffData {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
}

export const OperatorStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<OperatorStaffMember[]>([]);
  const [listKeyword, setListKeyword] = useState('');
  const [listActive, setListActive] = useState('');
  const visibleStaff = staffList.filter(staff => {
    const text = [staff.fullName, staff.username, staff.email, staff.userId].join(' ').toLocaleLowerCase('vi');
    return text.includes(listKeyword.trim().toLocaleLowerCase('vi')) && (!listActive || String(staff.active) === listActive);
  }).sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) || b.id.localeCompare(a.id));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search staff state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupStaffData | null>(null);

  // Selected staff to assign
  const [selectedStaff, setSelectedStaff] = useState<LookupStaffData | null>(null);
  const [newUserId, setNewUserId] = useState<string>("");

  // Permissions state
  const [canCheckIn, setCanCheckIn] = useState<boolean>(true);
  const [canSellCash, setCanSellCash] = useState<boolean>(false);
  const [canManageTrip, setCanManageTrip] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Toggle staff dialog
  const [staffToToggle, setStaffToToggle] = useState<OperatorStaffMember | null>(null);
  const [toggling, setToggling] = useState<boolean>(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await httpClient.get<any>("/api/v1/operators/me/staff");
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setStaffList(list);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách nhân viên."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Tìm kiếm nhân viên bằng Email, Username hoặc SĐT
  const handleSearchStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setLookupResult(null);

    try {
      const res = await httpClient.get<any>("/api/v1/operators/me/staff/lookup", {
        params: { query: searchQuery.trim() },
      });

      const user = res?.id ? res : res?.data?.id ? res.data : null;
      if (user && user.id) {
        setLookupResult(user);
        setSearchError(null);
      } else {
        setSearchError(
          res?.message || "Không tìm thấy tài khoản nhân viên nào khớp với từ khóa."
        );
      }
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "Tìm kiếm nhân viên thất bại. Vui lòng thử lại."
      );
    } finally {
      setSearching(false);
    }
  };

  // Chọn nhân viên tìm thấy để gán quyền
  const handlePickStaff = (staff: LookupStaffData) => {
    setSelectedStaff(staff);
    setNewUserId(staff.id);
    const existing = staffList.find(member => member.userId === staff.id);
    setCanCheckIn(existing?.canCheckIn ?? true);
    setCanSellCash(existing?.canSellCash ?? false);
    setCanManageTrip(existing?.canManageTrip ?? false);
    setLookupResult(null);
    setSearchQuery("");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Bỏ chọn nhân viên hiện tại để tìm người khác
  const handleResetSelectedStaff = () => {
    setCanCheckIn(true); setCanSellCash(false); setCanManageTrip(false);
    setSelectedStaff(null);
    setNewUserId("");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || toggling || loading) return;
    const targetId = selectedStaff?.id || newUserId.trim();
    if (!targetId) {
      setSubmitError("Vui lòng tìm kiếm và chọn một nhân viên trước khi lưu phân công.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await httpClient.put<any>(`/api/v1/operators/me/staff/${targetId}`, {
        canSellCash,
        canCheckIn,
        active: staffList.find(member => member.userId === targetId)?.active ?? true,
        canManageTrip,
      });

      const staffDisplayName =
        selectedStaff?.fullName ||
        selectedStaff?.email ||
        selectedStaff?.username ||
        targetId;

      const assignmentActive = staffList.find(member => member.userId === targetId)?.active ?? true;
      handleResetSelectedStaff();
      setSubmitSuccess(`Đã lưu quyền cho ${staffDisplayName}. ${assignmentActive ? 'Nhân viên tải lại trang để nhận quyền mới.' : 'Phân công vẫn đang ngừng; dùng nút Khôi phục ở danh sách để cho phép tác nghiệp.'}`);
      await fetchStaff();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Phân công nhân viên thất bại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStaff = async () => {
    if (!staffToToggle || toggling || submitting) return;
    setToggling(true);
    try {
      await httpClient.put<any>(
        `/api/v1/operators/me/staff/${staffToToggle.userId}`,
        {
          canSellCash: staffToToggle.canSellCash,
          canCheckIn: staffToToggle.canCheckIn,
          active: !staffToToggle.active,
          canManageTrip: staffToToggle.canManageTrip ?? false,
          canCloseShift: staffToToggle.canCloseShift ?? false,
        }
      );
      setStaffToToggle(null);
      await fetchStaff();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái nhân viên."
      );
    } finally {
      setToggling(false);
    }
  };

  const handleSelectToEdit = (staff: OperatorStaffMember) => {
    setSelectedStaff({
      id: staff.userId,
      username: staff.username || staff.userId.slice(0, 8),
      email: staff.email || "Đang trong biên chế nhà xe",
      fullName: staff.fullName || `Nhân viên #${staff.userId.slice(-6)}`,
    });
    setNewUserId(staff.userId);
    setCanCheckIn(staff.canCheckIn);
    setCanSellCash(staff.canSellCash);
    setCanManageTrip(Boolean(staff.canManageTrip));
    setSubmitSuccess(null);
    setSubmitError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Nhân viên & Phân quyền"
        eyebrow="Kênh Nhà Xe · Đội ngũ vận hành"
        description="Tìm kiếm nhân viên qua Email / Tên đăng nhập / Số điện thoại và giao quyền soát vé, bán vé, quản lý chuyến."
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Thông báo lỗi"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assign Form (5 cols) */}
        <SurfaceCard
          variant="glass"
          className="lg:col-span-5 p-6 space-y-5 rounded-[28px] border border-white/80 shadow-glass"
        >
          <div className="flex items-center gap-2 border-b border-gray-100/80 pb-3">
            <UserPlus className="w-4 h-4 text-[var(--gt-brand)]" />
            <h2 className="font-bold text-base text-gray-900">
              Phân công & Cấp quyền nhân viên
            </h2>
          </div>

          {/* BƯỚC 1: TÌM KIẾM NHÂN VIÊN QUA EMAIL / USERNAME / PHONE */}
          {!selectedStaff ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Tìm kiếm nhân viên trong hệ thống <span className="text-[var(--gt-brand)]">*</span>
              </label>

              <form onSubmit={handleSearchStaff} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập Email, Username hoặc SĐT..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white/95 border border-gray-200/90 rounded-full focus:border-[var(--gt-brand)] text-gray-900 outline-none shadow-2xs"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-full bg-[var(--gt-brand)] text-white hover:bg-[var(--gt-brand-hover)] text-xs font-bold px-4 h-9 shadow-2xs"
                >
                  {searching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Tìm"
                  )}
                </Button>
              </form>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Nhập Email hoặc Tên đăng nhập (GoID) của nhân viên để tìm và cấp quyền.
              </p>

              {/* Lỗi không tìm thấy */}
              {searchError && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Kết quả tìm kiếm (Staff Card) */}
              {lookupResult && (
                <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Tìm thấy tài khoản phù hợp
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      Hợp lệ
                    </span>
                  </div>

                  <div className="space-y-1">
                    <strong className="block text-sm font-bold text-gray-900">
                      {lookupResult.fullName || lookupResult.username}
                    </strong>
                    <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {lookupResult.email}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="w-3 h-3 text-gray-400" />
                        Username: @{lookupResult.username}
                      </span>
                      {lookupResult.phoneNumber && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {lookupResult.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handlePickStaff(lookupResult)}
                    className="w-full py-2 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Chọn nhân viên này để phân quyền
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* THẺ NHÂN VIÊN ĐANG ĐƯỢC CHỌN ĐỂ CẤP QUYỀN */
            <div className="p-4 rounded-2xl border-2 border-[var(--gt-brand)]/60 bg-[var(--gt-brand-soft)]/70 space-y-2 relative">
              <button
                type="button"
                onClick={handleResetSelectedStaff}
                className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/80 transition"
                title="Đổi nhân viên khác"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-bold text-[var(--gt-brand)] uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Đang thiết lập quyền cho:
              </span>

              <div className="space-y-0.5 pr-6">
                <strong className="block text-sm font-bold text-gray-900">
                  {selectedStaff.fullName || selectedStaff.username}
                </strong>
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-gray-400" />
                  {selectedStaff.email}
                </p>
                <p className="text-[11px] text-gray-500 font-mono">
                  ID: {selectedStaff.id}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetSelectedStaff}
                className="text-[11px] font-bold text-[var(--gt-brand)] hover:underline block pt-1"
              >
                ← Chọn hoặc tìm nhân viên khác
              </button>
            </div>
          )}

          {/* BƯỚC 2: MA TRẬN QUYỀN HẠN TÁC NGHIỆP */}
          <form onSubmit={handleAssignStaff} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                Các quyền tác nghiệp được cấp:
              </label>
              <div className="space-y-2">
                {/* canCheckIn */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md cursor-pointer hover:border-[var(--gt-brand)]/50 shadow-2xs transition-all">
                  <input
                    type="checkbox"
                    disabled={submitting || toggling}
                    checked={canCheckIn}
                    onChange={(e) => setCanCheckIn(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[var(--gt-brand)] focus:ring-[var(--gt-brand)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-gray-900">
                      Soát vé lên xe (CHECK_IN)
                    </strong>
                    <span className="text-[11px] text-gray-500 block">
                      Được quét mã QR và soát vé đón hành khách lên xe
                    </span>
                  </div>
                </label>

                {/* canSellCash */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md cursor-pointer hover:border-[var(--gt-brand)]/50 shadow-2xs transition-all">
                  <input
                    type="checkbox"
                    disabled={submitting || toggling}
                    checked={canSellCash}
                    onChange={(e) => setCanSellCash(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[var(--gt-brand)] focus:ring-[var(--gt-brand)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-gray-900">
                      Bán vé tại quầy (SELL_CASH)
                    </strong>
                    <span className="text-[11px] text-gray-500 block">
                      Chọn ghế, nhận tiền mặt và phát hành vé tại quầy; không cần mở ca
                    </span>
                  </div>
                </label>

                {/* canManageTrip */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md cursor-pointer hover:border-[var(--gt-brand)]/50 shadow-2xs transition-all">
                  <input
                    type="checkbox"
                    disabled={submitting || toggling}
                    checked={canManageTrip}
                    onChange={(e) => setCanManageTrip(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[var(--gt-brand)] focus:ring-[var(--gt-brand)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-gray-900">
                      Điều hành chuyến (MANAGE_TRIP)
                    </strong>
                    <span className="text-[11px] text-gray-500 block">
                      Được mở/ngừng bán, chỉnh giá và điều hành chuyến được phân công. Chỉ sửa giờ chạy khi chuyến còn nháp.
                    </span>
                  </div>
                </label>

              </div>
            </div>

            {submitError && (
              <InlineAlert
                variant="error"
                message={submitError}
                onClose={() => setSubmitError(null)}
              />
            )}

            {submitSuccess && (
              <InlineAlert
                variant="success"
                message={submitSuccess}
                onClose={() => setSubmitSuccess(null)}
              />
            )}

            <Button
              type="submit"
              disabled={loading || submitting || toggling || (!selectedStaff && !newUserId.trim())}
              className="w-full py-3 rounded-full font-bold text-xs text-white bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] shadow-md shadow-brand-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Đang lưu phân công...</span>
                </>
              ) : (
                <span>Lưu phân công nhân viên</span>
              )}
            </Button>
          </form>
        </SurfaceCard>

        {/* Staff List (7 cols) */}
        <SurfaceCard
          variant="glass"
          className="lg:col-span-7 p-6 space-y-4 rounded-[28px] border border-white/80 shadow-glass"
        >
          <div className="flex items-center justify-between border-b border-gray-100/80 pb-3">
            <h2 className="font-bold text-base text-gray-900">
              Danh sách nhân viên ({visibleStaff.length}/{staffList.length} người)
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">
              Đội ngũ trực thuộc nhà xe
            </span>
          </div>

          {loading ? (
            <div className="py-12">
              <LoadingState message="Đang tải danh sách nhân viên..." />
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Users}
                title="Chưa có nhân viên nào"
                description="Hãy tìm kiếm tài khoản nhân viên qua Email hoặc Username ở bên trái để cấp quyền tác nghiệp."
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 pb-4">
                <input aria-label="Tìm nhân viên đã phân công" value={listKeyword} maxLength={120} onChange={event => setListKeyword(event.target.value)} placeholder="Mã tài khoản, tên hoặc email nhân viên" className="min-h-11 min-w-40 flex-1 rounded-xl border p-3 text-base" />
                <select aria-label="Trạng thái nhân viên" value={listActive} onChange={event => setListActive(event.target.value)} className="min-h-11 rounded-xl border bg-white p-3 text-base"><option value="">Tất cả nhân viên</option><option value="true">Đang hoạt động</option><option value="false">Đã tạm khóa</option></select>
                <p className="w-full text-sm text-muted">Nhân viên mới được phân công hiển thị trước.</p>
              </div>
              {!visibleStaff.length && <p className="p-4 text-sm text-muted">Không có nhân viên phù hợp với bộ lọc.</p>}
              {visibleStaff.map((staff, idx) => (
                <div
                  key={staff.id || staff.userId || idx}
                  className="p-4 rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md space-y-2.5 shadow-2xs hover:border-[var(--gt-brand)]/50 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <IdText id={staff.userId} prefix="Nhân viên" />
                      <span className="text-[11px] text-gray-400 block mt-0.5 font-medium">
                        Ngày gán: {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting || toggling}
                        aria-label={`Sửa quyền ${staff.fullName || staff.username || staff.userId}`}
                        onClick={() => handleSelectToEdit(staff)}
                        className="text-[11px] font-bold text-[var(--gt-brand)] hover:underline px-2.5 py-1 cursor-pointer"
                      >
                        Sửa quyền
                      </button>
                      <span className={`text-xs font-semibold ${staff.active ? 'text-emerald-800' : 'text-gray-600'}`}>{staff.active ? 'Đang phân công' : 'Đã ngừng'}</span>
                      <button
                        type="button"
                        disabled={submitting || toggling}
                        aria-label={`${staff.active ? 'Ngừng phân công' : 'Khôi phục phân công'} ${staff.fullName || staff.username || staff.userId}`}
                        onClick={() => setStaffToToggle(staff)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
                          staff.active
                            ? "bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-rose-50/90 text-rose-700 hover:bg-rose-100 border border-rose-200"
                        }`}
                      >
                        {staff.active ? "Ngừng phân công" : "Khôi phục"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {staff.canCheckIn && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
                        CHECK_IN
                      </span>
                    )}
                    {staff.canSellCash && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
                        SELL_CASH
                      </span>
                    )}
                    {staff.canManageTrip && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 shadow-2xs">
                        MANAGE_TRIP
                      </span>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* Confirm toggle active dialog */}
      <ConfirmDialog
        open={Boolean(staffToToggle)}
        onOpenChange={(open) => !open && setStaffToToggle(null)}
        title={staffToToggle?.active ? "Ngừng phân công tại nhà xe?" : "Khôi phục phân công tại nhà xe?"}
        description={staffToToggle?.active ? "Nhân viên sẽ không thể soát vé, bán vé hoặc điều hành tại nhà xe này. Lịch sử bán vé được giữ nguyên." : "Nhân viên được tác nghiệp lại tại nhà xe theo các quyền đã lưu."}
        confirmLabel={staffToToggle?.active ? "Ngừng phân công" : "Khôi phục"}
        cancelLabel="Hủy"
        variant={staffToToggle?.active ? "danger" : "primary"}
        loading={toggling}
        onConfirm={handleConfirmToggleStaff}
      />
    </div>
  );
};
