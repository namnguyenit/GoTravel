import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operatorService } from "../../composition";
import type { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  LoadingState,
  Button,
} from "@/shared/presentation/components";
import {
  PlusCircle,
  ShieldCheck,
  Bus,
  Calendar,
  MapPin,
  CalendarDays,
  ShoppingBag,
  Store,
  Users,
  BarChart3,
  Building,
  ArrowRight,
} from "lucide-react";

export const OperatorDashboardPage: React.FC = () => {
  const [status, setStatus] = useState<OperatorStatusEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    operatorService
      .getMyOperatorStatus()
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Đang tải tổng quan bảng điều hành nhà xe..." />
      </div>
    );
  }

  const operatorName = status?.getOperatorName() || "Nhà xe đối tác";
  const operatorId = status?.operator?.id || "N/A";

  const quickModules = [
    {
      title: "Đội xe & Sơ đồ ghế",
      description: "Quản lý danh sách phương tiện, phân hạng xe và cấu hình ma trận ghế ngồi.",
      to: "/operator/cars",
      icon: Bus,
      actionText: "Xem đội xe",
    },
    {
      title: "Tuyến đường & Điểm dừng",
      description: "Thiết lập hành trình xuất phát, điểm đến và các trạm trung chuyển đón/trả.",
      to: "/operator/routes",
      icon: MapPin,
      actionText: "Xem tuyến đường",
    },
    {
      title: "Lịch trình chuyến xe",
      description: "Lên lịch chạy, kiểm tra tình trạng mở bán vé và điều phối tài xế.",
      to: "/operator/trips",
      icon: CalendarDays,
      actionText: "Xem lịch trình",
    },
    {
      title: "Quản lý vé & Đơn hàng",
      description: "Theo dõi các đơn đặt chỗ, tra cứu mã vé QR và hỗ trợ đổi/hủy theo yêu cầu.",
      to: "/operator/orders",
      icon: ShoppingBag,
      actionText: "Xem đơn hàng",
    },
    {
      title: "Quầy bán vé & Ca tiền mặt",
      description: "Mở ca thu ngân, xuất vé trực tiếp tại bến xe và quản lý biên nhận tiền mặt.",
      to: "/operator/counter",
      icon: Store,
      actionText: "Vào quầy bán vé",
    },
    {
      title: "Báo cáo doanh thu & Payout",
      description: "Thống kê sản lượng ghế bán, đối soát doanh số và rút tiền hoa hồng đối tác.",
      to: "/operator/reports",
      icon: BarChart3,
      actionText: "Xem báo cáo",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={operatorName}
        description={`Mã đối tác: ${operatorId} · Kênh điều hành vận tải hành khách liên tỉnh`}
        eyebrow="Bảng điều khiển nhà xe"
        actions={
          <Button asChild className="bg-[#FF385C] hover:bg-[#E61E4F] text-white">
            <Link to="/operator/cars?action=new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Thêm Xe Khách
            </Link>
          </Button>
        }
      />

      {/* Grid Quick Navigation Modules */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {quickModules.map((item) => {
          const Icon = item.icon;
          return (
            <SurfaceCard key={item.to} className="p-6 flex flex-col justify-between hover:border-[var(--gt-coral)] transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--gt-muted)] opacity-60" />
                </div>
                <h3 className="mt-4 font-bold text-base text-[var(--gt-ink)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--gt-muted)] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--gt-border-soft)]">
                <Link
                  to={item.to}
                  className="text-xs font-bold text-[var(--gt-coral)] hover:underline inline-flex items-center gap-1"
                >
                  {item.actionText} →
                </Link>
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
};
