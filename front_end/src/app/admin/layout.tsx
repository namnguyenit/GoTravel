"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import AuthService from "@/services/auth.service";

interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

interface NavGroup {
  title: string;
  key: string;
  items: NavItem[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [authMessage, setAuthMessage] = useState("Authenticating...");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    partners: true,
    services: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!await AuthService.getSession()) {
        router.push("/");
        return;
      }
      const roles = AuthService.getUserRoles();
      if (!roles.includes("ADMIN")) {
        setAuthMessage("Bạn không có quyền truy cập trang quản trị. Đang chuyển về trang chủ...");
        router.push("/");
        return;
      }
      const user = AuthService.getCurrentUser();
      if (user?.username) setAdminName(user.username);
      setIsAuthorized(true);
    };
    checkAuth();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-semibold">{authMessage}</p>
        </div>
      </div>
    );
  }

  const navGroups: NavGroup[] = [
    {
      title: "PARTNER MANAGEMENT",
      key: "partners",
      items: [
        { href: "/admin/hosts", label: "Pending Hosts", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { href: "/admin/approved-hosts", label: "Approved Hosts", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { href: "/admin/enterprises", label: "Pending Enterprises", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
        { href: "/admin/approved-enterprises", label: "Approved Enterprises", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
      ],
    },
    {
      title: "SERVICES & INVENTORY",
      key: "services",
      items: [
        { href: "/admin/landmarks", label: "Landmarks", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { href: "/admin/listings", label: "Service Listings", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
        { href: "/admin/inventory", label: "Inventory", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        { href: "/admin/disputes", label: "Disputes & Refunds", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg> },
        { href: "/admin/commission", label: "Commission Config", icon: <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 5L5 19M7.5 8A1.5 1.5 0 107.5 5a1.5 1.5 0 000 3zm9 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg> },
      ],
    },
  ];

  const getActiveItemLabel = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/users")) return "User Management";
    if (pathname.startsWith("/admin/payouts")) return "Payout Hosts";
    
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname.startsWith(item.href)) {
          return item.label;
        }
      }
    }
    return "Admin Portal";
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] font-sans text-slate-900 selection:bg-sky-200 selection:text-slate-950">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Đóng menu admin"
          className="fixed inset-0 z-30 bg-sky-500/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      
      {/* Sidebar - CrewMate Style */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-[280px] max-w-[86vw] flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.04)] transition-transform duration-300 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        
        {/* Brand */}
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100/50 px-6 lg:h-[90px] lg:px-8">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-[15px] font-bold tracking-tighter text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]">
              G<span className="text-white/75">S</span>
            </div>
            <span className="font-semibold text-[20px] tracking-tight text-sky-600">
              GoTravel
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 lg:hidden"
            aria-label="Đóng menu admin"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-5 space-y-1 scrollbar-hide">
          
          <div className="px-3 pt-2 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Main Menu
          </div>

          <Link
            href="/admin"
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center px-4 py-2.5 mb-1.5 rounded-xl text-[13.5px] font-semibold transition-all ${
              pathname === "/admin"
                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 mr-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>

          <Link
            href="/admin/users"
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center px-4 py-2.5 mb-1.5 rounded-xl text-[13.5px] font-semibold transition-all ${
              pathname.startsWith("/admin/users")
                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 mr-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            User Management
          </Link>

          <Link
            href="/admin/payouts"
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center px-4 py-2.5 mb-6 rounded-xl text-[13.5px] font-semibold transition-all ${
              pathname.startsWith("/admin/payouts")
                ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 mr-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Payout Hosts
          </Link>

          {/* Groups */}
          {navGroups.map((group) => {
            const isOpen = openGroups[group.key];
            return (
              <div key={group.key} className="mb-4">
                <div 
                  className="px-3 pt-2 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center cursor-pointer"
                  onClick={() => toggleGroup(group.key)}
                >
                  {group.title}
                  <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
                
                {isOpen && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                            isActive
                              ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200 font-bold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {item.icon ? item.icon : <span className={`w-1.5 h-1.5 rounded-full mr-3.5 ${isActive ? 'bg-sky-500' : 'bg-transparent'}`}></span>}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer Card */}
        <div className="p-6 pb-8">
          <div className="bg-slate-50/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100/60">
            <div className="flex items-center gap-3">
              <Image
                unoptimized
                src="https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128260/admin-uploads/seeder/11d76ca308b43705f69344daeb140cf9fd4f7d9213160569487c932e345098a3.webp"
                alt="Avatar"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
              />
              <div>
                <p className="text-[13px] font-semibold text-slate-900 capitalize">{adminName || "Admin"}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Admin</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await AuthService.logout();
                router.push("/");
              }}
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[280px]">
        
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 bg-[#f8f9fa]/85 px-4 py-4 backdrop-blur-md sm:px-6 lg:h-[90px] lg:px-10 lg:py-0">
          
          {/* Breadcrumb / Title */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)] lg:hidden"
              aria-label="Mở menu admin"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="truncate text-[18px] font-semibold tracking-tight text-slate-900 sm:text-[20px]">
              {getActiveItemLabel()}
            </h1>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="min-w-0 flex-1 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
