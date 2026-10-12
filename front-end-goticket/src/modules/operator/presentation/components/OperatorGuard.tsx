import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { operatorService } from "../../composition";
import type { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ShieldAlert,
  Clock,
  XCircle,
  ArrowLeft,
  PlusCircle,
} from "lucide-react";

import { useAuth } from "@/modules/auth/presentation/context/AuthContext";

export const OperatorGuard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin() ?? false;
  const [status, setStatus] = useState<OperatorStatusEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(!isAdmin);

  const checkStatus = async () => {
    if (isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await operatorService.getMyOperatorStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [isAdmin]);

  if (isAdmin) {
    return (
      <div className="mx-auto my-12 max-w-xl px-4">
        <Card className="border-red-100 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto inline-flex rounded-full bg-red-50 p-3 text-red-600">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Quản trị viên không có quyền làm Nhà Xe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-gray-600">
              Tài khoản của bạn là <strong>Quản trị viên (Admin)</strong>. Quản
              trị viên không được phép hoạt động với tư cách Nhà Xe hoặc truy
              cập Kênh Nhà Xe. Vui lòng chuyển sang Trang Quản Trị.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Trang chủ</span>
                </Button>
              </Link>
              <Link to="/admin/operators">
                <Button
                  size="sm"
                  className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Trang Quản Trị</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-600">
          Đang kiểm tra quyền truy cập Kênh Nhà Xe...
        </p>
      </div>
    );
  }

  if (status && status.canAccessOperatorPortal()) {
    return <Outlet />;
  }

  return (
    <div className="mx-auto my-12 max-w-xl px-4">
      <Card className="border-red-100 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          {status?.hasPendingApplication() ? (
            <div className="mx-auto inline-flex rounded-full bg-yellow-50 p-3 text-yellow-600">
              <Clock className="h-10 w-10" />
            </div>
          ) : status?.hasRejectedApplication() ? (
            <div className="mx-auto inline-flex rounded-full bg-red-50 p-3 text-red-600">
              <XCircle className="h-10 w-10" />
            </div>
          ) : (
            <div className="mx-auto inline-flex rounded-full bg-red-50 p-3 text-red-600">
              <ShieldAlert className="h-10 w-10" />
            </div>
          )}

          <CardTitle className="text-xl font-bold text-gray-900">
            {status?.hasPendingApplication()
              ? "Đơn đăng ký đang được xét duyệt"
              : status?.hasRejectedApplication()
                ? "Đơn đăng ký đã bị từ chối"
                : "Yêu cầu quyền truy cập Nhà Xe"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          {status?.hasPendingApplication() ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Đơn đăng ký nhà xe{" "}
                <strong className="text-gray-900">
                  {status.latestApplication?.name}
                </strong>{" "}
                của bạn đang được Ban quản trị xem xét.
              </p>
              <Badge
                variant="outline"
                className="border-yellow-300 bg-yellow-50 text-yellow-800"
              >
                Trạng thái: PENDING (Đang chờ)
              </Badge>
            </div>
          ) : status?.hasRejectedApplication() ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Đơn đăng ký nhà xe{" "}
                <strong className="text-gray-900">
                  {status.latestApplication?.name}
                </strong>{" "}
                của bạn chưa được thông qua.
              </p>
              {status.getRejectReason() && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <strong>Lý do từ chối:</strong> {status.getRejectReason()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Khu vực dành riêng cho Đối tác Nhà Xe. Bạn chưa đăng ký tài khoản
              Nhà Xe trên hệ thống GoStay.
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Trang chủ</span>
              </Button>
            </Link>

            {status?.hasRejectedApplication() ||
            (!status?.hasPendingApplication() && !status?.isOperator) ? (
              <Link to="/operator/register">
                <Button
                  size="sm"
                  className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Nộp đơn đăng ký Nhà Xe</span>
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
