import React from 'react';
import { Link } from 'react-router-dom';
import { BrandWordmark } from './brand/BrandWordmark';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200/80 mt-auto no-print">
      {/* Main Footer Links */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3.5">
          <BrandWordmark size="base" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Nền tảng đặt vé xe khách liên tỉnh trực tuyến, tích hợp cùng hệ sinh thái GoTravel và cổng thanh toán GoPay.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Tuyến đường phổ biến</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><Link to="/search?origin=Hà%20Nội&destination=Ninh%20Bình" className="hover:text-[var(--gt-brand)] transition-colors">Hà Nội → Ninh Bình</Link></li>
            <li><Link to="/search?origin=Hà%20Nội&destination=Sa%20Pa" className="hover:text-[var(--gt-brand)] transition-colors">Hà Nội → Sa Pa</Link></li>
            <li><Link to="/search?origin=TP.%20Hồ%20Chí%20Minh&destination=Đà%20Lạt" className="hover:text-[var(--gt-brand)] transition-colors">TP. Hồ Chí Minh → Đà Lạt</Link></li>
            <li><Link to="/search?origin=Đà%20Nẵng&destination=Hội%20An" className="hover:text-[var(--gt-brand)] transition-colors">Đà Nẵng → Hội An</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Dành cho Nhà xe</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><Link to="/become-operator" className="hover:text-[var(--gt-brand)] transition-colors">Đăng ký mở bán vé</Link></li>
            <li><Link to="/operator" className="hover:text-[var(--gt-brand)] transition-colors">Kênh quản lý nhà xe</Link></li>
            <li><Link to="/staff" className="hover:text-[var(--gt-brand)] transition-colors">Cổng nhân viên soát vé</Link></li>
            <li><Link to="/operator/reports" className="hover:text-[var(--gt-brand)] transition-colors">Báo cáo doanh thu & Quyết toán</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Hỗ trợ đặt vé</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><Link to="/account/tickets" className="hover:text-[var(--gt-brand)] transition-colors">Tra cứu vé của tôi</Link></li>
            <li><Link to="/account/disputes" className="hover:text-[var(--gt-brand)] transition-colors">Gửi yêu cầu hỗ trợ</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 py-4 bg-gray-50/70">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© 2026 GoTicket · Một dịch vụ thuộc hệ sinh thái GoTravel.</p>
          <p className="tabular-nums text-gray-400">Múi giờ vận hành: Asia/Ho_Chi_Minh (GMT+7)</p>
        </div>
      </div>
    </footer>
  );
};
