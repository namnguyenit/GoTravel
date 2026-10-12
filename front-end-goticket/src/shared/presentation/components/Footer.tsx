import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200/80 mt-auto no-print">
      {/* Main Footer Links */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3.5">
          <Link to="/" className="inline-flex items-center text-xl tracking-tight group">
            <span className="font-extrabold text-[#111827]">Go</span>
            <span className="font-bold text-[#111827]">Ticket</span>
            <span className="text-xl font-black text-[#FF385C] leading-none">.</span>
          </Link>
          <p className="text-xs text-gray-500 leading-relaxed">
            Nền tảng đặt vé xe khách liên tỉnh trực tuyến, tích hợp cùng hệ sinh thái GoTravel và cổng thanh toán GoPay.
          </p>
          <div className="text-xs text-gray-600 pt-1">
            Hotline hỗ trợ: <span className="font-bold text-[#FF385C]">1900 6868</span> <span className="text-gray-400">(8:00 - 21:00)</span>
          </div>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Tuyến đường phổ biến</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><Link to="/search?origin=Hà%20Nội&destination=Ninh%20Bình" className="hover:text-[#FF385C] transition-colors">Hà Nội → Ninh Bình</Link></li>
            <li><Link to="/search?origin=Hà%20Nội&destination=Sa%20Pa" className="hover:text-[#FF385C] transition-colors">Hà Nội → Sa Pa</Link></li>
            <li><Link to="/search?origin=TP.%20Hồ%20Chí%20Minh&destination=Đà%20Lạt" className="hover:text-[#FF385C] transition-colors">TP. Hồ Chí Minh → Đà Lạt</Link></li>
            <li><Link to="/search?origin=Đà%20Nẵng&destination=Hội%20An" className="hover:text-[#FF385C] transition-colors">Đà Nẵng → Hội An</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Dành cho Nhà xe</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><Link to="/become-operator" className="hover:text-[#FF385C] transition-colors">Đăng ký mở bán vé</Link></li>
            <li><Link to="/operator" className="hover:text-[#FF385C] transition-colors">Kênh quản lý nhà xe</Link></li>
            <li><Link to="/staff" className="hover:text-[#FF385C] transition-colors">Cổng nhân viên soát vé</Link></li>
            <li><a href="https://pay.trungcaodev.io.vn" target="_blank" rel="noreferrer" className="hover:text-[#FF385C] transition-colors">Cổng quyết toán GoPay</a></li>
          </ul>
        </div>

        <div>
          <h5 className="font-bold text-[#111827] text-sm mb-3.5">Chính sách & Hỗ trợ</h5>
          <ul className="space-y-2.5 text-xs text-gray-500">
            <li><span className="hover:text-[#FF385C] cursor-pointer transition-colors">Quy chế hoạt động sàn vận tải</span></li>
            <li><span className="hover:text-[#FF385C] cursor-pointer transition-colors">Chính sách bảo mật hành khách</span></li>
            <li><span className="hover:text-[#FF385C] cursor-pointer transition-colors">Quy trình xử lý khiếu nại</span></li>
            <li><span className="hover:text-[#FF385C] cursor-pointer transition-colors">Điều khoản đổi/trả vé</span></li>
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
