import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Button,
  StatusBadge,
  IdText,
} from "@/shared/presentation/components";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  RefreshCw,
  Copy,
  Check,
  Building2,
  AlertCircle,
} from "lucide-react";
import type { AdminUserDetailEntity } from "../../domain/entity/admin-user-detail.entity";
import { adminOperatorService } from "../../composition";

interface AdminUserDetailModalProps {
  userId: string | null;
  operatorName?: string;
  roleBadge?: string;
  open: boolean;
  onClose: () => void;
}

export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({
  userId,
  operatorName,
  roleBadge,
  open,
  onClose,
}) => {
  const [user, setUser] = useState<AdminUserDetailEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminOperatorService.getUserDetailById(userId);
        if (isMounted) {
          setUser(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể lấy thông tin chi tiết người dùng."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [open, userId]);

  const handleCopyId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDisplayRoles = (): string[] => {
    if (roleBadge) {
      return [roleBadge];
    }
    const rawRoles = user?.roles || [];
    const isHostOrOperator =
      Boolean(operatorName) ||
      rawRoles.some((r) => {
        const upper = r.toUpperCase();
        return upper.includes("OPERATOR") || upper.includes("HOST");
      });

    const displayRoles: string[] = [];

    if (isHostOrOperator) {
      displayRoles.push("Nhà xe");
    }

    rawRoles.forEach((r) => {
      const upper = r.toUpperCase();
      if (upper.includes("ADMIN")) {
        if (!displayRoles.includes("Quản trị viên")) {
          displayRoles.push("Quản trị viên");
        }
      } else if (upper.includes("OPERATOR") || upper.includes("HOST")) {
        if (!displayRoles.includes("Nhà xe")) {
          displayRoles.push("Nhà xe");
        }
      } else if (upper.includes("USER") || upper === "ROLE_USER") {
        if (!isHostOrOperator && !displayRoles.includes("Thành viên")) {
          displayRoles.push("Thành viên");
        }
      } else {
        if (!displayRoles.includes(r)) {
          displayRoles.push(r);
        }
      }
    });

    if (displayRoles.length === 0) {
      displayRoles.push(isHostOrOperator ? "Nhà xe" : "Thành viên");
    }

    return displayRoles;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
        <DialogHeader className="space-y-1">
          {operatorName && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-brand">
              <Building2 className="h-3.5 w-3.5" />
              <span>Nhà xe: {operatorName}</span>
            </div>
          )}
          <DialogTitle className="text-lg font-serif font-bold text-ink">
            Chi tiết Chủ sở hữu (User)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Thông tin định danh tài khoản người dùng sở hữu nhà xe
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center space-y-3 py-6">
            <RefreshCw className="h-6 w-6 animate-spin text-brand" />
            <p className="text-xs font-medium text-muted">
              Đang tải thông tin tài khoản #{userId}...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">
                Không thể tải thông tin
              </p>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="font-mono text-xs text-muted">
                User ID: {userId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="rounded p-1 text-muted hover:text-ink transition-colors"
                title="Sao chép ID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-4 py-2">
            {/* User Header with Avatar & Names */}
            <div className="flex items-center space-x-3.5 rounded-2xl border border-line bg-canvas p-3.5">
              <Avatar className="h-12 w-12 border border-line">
                <AvatarImage src={user.avatarUrl} alt={user.getDisplayName()} />
                <AvatarFallback className="bg-brand-soft font-bold text-brand text-sm">
                  {user.getInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-ink">
                  {user.fullName || user.username}
                </h4>
                <p className="truncate text-xs font-medium text-muted">
                  @{user.username || "Chưa đặt username"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    status={user.isActive ? "ACTIVE" : "SUSPENDED"}
                    label={user.isActive ? "Hoạt động" : "Bị khóa"}
                    size="sm"
                  />

                  {getDisplayRoles().map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand"
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Info Details List */}
            <div className="space-y-2.5 divide-y divide-line/60 rounded-2xl border border-line bg-surface p-4 text-xs">
              {/* User ID */}
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center font-medium text-muted">
                  <User className="mr-2 h-3.5 w-3.5 text-muted/80" />
                  Mã User ID
                </span>
                <div className="flex items-center space-x-1.5">
                  <IdText id={user.id} />
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="rounded p-1 text-muted hover:text-ink transition-colors"
                    title="Sao chép ID"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center font-medium text-muted">
                  <Mail className="mr-2 h-3.5 w-3.5 text-muted/80" />
                  Email
                </span>
                <a
                  href={`mailto:${user.email}`}
                  className="font-medium text-brand hover:underline"
                >
                  {user.email || "Chưa cập nhật"}
                </a>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center font-medium text-muted">
                  <Phone className="mr-2 h-3.5 w-3.5 text-muted/80" />
                  Số điện thoại
                </span>
                <span className="font-medium text-ink">
                  {user.phoneNumber || "Chưa cập nhật"}
                </span>
              </div>

              {/* Address */}
              <div className="flex items-start justify-between pt-2">
                <span className="flex items-center font-medium text-muted">
                  <MapPin className="mr-2 h-3.5 w-3.5 text-muted/80" />
                  Địa chỉ
                </span>
                <span className="max-w-[200px] text-right font-medium text-ink">
                  {user.address || "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
