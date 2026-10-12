import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
} from 'lucide-react';
import { TripSearchForm } from '../modules/trip/presentation/components/TripSearchForm';
import { TripSearchQueryVO } from '../modules/trip/domain/value-object/trip-search-query.vo';
import vietnamScenicPass from '../assets/travel/vietnam-scenic-pass.jpg';
import ninhBinhImg from '../assets/travel/ninh-binh-river.jpg';
import hoiAnImg from '../assets/travel/hoi-an-rain.jpg';
import phuQuocImg from '../assets/travel/phu-quoc-beach.jpg';

interface PopularDestination {
  title: string;
  subtitle: string;
  origin: string;
  destination: string;
  image: string;
  tag: string;
  priceEstimate: string;
}

const POPULAR_DESTINATIONS: PopularDestination[] = [
  {
    title: 'Ninh Bình',
    subtitle: 'Hà Nội ➔ Ninh Bình · Khoảng 1h30',
    origin: 'Hà Nội',
    destination: 'Ninh Bình',
    image: ninhBinhImg,
    tag: 'Di sản Tràng An',
    priceEstimate: 'Từ 150.000 đ',
  },
  {
    title: 'Hội An',
    subtitle: 'Đà Nẵng ➔ Hội An · Khoảng 45 phút',
    origin: 'Đà Nẵng',
    destination: 'Hội An',
    image: hoiAnImg,
    tag: 'Phố cổ ven sông',
    priceEstimate: 'Từ 120.000 đ',
  },
  {
    title: 'Phú Quốc',
    subtitle: 'Rạch Giá / Hà Tiên ➔ Phú Quốc',
    origin: 'Rạch Giá',
    destination: 'Hà Tiên',
    image: phuQuocImg,
    tag: 'Biển đảo Tây Nam',
    priceEstimate: 'Từ 280.000 đ',
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
      `/search?origin=${encodeURIComponent(criteria.origin)}&destination=${encodeURIComponent(
        criteria.destination
      )}&departureDate=${encodeURIComponent(criteria.departureDate)}`
    );
  };

  const handleDestinationClick = (origin: string, destination: string) => {
    navigate(
      `/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
        destination
      )}&departureDate=${encodeURIComponent(todayStr)}`
    );
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Panoramic Hero Section with Vietnam scenic pass (Clean, bright, natural lighting matching Image 1) */}
      <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-center">
        {/* Background photo clipped within its own wrapper */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={vietnamScenicPass}
            alt="Cung đường đèo Việt Nam"
            className="w-full h-full object-cover scale-102"
          />
          {/* Subtle, soft natural gradient so the bright sky & mountains breathe naturally */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/25 pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-20 w-full max-w-[1240px] mx-auto px-4 sm:px-6 pt-16 pb-28 sm:pb-32 flex flex-col items-center text-center">
          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-tight text-[#111827] leading-[1.16] max-w-3xl mx-auto mb-10 sm:mb-12">
            Chọn chuyến xe cho<br />
            <span className="font-editorial italic font-normal text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">hành trình của bạn</span>
          </h1>

          {/* Unconventional Panoramic Glass Capsule Search Form */}
          <div className="w-full max-w-5xl mx-auto relative z-30">
            <TripSearchForm onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* 2. Main Content Container */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-16">
        {/* Popular Destinations Tiles */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D20]">Điểm đến kết nối phổ biến</h2>
            </div>
            <p className="text-sm text-[#6B7280] max-w-md">
              Các chặng xe khách chất lượng cao được hành khách lựa chọn nhiều nhất trong mùa du lịch này.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {POPULAR_DESTINATIONS.map((dest, idx) => (
              <div
                key={idx}
                onClick={() => handleDestinationClick(dest.origin, dest.destination)}
                className="group cursor-pointer bg-white rounded-3xl border border-gray-200/90 overflow-hidden hover:border-[#FF385C] hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-52 w-full overflow-hidden bg-[#EDF2F5]">
                  <img
                    src={dest.image}
                    alt={dest.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="absolute top-3.5 left-3.5">
                    <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-semibold border border-white/20">
                      {dest.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-baseline justify-between text-white">
                    <span className="text-xs font-medium text-white/80">Giá vé tham khảo</span>
                    <span className="text-sm font-extrabold text-amber-300">{dest.priceEstimate}</span>
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-white flex-1">
                  <div>
                    <h3 className="font-extrabold text-lg text-[#1A1D20] group-hover:text-[#FF385C] transition-colors">
                      {dest.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-1 font-medium">{dest.subtitle}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-[#FF385C] group-hover:text-white flex items-center justify-center text-[#6B7280] group-hover:shadow-md transition-all duration-200 shrink-0">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
