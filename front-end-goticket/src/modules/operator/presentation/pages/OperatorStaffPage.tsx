import React, { useEffect, useState } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  SurfaceCard,
  IdText,
  InlineAlert,
  LoadingState,
  EmptyState,
  Button,
  ConfirmDialog,
} from '@/shared/presentation/components';
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
} from 'lucide-react';

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
}

export const OperatorStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<OperatorStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New / edit staff form
  const [newUserId, setNewUserId] = useState<string>('');
  const [canCheckIn, setCanCheckIn] = useState<boolean>(true);
  const [canSellCash, setCanSellCash] = useState<boolean>(false);
  const [canManageTrip, setCanManageTrip] = useState<boolean>(false);
  const [canCloseShift, setCanCloseShift] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(true);

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
      const res = await httpClient.get<any>('/api/v1/operators/me/staff');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStaffList(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await httpClient.put<any>(`/api/v1/operators/me/staff/${newUserId.trim()}`, {
        canSellCash,
        canCheckIn,
        active,
        canManageTrip,
        canCloseShift,
      });

      setSubmitSuccess(`Đã lưu phân công quyền hạn cho nhân viên ${newUserId.trim()}`);
      setNewUserId('');
      setCanCheckIn(true);
      setCanSellCash(false);
      setCanManageTrip(false);
      setCanCloseShift(false);
      setActive(true);
      await fetchStaff();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Phân công nhân viên thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStaff = async () => {
    if (!staffToToggle) return;
    setToggling(true);
    try {
      await httpClient.put<any>(`/api/v1/operators/me/staff/${staffToToggle.userId}`, {
        canSellCash: staffToToggle.canSellCash,
        canCheckIn: staffToToggle.canCheckIn,
        active: !staffToToggle.active,
        canManageTrip: staffToToggle.canManageTrip ?? false,
        canCloseShift: staffToToggle.canCloseShift ?? false,
      });
      setStaffToToggle(null);
      await fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái nhân viên.');
    } finally {
      setToggling(false);
    }
  };

  const handleSelectToEdit = (staff: OperatorStaffMember) => {
    setNewUserId(staff.userId);
    setCanCheckIn(staff.canCheckIn);
    setCanSellCash(staff.canSellCash);
    setCanManageTrip(Boolean(staff.canManageTrip));
    setCanCloseShift(Boolean(staff.canCloseShift));
    setActive(staff.active);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Nhân viên & Phân quyền"
        eyebrow="Kênh Nhà Xe · Đội ngũ vận hành"
        description="Giao quyền soát vé, bán vé tại quầy, quản lý chuyến và chốt ca tiền mặt cho nhân sự thuộc nhà xe."
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
        <SurfaceCard className="lg:col-span-5 p-6 space-y-4">
          <h2 className="font-bold text-base text-[var(--gt-ink)] flex items-center gap-2 border-b border-[var(--gt-border)] pb-3">
            <UserPlus className="w-4 h-4 text-[var(--gt-coral)]" />
            Phân công / Cập nhật quyền
          </h2>

          <form onSubmit={handleAssignStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1.5">
                Mã tài khoản GoID (User ID) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Nhập UUID tài khoản GoID nhân viên..."
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--gt-border)] rounded-2xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] font-mono outline-none"
              />
              <p className="text-[11px] text-[var(--gt-muted)] mt-1">
                Nhân viên cần đăng ký tài khoản GoID trong hệ thống trước khi gán quyền.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-2">
                Các quyền tác nghiệp được cấp:
              </label>
              <div className="space-y-2.5">
                {/* canCheckIn */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-canvas)] cursor-pointer hover:border-[var(--gt-coral)] transition-colors">
                  <input
                    type="checkbox"
                    checked={canCheckIn}
                    onChange={(e) => setCanCheckIn(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--gt-border)] text-[var(--gt-coral)] focus:ring-[var(--gt-coral)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-[var(--gt-ink)]">
                      Soát vé lên xe (CHECK_IN)
                    </strong>
                    <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                      Được quét mã QR và soát vé đón hành khách lên xe
                    </span>
                  </div>
                </label>

                {/* canSellCash */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-canvas)] cursor-pointer hover:border-[var(--gt-coral)] transition-colors">
                  <input
                    type="checkbox"
                    checked={canSellCash}
                    onChange={(e) => setCanSellCash(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--gt-border)] text-[var(--gt-coral)] focus:ring-[var(--gt-coral)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-[var(--gt-ink)]">
                      Bán vé tại quầy (SELL_CASH)
                    </strong>
                    <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                      Được thu tiền mặt, mở ca bán vé và xuất vé tại bến
                    </span>
                  </div>
                </label>

                {/* canManageTrip */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-canvas)] cursor-pointer hover:border-[var(--gt-coral)] transition-colors">
                  <input
                    type="checkbox"
                    checked={canManageTrip}
                    onChange={(e) => setCanManageTrip(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--gt-border)] text-[var(--gt-coral)] focus:ring-[var(--gt-coral)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-[var(--gt-ink)]">
                      Điều hành chuyến (MANAGE_TRIP)
                    </strong>
                    <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                      Cập nhật giờ chạy, trạng thái khởi hành và danh sách chuyến
                    </span>
                  </div>
                </label>

                {/* canCloseShift */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-canvas)] cursor-pointer hover:border-[var(--gt-coral)] transition-colors">
                  <input
                    type="checkbox"
                    checked={canCloseShift}
                    onChange={(e) => setCanCloseShift(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--gt-border)] text-[var(--gt-coral)] focus:ring-[var(--gt-coral)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-[var(--gt-ink)]">
                      Chốt ca đối soát (CLOSE_SHIFT)
                    </strong>
                    <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                      Được kiểm đếm tiền mặt và chốt ca thu tiền đối soát
                    </span>
                  </div>
                </label>

                {/* active */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-canvas)] cursor-pointer hover:border-[var(--gt-coral)] transition-colors">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--gt-border)] text-[var(--gt-coral)] focus:ring-[var(--gt-coral)]"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-[var(--gt-ink)]">
                      Trạng thái hoạt động (Active)
                    </strong>
                    <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                      Tài khoản đang trong biên chế làm việc hợp lệ của nhà xe
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
              disabled={submitting || !newUserId.trim()}
              className="w-full py-2.5 rounded-2xl font-bold text-xs text-white bg-[#FF385C] hover:bg-[#E61E4F] shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu phân công nhân viên</span>
              )}
            </Button>
          </form>
        </SurfaceCard>

        {/* Staff List (7 cols) */}
        <SurfaceCard className="lg:col-span-7 p-6 space-y-4">
          <h2 className="font-bold text-base text-[var(--gt-ink)] border-b border-[var(--gt-border)] pb-3">
            Danh sách nhân viên ({staffList.length} người)
          </h2>

          {loading ? (
            <div className="py-12">
              <LoadingState message="Đang tải danh sách nhân viên..." />
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Users}
                title="Chưa có nhân viên nào"
                description="Hãy nhập mã GoID của nhân viên ở bảng bên trái để cấp quyền tác nghiệp."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {staffList.map((staff, idx) => (
                <div
                  key={staff.id || staff.userId || idx}
                  className="p-4 rounded-2xl border border-[var(--gt-border)] bg-white space-y-2.5 hover:border-[var(--gt-coral)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <IdText id={staff.userId} prefix="User" />
                      <span className="text-[11px] text-[var(--gt-muted)] block mt-0.5">
                        Tạo lúc: {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectToEdit(staff)}
                        className="text-[11px] font-semibold text-[var(--gt-coral)] hover:underline px-2 py-1"
                      >
                        Sửa quyền
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffToToggle(staff)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          staff.active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {staff.active ? 'Hoạt động' : 'Tạm khóa'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {staff.canCheckIn && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        CHECK_IN
                      </span>
                    )}
                    {staff.canSellCash && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        SELL_CASH
                      </span>
                    )}
                    {staff.canManageTrip && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        MANAGE_TRIP
                      </span>
                    )}
                    {staff.canCloseShift && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        CLOSE_SHIFT
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
        title={staffToToggle?.active ? 'Tạm khóa tài khoản nhân viên' : 'Kích hoạt lại tài khoản nhân viên'}
        description={`Bạn có chắc muốn ${
          staffToToggle?.active ? 'tạm khóa' : 'kích hoạt lại'
        } quyền hạn của nhân viên ${staffToToggle?.userId}?`}
        confirmLabel={staffToToggle?.active ? 'Xác nhận khóa' : 'Kích hoạt'}
        cancelLabel="Hủy"
        variant={staffToToggle?.active ? 'danger' : 'primary'}
        onConfirm={handleConfirmToggleStaff}
      />
    </div>
  );
};
