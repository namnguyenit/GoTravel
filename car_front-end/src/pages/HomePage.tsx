import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { TripSearchForm } from "@/modules/trip/presentation/components/TripSearchForm";
import { TripSearchQueryVO } from "@/modules/trip/domain/value-object/trip-search-query.vo";

const POPULAR_ROUTES = [
  {
    origin: "Hồ Chí Minh",
    destination: "Đà Lạt",
    distance: "305 km",
    duration: "6 giờ 30 phút",
    price: "Từ 250.000 đ",
    image:
      "https://images.unsplash.com/photo-1549492423-400259a2e574?auto=format&fit=crop&w=600&q=80",
  },
  {
    origin: "Hà Nội",
    destination: "Đà Nẵng",
    distance: "765 km",
    duration: "14 giờ",
    price: "Từ 420.000 đ",
    image:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80",
  },
  {
    origin: "Hà Nội",
    destination: "Sapa",
    distance: "320 km",
    duration: "5 giờ 30 phút",
    price: "Từ 280.000 đ",
    image:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80",
  },
  {
    origin: "Hồ Chí Minh",
    destination: "Nha Trang",
    distance: "430 km",
    duration: "8 giờ 30 phút",
    price: "Từ 300.000 đ",
    image:
      "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=600&q=80",
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = TripSearchQueryVO.getTodayDateString();

  const handleSearch = (criteria: {
    origin: string;
    destination: string;
    departureDate: string;
  }) => {
    navigate(
      `/search?origin=${encodeURIComponent(
        criteria.origin
      )}&destination=${encodeURIComponent(
        criteria.destination
      )}&departureDate=${encodeURIComponent(criteria.departureDate)}`
    );
  };

  const handleQuickRouteSearch = (origin: string, destination: string) => {
    navigate(
      `/search?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(
        destination
      )}&departureDate=${encodeURIComponent(todayStr)}`
    );
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner with Search */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 text-white shadow-xl sm:p-12">
        <div className="max-w-3xl space-y-3">
          <span className="inline-block rounded-full border border-blue-400/30 bg-blue-500/30 px-3.5 py-1 text-xs font-semibold text-blue-100 backdrop-blur-sm">
            Hệ thống Đặt vé Xe khách Toàn quốc GoStay
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Đặt vé xe khách đường dài nhanh chóng & an toàn
          </h1>
          <p className="text-sm text-blue-100 sm:text-base">
            Tra cứu hơn 1,000+ chuyến xe mỗi ngày nối liền các tỉnh thành Việt
            Nam với giá vé niêm yết chính hãng và tình trạng ghế trống thời gian
            thực.
          </p>
        </div>

        {/* Form Search Component */}
        <div className="mt-8 text-gray-900">
          <TripSearchForm onSearch={handleSearch} />
        </div>
      </div>

      {/* Popular Routes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Tuyến đường phổ biến
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            Được tìm kiếm nhiều nhất
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route, idx) => (
            <div
              key={idx}
              onClick={() =>
                handleQuickRouteSearch(route.origin, route.destination)
              }
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                <img
                  src={route.image}
                  alt={`${route.origin} - ${route.destination}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute right-3 bottom-2.5 left-3 text-white">
                  <h4 className="truncate text-sm font-bold">
                    {route.origin} ➔ {route.destination}
                  </h4>
                  <span className="text-[11px] text-gray-200">
                    {route.duration}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                    Giá vé
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {route.price}
                  </span>
                </div>

                <span className="flex items-center text-xs font-semibold text-gray-500 group-hover:text-blue-600">
                  Tìm vé
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-start space-x-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Nhà xe uy tín</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tất cả đối tác nhà xe đều được xác minh giấy phép kinh doanh
              nghiêm ngặt.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-green-50 p-3 text-green-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Đúng giờ & Linh hoạt
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Cập nhật lịch trình thời gian thực, hủy vé và đổi vé dễ dàng trực
              tuyến.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Xe Giường Nằm & Limousine
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Đa dạng các loại xe hiện đại với đầy đủ tiện nghi wifi, cổng sạc,
              khăn lạnh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
