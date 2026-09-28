"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import clsx from "clsx";
import {
  ConciergeBell,
  Heart,
  Home,
  LoaderCircle,
  LogIn,
  LogOutIcon,
  Menu,
  MessageSquareWarning,
  PartyPopper,
  Search,
  SettingsIcon,
  ShoppingCart,
  TicketCheck,
  UserCircle,
} from "lucide-react";
import { ReactNode, useEffect, useState, useTransition } from "react";
import { isTab } from "../hooks/useApp";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthService from "@/services/auth.service";
import { Footer, SearchInfoSection } from "@/shared/components";
import CartDrawer from "@/shared/components/CartDrawer";
import { useCart } from "@/shared/context/CartContext";
import { useAuthModal } from "@/shared/context/AuthModalContext";
import { useSafeContext } from "@/shared/hooks";
import { AppContext } from "@/features/app/providers/app.provider";
import { FilterService } from "@/services/filter";
import type { Filter } from "@/modules/filter";
import LanguageToggle from "@/shared/components/LanguageToggle";

const NAV_ITEMS = [
  { value: "place", label: "Nơi lưu trú", icon: Home },
  { value: "experience", label: "Trải nghiệm", icon: PartyPopper },
  { value: "service", label: "Dịch vụ", icon: ConciergeBell },
] as const;

const SEARCH_COLLAPSE_DONE = 80;

type SearchPanel = "place" | "date" | "type";

type CurrentUser = {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  userProfile?: {
    fullName?: string;
    avatarUrl?: string;
  };
} | null;

const getUserDisplayName = (user: CurrentUser) => {
  if (!user) return "Tài khoản GoTravel";

  return (
    user.userProfile?.fullName?.trim() ||
    user.fullName?.trim() ||
    [user.lastName, user.firstName].filter(Boolean).join(" ").trim() ||
    user.username?.trim() ||
    user.email?.trim() ||
    "Tài khoản GoTravel"
  );
};

const getUserInitial = (user: CurrentUser) =>
  getUserDisplayName(user).charAt(0).toUpperCase() || "U";

const getUserAvatarUrl = (user: CurrentUser) =>
  user?.userProfile?.avatarUrl || user?.avatarUrl || "https://github.com/shadcn.png";

function HeaderTabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: (typeof NAV_ITEMS)[number]["icon"];
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative flex h-12 items-center gap-2.5 rounded-full px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#222222]",
        active
          ? "bg-[#F7F7F7] text-[#222222] shadow-[inset_0_0_0_1px_#EBEBEB]"
          : "text-[#717171] hover:bg-[#F7F7F7] hover:text-[#222222]",
      )}
    >
      <span
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          active ? "bg-white text-[#222222] shadow-sm" : "bg-transparent text-[#717171] group-hover:bg-white group-hover:text-[#222222]",
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span>{label}</span>
      <span
        className={clsx(
          "absolute inset-x-5 -bottom-1 h-0.5 rounded-full bg-[#222222] transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}

function HeaderIconButton({
  children,
  label,
  onClick,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "relative flex h-11 w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-200 hover:bg-[#F7F7F7] hover:shadow-[inset_0_0_0_1px_#EBEBEB] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#222222]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default function MainLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchExpandedPath, setSearchExpandedPath] = useState<string | null>(null);
  const [initialSearchPanel, setInitialSearchPanel] = useState<SearchPanel>();
  const { tab, setTab, filter, setFilter } = useSafeContext(AppContext) ?? {
    tab: undefined,
    setTab: () => {},
    filter: undefined,
    setFilter: () => {},
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const pathName = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const { itemCount, setIsDrawerOpen } = useCart();
  const { openModal } = useAuthModal();

  const roles = currentUser ? AuthService.getUserRoles() : [];
  const isHost = roles.includes("HOST");
  const isEnterprise = roles.includes("ENTERPRISE");
  const isHomePage = pathName === "/";
  const activeCategoryContext = pathName.startsWith("/service")
    ? "service"
    : pathName.startsWith("/experience")
      ? "experience"
      : pathName.startsWith("/place")
        ? "place"
        : undefined;
  const isCategoryRootPage = NAV_ITEMS.some((item) => pathName === `/${item.value}`);
  const isExpandedFromCompact =
    isSearchExpanded && searchExpandedPath === pathName && !isHomePage;
  const showLargeSearch = isCategoryRootPage || isExpandedFromCompact;
  const showCompactSearch = !isHomePage && !isCategoryRootPage && !showLargeSearch;
  const showMobileSearchPanel = isSearchExpanded && searchExpandedPath === pathName;
  const elevatedHeader =
    showLargeSearch ||
    scrolled ||
    Boolean(tab) ||
    pathName.startsWith("/search") ||
    pathName.startsWith("/settings") ||
    pathName.startsWith("/checkout") ||
    pathName.startsWith("/payment") ||
    pathName.startsWith("/orders") ||
    pathName.startsWith("/disputes");

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    window.location.href = "/";
  };

  useEffect(() => {
    let isCancelled = false;

    const initUser = async () => {
      const cached = AuthService.getCurrentUser() as CurrentUser;
      const hasToken = AuthService.isAuthenticated();

      if (!hasToken) {
        if (cached && typeof window !== "undefined") {
          localStorage.removeItem("user_info");
        }
        if (!isCancelled) setCurrentUser(null);
        return;
      }

      if (cached && !isCancelled) {
        setCurrentUser(cached);
      }

      // Đồng bộ profile người dùng từ SSO token khi login từ trang Auth Portal hoặc GoCar
      const freshUser = await AuthService.fetchCurrentUser();
      if (!isCancelled && freshUser) {
        setCurrentUser(freshUser as CurrentUser);
      }
    };

    initUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const rolesChanged = await AuthService.refreshRoles();
        if (rolesChanged) {
          const refreshedUser = AuthService.getCurrentUser() as CurrentUser;
          setCurrentUser(refreshedUser ? { ...refreshedUser } : null);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser]);

  useEffect(() => {
    const segment = pathName.split("/")[1];
    if (isTab(segment)) {
      setTab(segment);
    } else {
      setTab(undefined);
    }
  }, [pathName, setTab]);

  useEffect(() => {
    if (!pathName.startsWith("/search")) return;

    const parsedFilter = FilterService.get(
      new URLSearchParams(searchParams.toString()),
    );
    if (parsedFilter) {
      setFilter(parsedFilter);
    }
  }, [pathName, searchParams, setFilter]);

  const goHome = () => {
    setIsSearchExpanded(false);
    setSearchExpandedPath(null);
    setInitialSearchPanel(undefined);
    startTransition(() => {
      setTab(undefined);
      setFilter(undefined);
      router.push("/");
    });
  };

  const goToTab = (value: (typeof NAV_ITEMS)[number]["value"]) => {
    setIsSearchExpanded(false);
    setSearchExpandedPath(null);
    setInitialSearchPanel(undefined);
    startTransition(() => {
      router.push(`/${value}`);
    });
  };

  const openLogin = () => {
    if (typeof window !== "undefined") {
      const isProd = window.location.hostname.includes("nonnet123.io.vn");
      const authOrigin = isProd ? "https://auth.nonnet123.io.vn" : "http://localhost:3335";
      window.location.href = `${authOrigin}?redirect_uri=${encodeURIComponent(window.location.href)}`;
      return;
    }
    openModal("login");
  };

  const openSearchPanel = (panel: SearchPanel) => {
    setIsDrawerOpen(false);
    setSearchExpandedPath(pathName);
    setInitialSearchPanel(panel);
    setIsSearchExpanded(true);
  };

  const openCartDrawer = () => {
    setIsSearchExpanded(false);
    setSearchExpandedPath(null);
    setInitialSearchPanel(undefined);
    setIsDrawerOpen(true);
  };

  const submitSearch = (value: Filter) => {
    setFilter(value);
    const params = FilterService.set(
      activeCategoryContext
        ? {
            ...value,
            type:
              activeCategoryContext === "experience"
                ? "exp"
                : activeCategoryContext,
          }
        : value,
    );
    router.push(`/search?${params.toString()}`);
    setIsSearchExpanded(false);
    setSearchExpandedPath(null);
  };

  return (
    <main
      className="no-scrollbar h-screen overflow-x-hidden overflow-y-auto bg-white text-[#222222]"
      onScroll={(event) => {
        const top = (event.target as HTMLDivElement).scrollTop;
        setScrolled(top >= SEARCH_COLLAPSE_DONE);
      }}
    >
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 overflow-visible border-b border-[#DDDDDD] bg-white transition-all duration-300",
          "h-[140px] lg:h-24",
          showLargeSearch && "lg:h-[196px]",
          elevatedHeader ? "shadow-sm" : "shadow-none",
        )}
      >
        {/* Row 1: Logo, Center (Nav items or Search Pill), Right Controls */}
        <div className="relative mx-auto flex h-[72px] max-w-[1760px] items-center justify-between px-4 sm:px-6 md:px-8 lg:h-24 lg:px-10 xl:px-20">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 rounded-full text-[#FF385C] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#222222]"
            aria-label="Về trang chủ GoTravel"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF385C] text-white sm:h-11 sm:w-11 lg:h-9 lg:w-9">
              <Home className="h-5 w-5" />
            </span>
            <span className="hidden text-xl font-bold tracking-normal sm:block lg:text-2xl">
              GoTravel
            </span>
          </button>

          {/* Center Column: service tabs in large mode, compact search after scroll */}
          {showLargeSearch ? (
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex"
              aria-label="Loại hình dịch vụ"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = tab === item.value;

                return (
                  <HeaderTabButton
                    key={item.value}
                    icon={item.icon}
                    label={item.label}
                    active={isActive}
                    onClick={() => goToTab(item.value)}
                  />
                );
              })}
            </nav>
          ) : showCompactSearch ? (
            <div
              role="search"
              aria-label="Bắt đầu tìm kiếm"
              className="absolute left-1/2 hidden h-12 w-[464px] max-w-[calc(100vw_-_220px)] -translate-x-1/2 items-center rounded-full bg-white text-sm text-[#222222] shadow-[0_0_0_1px_rgba(0,0,0,.02),0_8px_24px_rgba(0,0,0,.10)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,.04),0_10px_28px_rgba(0,0,0,.13)] lg:flex"
            >
              <span className="sr-only">Bắt đầu tìm kiếm</span>
              <button
                type="button"
                onClick={() => openSearchPanel("place")}
                className="flex h-full min-w-0 flex-1 items-center rounded-l-full px-5 text-left transition-colors hover:bg-[#f7f7f7]"
              >
                <span className="truncate font-semibold">Địa điểm bất kỳ</span>
              </button>
              <span className="h-6 w-px bg-[#dddddd]" />
              <button
                type="button"
                onClick={() => openSearchPanel("date")}
                className="flex h-full min-w-0 flex-1 items-center px-5 text-left transition-colors hover:bg-[#f7f7f7]"
              >
                <span className="truncate font-semibold">Thời gian bất kỳ</span>
              </button>
              <span className="h-6 w-px bg-[#dddddd]" />
              <button
                type="button"
                onClick={() => openSearchPanel("type")}
                className="flex h-full min-w-0 flex-1 items-center px-5 text-left transition-colors hover:bg-[#f7f7f7]"
              >
                <span className="truncate font-normal text-[#717171]">Loại hình</span>
              </button>
              <button
                type="button"
                onClick={() => openSearchPanel("place")}
                className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#ff385c] text-white transition-colors hover:bg-[#e61e4d]"
                aria-label="Mở tìm kiếm"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex"
              aria-label="Loại hình dịch vụ"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = tab === item.value;

                return (
                  <HeaderTabButton
                    key={item.value}
                    icon={item.icon}
                    label={item.label}
                    active={isActive}
                    onClick={() => goToTab(item.value)}
                  />
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 md:gap-3">
            {(isHost || isEnterprise) && currentUser && (
              <div className="hidden items-center gap-2 xl:flex">
                {isHost && (
                  <Link href="/host">
                    <span
                      className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-[#222222] transition-all hover:bg-[#F7F7F7] hover:shadow-[inset_0_0_0_1px_#EBEBEB]"
                    >
                      Kênh Chủ Nhà
                    </span>
                  </Link>
                )}
                {isEnterprise && (
                  <Link href="/enterprise">
                    <span
                      className="inline-flex h-11 items-center rounded-full px-4 text-sm font-bold text-[#222222] transition-all hover:bg-[#F7F7F7] hover:shadow-[inset_0_0_0_1px_#EBEBEB]"
                    >
                      Kênh Doanh Nghiệp
                    </span>
                  </Link>
                )}
              </div>
            )}

            <LanguageToggle className="hidden md:flex" />

            <HeaderIconButton label="Giỏ hàng" onClick={openCartDrawer}>
              <ShoppingCart className="h-5 w-5" strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF385C] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </HeaderIconButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 gap-2 rounded-full border-[#DDDDDD] bg-white py-1 pl-4 pr-1.5 text-[#222222] shadow-[0_2px_10px_rgba(0,0,0,.08)] transition-all hover:border-[#B0B0B0] hover:shadow-[0_4px_16px_rgba(0,0,0,.12)]"
                  aria-label="Mở menu tài khoản"
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                  {currentUser ? (
                    <Avatar className="h-9 w-9 border border-[#EBEBEB]">
                      <AvatarImage
                        src={getUserAvatarUrl(currentUser)}
                      />
                      <AvatarFallback className="bg-[#717171] text-xs font-bold text-white">
                        {getUserInitial(currentUser)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7] text-[#717171]">
                      <UserCircle className="h-6 w-6" strokeWidth={2} />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[320px] overflow-hidden rounded-[24px] border border-[#DDDDDD] bg-white p-0 text-[#222222] shadow-[0_18px_50px_rgba(0,0,0,.16)]"
              >
                {currentUser ? (
                  <>
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Avatar className="h-11 w-11 border border-[#DDDDDD]">
                        <AvatarImage
                          src={getUserAvatarUrl(currentUser)}
                        />
                        <AvatarFallback className="bg-[#222222] text-sm font-bold text-white">
                          {getUserInitial(currentUser)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#222222]">
                          {getUserDisplayName(currentUser)}
                        </div>
                        {currentUser.email && (
                          <div className="mt-0.5 max-w-[210px] truncate text-[11px] font-medium text-[#717171]">
                            {currentUser.email}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#717171]"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="mx-0 my-0 bg-[#EBEBEB]" />
                    <DropdownMenuItem
                      onClick={() => router.push("/orders/completed")}
                      className="mx-2 mt-2 cursor-pointer gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#222222] transition-colors focus:bg-[#F7F7F7]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7] text-[#222222]">
                        <TicketCheck className="h-4 w-4" />
                      </span>
                      Đơn hàng đã hoàn tất
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/disputes")}
                      className="mx-2 cursor-pointer gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#222222] transition-colors focus:bg-[#F7F7F7]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7] text-[#222222]">
                        <MessageSquareWarning className="h-4 w-4" />
                      </span>
                      Khiếu nại của tôi
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/settings")}
                      className="mx-2 cursor-pointer gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#222222] transition-colors focus:bg-[#F7F7F7]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7] text-[#222222]">
                        <SettingsIcon className="h-4 w-4" />
                      </span>
                      Cài đặt tài khoản
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-0 my-2 bg-[#EBEBEB]" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="mx-2 mb-2 cursor-pointer gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#E61E4F] transition-colors focus:bg-[#FFF1F4] focus:text-[#E61E4F]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF1F4] text-[#E61E4F]">
                        <LogOutIcon className="h-4 w-4" />
                      </span>
                      Đăng xuất
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={openLogin}
                      className="mx-2 mt-2 cursor-pointer gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#222222] focus:bg-[#F7F7F7]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7] text-[#222222]">
                        <LogIn className="h-4 w-4" />
                      </span>
                      Đăng nhập
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-0 my-2 bg-[#EBEBEB]" />
                    <DropdownMenuItem className="mx-2 cursor-pointer rounded-2xl px-3 py-3 text-sm font-semibold text-[#222222] focus:bg-[#F7F7F7]">
                      Đón tiếp khách
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/help-center")}
                      className="mx-2 mb-2 cursor-pointer rounded-2xl px-3 py-3 text-sm font-semibold text-[#222222] focus:bg-[#F7F7F7]"
                    >
                      Trung tâm trợ giúp
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mx-auto flex h-[68px] max-w-[1760px] items-center gap-3 px-4 pb-3 sm:px-6 md:px-8 lg:hidden">
          <button
            type="button"
            onClick={() => openSearchPanel("place")}
            className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-[#DDDDDD] bg-white px-4 text-left text-[#222222] shadow-[0_4px_18px_rgba(0,0,0,.10)] transition-all hover:border-[#B0B0B0]"
            aria-label="Mở tìm kiếm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF385C] text-white">
              <Search className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {filter?.place || "Bạn muốn đi đâu?"}
              </span>
              <span className="block truncate text-xs text-[#717171]">
                {filter?.date?.from ? "Đã chọn ngày" : "Địa điểm, ngày, loại hình"}
              </span>
            </span>
          </button>

          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => goToTab(item.value)}
                  aria-label={item.label}
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                    isActive
                      ? "bg-[#222222] text-white"
                      : "bg-[#F7F7F7] text-[#717171] hover:text-[#222222]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              );
            })}
          </div>
        </div>

        {showMobileSearchPanel && (
          <div className="fixed inset-x-0 top-[140px] z-[80] max-h-[calc(100vh-140px)] overflow-y-auto border-t border-[#EBEBEB] bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,.18)] sm:p-6 lg:hidden">
            <SearchInfoSection
              onClickSearch={submitSearch}
              filter={filter ?? {}}
              initialOpen={initialSearchPanel}
              categoryContext={activeCategoryContext}
              className="max-w-none border-[#DDDDDD]"
            />
          </div>
        )}

        {/* Row 2: Large Search Form */}
        {showLargeSearch && (
          <div className="mx-auto hidden w-full max-w-[1080px] px-6 pb-5 lg:block">
            <SearchInfoSection
              onClickSearch={submitSearch}
              filter={filter ?? {}}
              initialOpen={isExpandedFromCompact ? initialSearchPanel : undefined}
              categoryContext={activeCategoryContext}
              className="max-w-[1080px]"
            />
          </div>
        )}
      </header>

      <div className={clsx("h-[140px] transition-all duration-300 lg:h-24", showLargeSearch && "lg:h-[196px]")} />

      {isPending && (
        <div className="center size-full">
          <div className="row gap-2 text-[#FF385C]">
            <LoaderCircle className="animate-spin" />
            Loading...
          </div>
        </div>
      )}

      {!isPending && (
        <>
          <CartDrawer />
          {children}
          <Footer />
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-[#DDDDDD] bg-white md:hidden">
        <button
          type="button"
          onClick={goHome}
          className={clsx(
            "flex flex-col items-center gap-1 text-[10px] font-semibold",
            isHomePage ? "text-[#FF385C]" : "text-[#717171]",
          )}
        >
          <Search className="h-5 w-5" />
          Khám phá
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-[#717171]"
        >
          <Heart className="h-5 w-5" />
          Yêu thích
        </button>
        <button
          type="button"
          onClick={currentUser ? () => router.push("/settings") : openLogin}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-[#717171]"
        >
          <UserCircle className="h-5 w-5" />
          {currentUser ? "Tài khoản" : "Đăng nhập"}
        </button>
      </nav>
    </main>
  );
}
