import { resolve } from "node:path";
import { atomic, jsonWrite, DATA, vnDate } from "./core.mjs";
export function report(p, checks, scenarios = []) {
  const dir = resolve(DATA, "runs", p.runId),
    now = new Date(),
    base = process.env.SEED_PUBLIC_BASE_URL || "https://gocar.nonnet123.io.vn";
  const counts = checks.counts;
  const refreshResults = scenarios.filter((s) => s.code.startsWith("REFRESH-"));
  scenarios = scenarios.filter((s) => !s.code.startsWith("REFRESH-"));
  const summary = {
    runId: p.runId,
    seedVersion: p.version,
    calendarDateVietnam: p.calendarDateVietnam,
    startedAtUtc: p.startedAtUtc,
    readyAt: now.toISOString(),
    timezone: p.timezone,
    status:
      checks.errors.length || scenarios.some((s) => s.state === "FAILED")
        ? "PARTIAL"
        : scenarios.some((s) => s.state === "PENDING")
          ? "READY_WITH_PENDING_SCENARIOS"
          : "READY",
    source: "DEMO_SNAPSHOTS_AND_RECORDED_API_ACTIONS",
    refreshResults,
    counts,
    live: checks.live,
    errors: checks.errors,
    openFindings: checks.openFindings,
    admin: { id: p.adminId, reused: true, created: false },
    scenarios,
  };
  jsonWrite(resolve(dir, "summary.json"), summary);
  const csv = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  atomic(
    resolve(dir, "accounts.csv"),
    [
      "group,index,username,password,email,status,operatorId,capabilities",
      ...p.credentials.map((a) => {
        const s = p.refs.staff.find((x) => x.id === a.id),
          v = p.refs.vendors.find((x) => x.owner === a.id);
        return [
          a.group,
          a.index,
          a.username,
          a.password,
          a.email,
          a.deleted
            ? "DELETED"
            : !a.active
              ? "LOCKED"
              : s && !s.active
                ? "ASSIGNMENT_INACTIVE"
                : "ACTIVE",
          s?.operator || v?.id || "",
          s
            ? ["SELL_CASH", "CHECK_IN", "MANAGE_TRIP", "CLOSE_SHIFT"]
                .filter(
                  (_, i) =>
                    [
                      s.canSellCash,
                      s.canCheckIn,
                      s.canManageTrip,
                      s.canCloseShift,
                    ][i],
                )
                .join("|")
            : "",
        ]
          .map(csv)
          .join(",");
      }),
    ].join("\n") + "\n",
  );
  const tripLines = p.refs.trips
    .filter(
      (tr) =>
        tr.kind !== "past" &&
        tr.status === "ON_SALE" &&
        new Date(tr.departure) > new Date(now.getTime() + 30 * 60000),
    )
    .slice(0, 20)
    .map(
      (tr) =>
        `| V${tr.vendor} | ${tr.route.origin} → ${tr.route.destination} | ${new Date(tr.departure).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} | [Mở chuyến](${base}/trips/${tr.id}) |`,
    );
  const links = {
    trips: p.refs.trips
      .filter((tr) => tr.live)
      .map((tr) => ({
        id: tr.id,
        operatorId: tr.operator,
        departureAt: tr.departure,
        url: `${base}/trips/${tr.id}`,
      })),
    orders: p.refs.orders
      .filter((o) =>
        ["PAYMENT_PENDING", "CASH_PENDING", "REFUND_PENDING"].includes(
          o.status,
        ),
      )
      .map((o) => ({
        id: o.id,
        userId: o.user,
        status: o.status,
        url: `${base}/account/orders/${o.id}`,
      })),
    operations: p.refs.operations,
  };
  jsonWrite(resolve(dir, "scenario-links.json"), links);
  const roleAccounts = ["user", "vendor", "staff"]
    .map((role) => {
      const all = p.credentials.filter((a) => a.group === role);
      return (
        `### ${role.toUpperCase()}\n\n` +
        all
          .slice(0, role === "user" ? 5 : role === "vendor" ? 12 : 8)
          .map(
            (a) =>
              `- \`${a.username}\` — ${a.fullName}${!a.active ? " (bị khóa)" : ""}`,
          )
          .join("\n")
      );
    })
    .join("\n\n");
  const livePending = checks.live?.pendingOrders?.find(
    (o) => o.status === "PAYMENT_PENDING",
  );
  const pending = livePending
    ? { ...livePending, user: livePending.user_id }
    : null;
  const liveCash = checks.live?.pendingOrders?.find(
    (o) => o.status === "CASH_PENDING",
  );
  const cash = liveCash
    ? {
        ...liveCash,
        vendor: p.refs.trips.find((t) => t.id === liveCash.transport_trip_id)
          ?.vendor,
        row: { transport_cashier_id: liveCash.transport_cashier_id },
      }
    : null;
  const op = p.refs.operations.find((o) => o.state === "REFUND_PENDING");
  const userFor = (id) =>
    p.credentials.find((a) => a.id === id)?.username || id;
  const checkin = checks.live?.checkInTickets || [];
  jsonWrite(resolve(dir, "check-in.json"), checkin);
  atomic(
    resolve(dir, "DEMO_GUIDE.md"),
    `# GoTicket — Phiên demo ${p.runId}\n\nNgày lập lịch: **${p.calendarDateVietnam}**, múi giờ Việt Nam. Ngày xuất báo cáo: **${vnDate(now)}**. Trạng thái: **${summary.status}**.\n\n## Đăng nhập\n\nURL: ${base}. Mật khẩu tài khoản demo mới: xem file accounts.csv cùng thư mục (không đưa lên Git). **Admin dùng tài khoản có sẵn trong Auth, không tạo thêm, không đổi mật khẩu.**\n\n${roleAccounts}\n\n## Bốn vai trò và dữ liệu\n\n- USER: U001–U020 sạch để đặt mới; U021–U080 online; U081–U110 tiền mặt; U111–U140 hoàn/hủy; U141–U160 lịch sử; U161–U180 hỗ trợ. U195–198 khóa; U199–200 đã đánh dấu xóa.\n- VENDOR: V01–V08 hoạt động, mỗi nhà xe 75 chuyến/4 staff; V09 đình chỉ; V10–V11 chờ duyệt; V12 từ chối. Mở /operator để quản lý.\n- STAFF: mỗi nhà xe có 4 người: bán tiền mặt, check-in, điều phối, tổng hợp. V08/S03 đã thu hồi assignment. Chi tiết quyền/nhà xe trong accounts.csv.\n- ADMIN: dùng /admin để duyệt KYC/nội dung, xem 2.000 đơn, 80 phiếu hỗ trợ, 40 đơn chờ hoàn toàn đơn, operation đổi/hủy và quyết toán.\n\n## Chuyến còn đủ giờ đặt khi xuất báo cáo\n\n| Nhà xe | Tuyến | Khởi hành giờ Việt Nam | Link |\n|---|---|---|---|\n${tripLines.join("\n")}\n\nNếu mở vào ngày khác, chạy phiên mới hoặc refresh-live theo README; không dời giờ lịch sử cũ.\n\n## Các điểm vào cụ thể\n\n- Đơn online đang giữ chỗ: ${pending ? `đăng nhập **${userFor(pending.user)}**, [mở đơn](${base}/account/orders/${pending.id})` : "Hiện không có hold còn hạn; chạy --refresh-live"}; TTL 15 phút từ lúc tạo, có thể đã hết hạn khi đọc.\n- Đơn quầy chưa thu tiền: ${cash ? `ID \`${cash.id}\`, nhà xe V${cash.vendor}, cashier \`${userFor(cash.row.transport_cashier_id)}\`` : "Xem summary"}.\n- Hoàn chênh lệch: ${op ? `operation \`${op.id}\`, [mở đơn](${base}/account/orders/${op.orderId})` : "Xem scenario-links.json"}.\n- Vé có thể check-in khi xuất báo cáo: **${checkin.length}**, xem check-in.json để lấy QR/token và nhân viên đúng nhà xe; cửa sổ sẽ thay đổi theo thời gian.\n- Có 12 ca mở và 28 ca lịch sử; 6 ca có chênh lệch cố ý. Chọn staff có SELL_CASH/CLOSE_SHIFT và ca của chính mình.\n- Các chuyến/đơn/phiếu thao tác thêm qua API được ghi riêng trong summary; có thể làm số lượng/trạng thái thay đổi so với snapshot.\n\n## Nguồn dữ liệu và giới hạn\n\nLịch sử lớn được ghi bằng snapshot mô phỏng nhất quán vào 6 database. Thanh toán và chứng từ ghi rõ DEMO/MOCK, không đại diện việc chuyển tiền ngân hàng. Email @example.test được SKIPPED, không báo đã gửi thật.\n\n${scenarios.length ? `Kịch bản: ${scenarios.filter((s) => s.state === "EXECUTED").length} đã chạy API, ${scenarios.filter((s) => s.state === "SNAPSHOT").length} snapshot, ${scenarios.filter((s) => s.state === "PENDING").length} đang chờ, ${scenarios.filter((s) => s.state === "FAILED").length} lỗi.` : "Các kịch bản API chưa chạy."}\n\nLỗi nhất quán: ${checks.errors.length}. Chi tiết số lượng và cảnh báo tại summary.json. Không xóa dữ liệu tài chính bất biến để chạy lại.\n`,
  );
  jsonWrite(resolve(DATA, "current.json"), {
    runId: p.runId,
    status: summary.status,
    guide: resolve(dir, "DEMO_GUIDE.md"),
  });
  console.log(`Report: ${resolve(dir, "DEMO_GUIDE.md")}`);
  return summary;
}
