import Link from "next/link";
import { FileText, LockKeyhole, Map, ShieldCheck } from "lucide-react";

type LegalContentPageProps = {
  variant: "privacy" | "terms" | "sitemap";
};

const pages = {
  privacy: {
    eyebrow: "Quyền riêng tư",
    title: "Cách GoTravel bảo vệ dữ liệu của bạn",
    description:
      "GoTravel chỉ thu thập thông tin cần thiết để vận hành đặt dịch vụ, thanh toán, vé điện tử, hỗ trợ khách hàng và quản lý host/doanh nghiệp.",
    icon: LockKeyhole,
    sections: [
      {
        title: "Thông tin được sử dụng",
        items: [
          "Thông tin tài khoản như tên, email, số điện thoại và vai trò người dùng.",
          "Thông tin đặt dịch vụ như ngày sử dụng, dịch vụ đã chọn, tổng tiền và trạng thái thanh toán.",
          "Thông tin hồ sơ host/doanh nghiệp phục vụ duyệt tài khoản và payout.",
        ],
      },
      {
        title: "Mục đích xử lý",
        items: [
          "Xác thực tài khoản, phân quyền và bảo vệ phiên đăng nhập.",
          "Tạo đơn hàng, khóa tồn khả dụng, xác nhận thanh toán và phát hành vé check-in.",
          "Hỗ trợ khiếu nại, hoàn tiền, đối soát payout và kiểm tra vi phạm.",
        ],
      },
      {
        title: "Vị trí và gợi ý chuyến xe",
        items: [
          "Chỉ sử dụng vị trí thiết bị khi bạn cho phép trong trình duyệt; từ chối không ảnh hưởng việc tìm kiếm và đặt dịch vụ.",
          "Sau khi được cấp quyền, trình duyệt gửi tọa độ hiện tại tới BigDataCloud để xác định tỉnh/thành phố. Hệ thống dùng tỉnh để gợi ý chuyến xe GoTicket đến nơi bạn đang xem.",
          "Tọa độ không được lưu trong tài khoản hoặc database. Chỉ tên tỉnh/thành phố được nhớ trong tab tối đa 15 phút; dừng cập nhật vị trí khi tab bị ẩn. Bạn có thể thu hồi quyền tại cài đặt trang web của trình duyệt.",
        ],
      },
      {
        title: "Bảo mật và chia sẻ",
        items: [
          "Dữ liệu nhạy cảm chỉ được dùng cho nghiệp vụ cần thiết trong hệ thống.",
          "Thông tin liên hệ của khách được hiển thị cho host/doanh nghiệp liên quan đến đơn hàng.",
          "GoTravel không bán dữ liệu cá nhân cho bên thứ ba.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Điều khoản",
    title: "Điều khoản sử dụng GoTravel",
    description:
      "Khi sử dụng GoTravel, khách hàng, host và doanh nghiệp đồng ý tuân thủ các quy định về đặt dịch vụ, thanh toán, nội dung đăng tải và xử lý tranh chấp.",
    icon: FileText,
    sections: [
      {
        title: "Đối với khách hàng",
        items: [
          "Cung cấp thông tin liên hệ chính xác khi đặt dịch vụ.",
          "Kiểm tra kỹ dịch vụ, thời gian, số lượng và tổng tiền trước khi thanh toán.",
          "Sử dụng vé điện tử/QR đúng đơn hàng và không chuyển nhượng trái phép nếu dịch vụ không cho phép.",
        ],
      },
      {
        title: "Đối với host/doanh nghiệp",
        items: [
          "Đăng thông tin dịch vụ, hình ảnh, giá và khả dụng đúng thực tế.",
          "Cập nhật lịch nhận khách, sức chứa và xử lý đơn hàng đúng hạn.",
          "Cấu hình tài khoản nhận tiền chính xác để phục vụ payout.",
        ],
      },
      {
        title: "Xử lý vi phạm",
        items: [
          "GoTravel có thể ẩn/xóa nội dung sai lệch hoặc vi phạm.",
          "Admin có thể xử lý tranh chấp, force cancel và ghi nhận refund khi đủ điều kiện.",
          "Tài khoản vi phạm nghiêm trọng có thể bị hạn chế hoặc khóa quyền sử dụng.",
        ],
      },
    ],
  },
  sitemap: {
    eyebrow: "Sơ đồ trang web",
    title: "Đi nhanh tới các khu vực chính",
    description:
      "Danh sách các khu vực quan trọng trong GoTravel để khách hàng, host, doanh nghiệp và admin truy cập nhanh.",
    icon: Map,
    sections: [
      {
        title: "Khách hàng",
        items: [
          "Trang chủ: /",
          "Nơi lưu trú: /place",
          "Trải nghiệm: /experience",
          "Dịch vụ: /service",
          "Tìm kiếm: /search",
          "Đơn hàng đã hoàn tất: /orders/completed",
          "Khiếu nại của tôi: /disputes",
        ],
      },
      {
        title: "Host và doanh nghiệp",
        items: [
          "Kênh chủ nhà: /host",
          "Tài khoản nhận tiền host: /host/bank-account",
          "Kênh doanh nghiệp: /enterprise",
          "Tài khoản nhận tiền doanh nghiệp: /enterprise/bank-account",
        ],
      },
      {
        title: "Hỗ trợ và pháp lý",
        items: [
          "Trung tâm trợ giúp: /help-center",
          "Chính sách hủy: /cancellation-policy",
          "Báo cáo vấn đề: /report-issue",
          "Quyền riêng tư: /privacy",
          "Điều khoản: /terms",
          "Sơ đồ trang web: /sitemap",
        ],
      },
    ],
  },
} as const;

export default function LegalContentPage({ variant }: LegalContentPageProps) {
  const page = pages[variant];
  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-white px-4 pb-16 pt-10 text-[#222222]">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
            <Icon className="h-4 w-4" />
            {page.eyebrow}
          </div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">{page.description}</p>
        </section>

        <div className="mt-8 grid gap-5">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-6">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-zinc-200 bg-white p-6">
          <p className="text-sm leading-6 text-zinc-600">
            Nếu cần hỗ trợ thêm, truy cập{" "}
            <Link href="/help-center" className="font-bold text-zinc-900 underline">
              Trung tâm trợ giúp
            </Link>{" "}
            hoặc gửi vấn đề qua{" "}
            <Link href="/report-issue" className="font-bold text-zinc-900 underline">
              Báo cáo vấn đề
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
