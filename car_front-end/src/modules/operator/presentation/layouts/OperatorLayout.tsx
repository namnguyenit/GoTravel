import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Bus,
  LayoutDashboard,
  Car,
  ShieldCheck,
  User,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const OperatorLayout: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="flex h-16 items-center space-x-2 border-b border-gray-200 px-6">
          <div className="rounded-lg bg-blue-600 p-1.5 text-white">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">
              Operator Portal
            </span>
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-50 text-[10px] text-blue-700"
            >
              Kênh Nhà Xe
            </Badge>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <Link
            to="/operator/dashboard"
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/operator/dashboard") || isActive("/operator")
                ? "bg-blue-50 font-semibold text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Tổng quan (Dashboard)</span>
          </Link>

          <Link
            to="/operator/cars"
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/operator/cars") || isActive("/cars")
                ? "bg-blue-50 font-semibold text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Car className="h-4 w-4" />
            <span>Quản lý xe khách</span>
          </Link>

          <Link
            to="/operator/routes"
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/operator/routes")
                ? "bg-blue-50 font-semibold text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Quản lý tuyến đường</span>
          </Link>

          <Link
            to="/operator/trips"
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/operator/trips") || isActive("/trips")
                ? "bg-blue-50 font-semibold text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <CalendarClock className="h-4 w-4" />
            <span>Quản lý chuyến xe</span>
          </Link>

          <Link
            to="/profile"
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/profile")
                ? "bg-blue-50 font-semibold text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Hồ sơ nhà xe</span>
          </Link>
        </nav>

        <div className="border-t border-gray-100 p-4 text-center text-xs text-gray-400">
          GoStay Operator Center &copy; 2026
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center space-x-2 text-sm font-semibold text-gray-800">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Cổng Quản Lý Nhà Xe Đường Dài</span>
          </div>
          <Link
            to="/"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            &larr; Về trang khách hàng
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
