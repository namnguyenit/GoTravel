"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, 
  DollarSign, 
  Calendar, 
  PlusCircle, 
  ArrowLeft,
  TrendingUp,
  Building,
  Menu,
  SlidersHorizontal,
  CreditCard
} from "lucide-react";
import AuthService from "@/services/auth.service";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!await AuthService.getSession()) {
        router.push("/");
        return;
      }
      const roles = AuthService.getUserRoles();
      if (!roles.includes("ENTERPRISE")) {
        router.push("/");
        return;
      }
      setIsAuthorized(true);
    };
    checkAuth();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-app-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Đang xác thực quyền Doanh nghiệp...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: "Tổng quan", href: "/enterprise", icon: TrendingUp },
    { name: "Dịch vụ", href: "/enterprise/listings", icon: Home, match: "/enterprise/listings" },
    { name: "Khu tổ hợp", href: "/enterprise/complexes", icon: Building, match: "/enterprise/complexes" },
    { name: "Lịch nhận khách", href: "/enterprise/calendar", icon: Calendar, match: "/enterprise/calendar" },
    { name: "Khả dụng & sức chứa", href: "/enterprise/availability", icon: SlidersHorizontal, match: "/enterprise/availability" },
    { name: "Đơn hàng", href: "/enterprise/orders", icon: Calendar, match: "/enterprise/orders" },
    { name: "Thu nhập", href: "/enterprise/earnings", icon: DollarSign, match: "/enterprise/earnings" },
    { name: "Tài khoản nhận tiền", href: "/enterprise/bank-account", icon: CreditCard, match: "/enterprise/bank-account" },
    { name: "Đề xuất địa danh", href: "/enterprise/landmark-suggestions", icon: Building, match: "/enterprise/landmark-suggestions" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 shadow-sm transition-all sm:px-6">
        
        {/* Left: Logo */}
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <div className="p-2 bg-app-primary/10 rounded-xl border border-app-primary/30">
            <Building className="h-6 w-6 text-app-primary" />
          </div>
          <div className="hidden md:block">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide">KÊNH DOANH NGHIỆP</h2>
            <p className="text-[10px] text-gray-500 font-medium">GoTravel Enterprise Portal</p>
          </div>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden h-full min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto xl:flex">
          {navLinks.map((link) => {
            const isActive = link.match ? pathname.startsWith(link.match) : pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2 text-xs font-semibold transition-colors 2xl:px-3 2xl:text-sm ${
                  isActive 
                    ? "border-app-primary text-app-primary" 
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <Link href="/enterprise/listings/new" className="hidden sm:flex">
            <button className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-800 font-semibold text-xs rounded-full shadow-sm h-10 px-5 transition-all">
              <PlusCircle className="h-4 w-4 text-app-primary" />
              Thêm dịch vụ
            </button>
          </Link>

          <Link href="/">
            <button className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-10 px-4 rounded-full transition-all">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Về GoTravel</span>
            </button>
          </Link>
          
          <button 
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 xl:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-gray-200 bg-white px-4 py-4 xl:hidden">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
           {navLinks.map((link) => {
            const isActive = link.match ? pathname.startsWith(link.match) : pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <link.icon className={`h-5 w-5 ${isActive ? "text-app-primary" : ""}`} />
                {link.name}
              </Link>
            );
          })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full gap-8">
        {/* Dynamic page content */}
        {children}
      </main>
    </div>
  );
}
