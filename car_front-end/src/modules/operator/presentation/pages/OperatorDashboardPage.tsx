import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operatorService } from "../../composition";
import type { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  ShieldCheck,
  Car,
  Calendar,
  RefreshCw,
  MapPin,
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
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-600">
          Đang tải bảng điều khiển...
        </p>
      </div>
    );
  }

  const operatorName = status?.getOperatorName() || "Nhà xe";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">{operatorName}</h1>
            <Badge className="border-blue-400 bg-blue-500 text-white">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Đã xác thực
            </Badge>
          </div>
          <p className="mt-1 text-xs text-blue-100">
            Mã định danh Nhà xe: {status?.operator?.id || "N/A"}
          </p>
        </div>

        <Link to="/operator/cars?action=new">
          <Button className="gap-1.5 bg-white font-semibold text-blue-700 shadow hover:bg-blue-50">
            <PlusCircle className="h-4 w-4 text-blue-600" />
            <span>Thêm Xe Khách</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Quản lý Đội Xe
            </CardTitle>
            <Car className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">Danh sách xe</div>
            <CardDescription className="mt-1 text-xs">
              Theo dõi và thêm mới các xe khách đường dài
            </CardDescription>
            <Link to="/operator/cars" className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Xem đội xe &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Quản lý Tuyến đường
            </CardTitle>
            <MapPin className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              Mạng lưới tuyến
            </div>
            <CardDescription className="mt-1 text-xs">
              Thiết lập lộ trình điểm đi, điểm đến và các trạm đón/trả
            </CardDescription>
            <Link to="/operator/routes" className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Xem tuyến đường &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Thông tin Nhà Xe
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              Hồ sơ đối tác
            </div>
            <CardDescription className="mt-1 text-xs">
              Cập nhật thông tin liên hệ và địa chỉ nhà xe
            </CardDescription>
            <Link to="/profile" className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                Xem hồ sơ &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
