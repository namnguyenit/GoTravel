"use client";

import Link from "next/link";
import GoTravelBrand from "./GoTravelBrand";
import { Globe2 } from "lucide-react";

const footerColumns = [
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: "/help-center" },
      { label: "Chính sách hủy", href: "/cancellation-policy" },
      { label: "Báo cáo vấn đề", href: "/report-issue" },
    ],
  },
  {
    title: "Đón tiếp khách",
    links: [
      { label: "Đăng dịch vụ trên GoTravel", href: "/host" },
      { label: "Tài nguyên cho chủ nhà", href: "/help-center" },
      { label: "Kênh doanh nghiệp", href: "/enterprise" },
      { label: "Đón tiếp khách có trách nhiệm", href: "/help-center" },
    ],
  },
  {
    title: "GoTravel",
    links: [
      { label: "Trang tin tức", href: "/help-center" },
      { label: "Tính năng mới", href: "/help-center" },
      { label: "Cơ hội nghề nghiệp", href: "/help-center" },
      { label: "Nhà đầu tư", href: "/help-center" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#DDDDDD] bg-[#F7F7F7] pb-20 text-[#222222] md:pb-0">
      <div className="mx-auto max-w-[1760px] px-6 py-12 md:px-10 xl:px-20">
        <Link href="/" className="mb-8 inline-flex rounded-lg" aria-label="Về trang chủ GoTravel"><GoTravelBrand /></Link>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {footerColumns.map((column) => (
            <section key={column.title}>
              <h2 className="text-sm font-semibold leading-[18px]">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-normal leading-[18px] text-[#717171] transition hover:text-[#222222] hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[#DDDDDD] pt-6 text-sm text-[#717171] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>© 2026 GoTravel, Inc.</span>
            <span>·</span>
            <Link href="/privacy" className="hover:text-[#222222] hover:underline">
              Quyền riêng tư
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[#222222] hover:underline">
              Điều khoản
            </Link>
            <span>·</span>
            <Link href="/sitemap" className="hover:text-[#222222] hover:underline">
              Sơ đồ trang web
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-semibold text-[#222222]">
            <button
              type="button"
              className="flex items-center gap-2 hover:underline"
            >
              <Globe2 className="h-4 w-4" />
              Tiếng Việt (VN)
            </button>
            <button type="button" className="hover:underline">
              ₫ VND
            </button>
            <div className="flex items-center gap-4" aria-label="Mạng xã hội">
              <Link href="#" aria-label="Facebook" className="hover:opacity-70">
                <span className="text-base font-bold">f</span>
              </Link>
              <Link href="#" aria-label="Twitter" className="hover:opacity-70">
                <span className="text-base font-bold">x</span>
              </Link>
              <Link href="#" aria-label="Instagram" className="hover:opacity-70">
                <span className="text-base font-bold">◎</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
