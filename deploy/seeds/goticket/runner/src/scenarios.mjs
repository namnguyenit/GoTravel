import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { DATA, jsonWrite, id, sqlTime, plus, vnDate, stamp } from "./core.mjs";
import { Api, Pending } from "./http.mjs";
const labels = {
  U: [
    "Đăng nhập và cập nhật hồ sơ",
    "Tìm chuyến theo ngày",
    "Sơ đồ ghế và báo giá",
    "Đặt online một vé",
    "Đặt nhóm",
    "Thanh toán MOCK",
    "Hủy chưa trả",
    "Hết hạn giữ chỗ",
    "Đổi ngang giá",
    "Đổi đắt hơn",
    "Đổi rẻ hơn",
    "Sửa thông tin/gửi lại vé",
    "Hủy từng vé",
    "Gửi hỗ trợ",
  ],
  V: [
    "Xe và mẫu ghế",
    "Sửa xe",
    "Điểm đón trả",
    "Tuyến/thứ tự trạm",
    "Archive tuyến lịch sử",
    "Tạo chuyến",
    "Công bố Catalog/Inventory",
    "Dừng/mở bán",
    "Giá/chặn ghế",
    "Phân công nhân viên",
    "Đơn/báo cáo/ca",
    "Yêu cầu rút tiền",
  ],
  S: [
    "Phạm vi chuyến",
    "Mở ca",
    "CASH một vé",
    "CASH nhóm",
    "Thu tiền/phát vé",
    "Hoàn tiền mặt",
    "Thu bù tiền mặt",
    "Đóng ca khớp",
    "Đóng ca lệch",
    "Check-in",
    "QR cũ/quét lặp",
    "Danh sách khách/no-show",
  ],
  A: [
    "Tổng quan",
    "Duyệt KYC",
    "Từ chối KYC",
    "Duyệt nội dung",
    "Đình chỉ/kích hoạt",
    "Tra cứu đơn",
    "Xử lý hỗ trợ",
    "PAID_REVIEW/hoàn đơn",
    "Hoàn operation",
    "Hủy chuyến",
    "Chứng từ payout/hoa hồng",
    "Đối soát/outbox",
  ],
};
const flat = (d) => {
  const value = d?.order ?? d;
  return value
    ? { ...value, id: value.id || value.paymentId || value.orderId }
    : value;
};
export async function scenarios(dbs, p, manifest, dir, skip = false) {
  const api = new Api(p),
    statePath = resolve(dir, "api-state.json");
  const state = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : { results: {}, artifacts: {} };
  const save = () => jsonWrite(statePath, state),
    art = state.artifacts;
  const account = (id) => {
    const a = p.credentials.find((a) => a.id === id);
    if (!a) throw Error("Không được thao tác account ngoài seed");
    return a;
  };
  const v = account(p.refs.vendors[0].owner),
    u = p.credentials.find((a) => a.group === "user" && a.index === 21),
    fullStaff = account(
      p.refs.staff.find((s) => s.vendor === 1 && s.slot === 4).id,
    );
  const trip = () =>
    p.refs.trips.find(
      (tr) =>
        tr.status === "ON_SALE" &&
        tr.vendor === 1 &&
        new Date(tr.departure) > plus(new Date(), 1440),
    );
  const call = (a, s, path, m = "GET", body, h = {}) =>
    api.call(a, s, path, m, body, h);
  const key = (code) => api.key(code);
  const own = (db, table, row) => manifest.own(p.runId, db, table, [row]);
  async function step(code, fn) {
    if (state.results[code]?.state === "EXECUTED") return;
    try {
      if (skip) {
        state.results[code] = {
          code,
          title: labels[code[0]][Number(code.slice(2)) - 1],
          state: "SNAPSHOT",
          detail: "Đã chuẩn bị snapshot; chưa chạy API.",
        };
        return;
      }
      const result = await fn();
      const status = result?.scenarioState || "EXECUTED";
      state.results[code] = {
        code,
        title: labels[code[0]][Number(code.slice(2)) - 1],
        state: status,
        detail: result?.detail || "Thao tác tạo dữ liệu qua API hợp lệ.",
        result: result ?? null,
        at: new Date().toISOString(),
      };
    } catch (e) {
      state.results[code] = {
        code,
        title: labels[code[0]][Number(code.slice(2)) - 1],
        state: e instanceof Pending ? "PENDING" : "FAILED",
        detail: e.message,
        at: new Date().toISOString(),
      };
    } finally {
      save();
      const result = state.results[code];
      manifest.db
        .prepare("INSERT OR REPLACE INTO scenarios VALUES(?,?,?,?)")
        .run(p.runId, code, result.state, JSON.stringify(result));
      console.log(
        `[API ${code}] ${result.state}${result.state === "FAILED" ? ": " + result.detail : ""}`,
      );
    }
  }
  async function checkout(code, a, method = "ONLINE", count = 1, selectedTrip) {
    const commandName = art.checkoutCommands?.[code] || code;
    const known = (
      await dbs.cart.query(
        "SELECT id::text,status,expires_at,transport_cash_shift_id FROM orders WHERE transport_idempotency_key=$1",
        [key(commandName)],
      )
    ).rows[0];
    if (known) {
      const closed =
        method === "CASH" &&
        (
          await dbs.cart.query(
            "SELECT 1 FROM transport_cash_shifts WHERE id=$1 AND closed_at IS NOT NULL",
            [known.transport_cash_shift_id],
          )
        ).rowCount > 0;
      const expired =
        known.expires_at &&
        new Date(String(known.expires_at)).getTime() < Date.now();
      if (
        known.status === "CANCELLED" ||
        (["PAYMENT_PENDING", "CASH_PENDING"].includes(known.status) &&
          (closed || expired))
      ) {
        if (known.status !== "CANCELLED")
          await call(
            a,
            "cart",
            method === "CASH"
              ? `/api/v1/orders/transport/cash/orders/${known.id}/cancel-unpaid`
              : `/api/v1/orders/transport/${known.id}/cancel-unpaid`,
            "POST",
            {},
          );
        art.checkoutCommands ??= {};
        art.checkoutCommands[code] = `${code}:after:${known.id}`;
        save();
        if (method === "CASH")
          await call(
            a,
            "cart",
            "/api/v1/orders/transport/cash/shifts/open",
            "POST",
            { tripId: (selectedTrip || trip()).id },
          );
        return checkout(code, a, method, count, selectedTrip);
      }
      own("cart", "orders", known);
      return known;
    }
    const tr = selectedTrip || trip();
    if (!tr)
      throw new Pending("Không có chuyến còn đủ giờ; chạy phiên full mới");
    const rows = (
      await dbs.inventory.query(
        `SELECT seat_id::text FROM transport_trip_seats WHERE trip_id=$1 AND status='AVAILABLE' ORDER BY seat_code LIMIT $2`,
        [tr.id, count],
      )
    ).rows;
    if (rows.length < count)
      throw new Pending("Chuyến không còn đủ ghế cho scenario");
    const body = {
      tripId: tr.id,
      fullName: a.fullName || "Khách DEMO",
      email: a.email,
      phone: "0900000000",
      passengers: rows.map((s, i) => ({
        seatId: s.seat_id,
        name: `Khách DEMO ${code} ${i + 1}`,
        pickupStopId: tr.route.stops[0].id,
        dropoffStopId: tr.route.stops.at(-1).id,
      })),
    };
    const result = flat(
      await call(
        a,
        "cart",
        `/api/v1/orders/transport/${method === "CASH" ? "cash/" : ""}checkout`,
        "POST",
        body,
        { "Idempotency-Key": key(commandName) },
      ),
    );
    if (!result?.id) throw Error("Checkout không trả order id");
    own("cart", "orders", { id: result.id });
    return result;
  }
  async function payOrder(a, orderId) {
    let payment = (
      await dbs.pay.query(
        "SELECT id::text,status FROM payment_requests WHERE order_id=$1",
        [orderId],
      )
    ).rows[0];
    if (!payment)
      payment = flat(
        await call(a, "pay", "/api/v1/payments/create-mock", "POST", {
          orderId,
        }),
      );
    if (payment.status === "PENDING")
      await call(
        a,
        "pay",
        `/api/v1/payments/${payment.id}/mock-pay`,
        "POST",
        {},
      );
    let order;
    for (let attempt = 0; attempt < 8; attempt++) {
      order = (
        await dbs.cart.query("SELECT status FROM orders WHERE id=$1", [orderId])
      ).rows[0];
      if (order?.status === "CONFIRMED") break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (order?.status !== "CONFIRMED")
      throw new Pending(
        `Thanh toán đã ghi; đơn ${orderId} đang ${order?.status}, worker cần hoàn tất`,
      );
    return { paymentId: payment.id, orderId, status: order.status };
  }
  await step("U-01", async () => {
    await api.auth(u);
    return call(u, "auth", "/api/users/me", "PUT", {
      fullName: u.fullName,
      phoneNumber: "0900000021",
    });
  });
  await step("U-02", () => {
    const tr = trip();
    return api.request(
      "car",
      `/trips/search?origin=${encodeURIComponent(tr.route.origin)}&destination=${encodeURIComponent(tr.route.destination)}&departureDate=${vnDate(new Date(tr.departure))}`,
    );
  });
  await step("U-03", async () => {
    const tr = trip();
    await api.request("car", `/trips/${tr.id}/seats`);
    return {
      tripId: tr.id,
      detail: "Đã lấy sơ đồ ghế; checkout U-04 lấy quote nội bộ tin cậy.",
    };
  });
  await step("U-04", async () => {
    art.online = await checkout("U-04", u);
    save();
    return { orderId: art.online.id };
  });
  await step("U-05", async () => {
    art.group = await checkout("U-05", u, "ONLINE", 4);
    save();
    return { orderId: art.group.id };
  });
  await step("U-06", async () => {
    if (!art.group?.id) throw new Pending("Chưa có đơn nhóm U-05");
    return payOrder(u, art.group.id);
  });
  await step("U-07", async () => {
    if (!art.online?.id) throw new Pending("Chưa có đơn U-04");
    await call(
      u,
      "cart",
      `/api/v1/orders/transport/${art.online.id}/cancel-unpaid`,
      "POST",
      {},
    );
    return { orderId: art.online.id };
  });
  await step("U-08", async () => ({
    scenarioState: "SNAPSHOT",
    detail:
      "Đã có đơn CANCELLED và hold lịch sử. Không rút ngắn TTL hệ thống hoặc chờ 15 phút trong seed.",
  }));
  async function exchange(code, sign, method = "ONLINE") {
    const existing = (
      await dbs.cart.query(
        "SELECT id::text,state FROM transport_item_operations WHERE id=$1",
        [key(code)],
      )
    ).rows[0];
    if (existing) {
      if (existing.state === "WAITING_FUNDS" && sign > 0) {
        const row = (
          await dbs.cart.query(
            "SELECT plan_json FROM transport_item_operations WHERE id=$1",
            [existing.id],
          )
        ).rows[0];
        const plan = JSON.parse(row.plan_json);
        if (plan.paymentMethod === "ONLINE")
          await payOrderOperation(account(plan.userId), existing.id);
        else
          await call(
            fullStaff,
            "cart",
            `/api/v1/orders/transport/item-operations/${existing.id}/cash-topup`,
            "POST",
            { amount: plan.topup, reference: `DEMO-API-TOPUP-${p.runId}` },
          );
        const current = (
          await dbs.cart.query(
            "SELECT id::text,state FROM transport_item_operations WHERE id=$1",
            [existing.id],
          )
        ).rows[0];
        if (!["COMPLETED", "REFUND_PENDING"].includes(current.state))
          throw new Pending(`Operation ${current.id} đang ${current.state}`);
        return current;
      }
      if (!["COMPLETED", "REFUND_PENDING"].includes(existing.state))
        throw new Pending(`Operation ${existing.id} đang ${existing.state}`);
      return existing;
    }
    const source = (
      await dbs.cart.query(
        `SELECT i.*,o.user_id::text FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.id=ANY($1::uuid[]) AND o.status='CONFIRMED' AND o.payment_method=$2 AND i.transport_item_state='ACTIVE' AND i.transport_departure_at>now()+interval '2 days' AND NOT EXISTS(SELECT 1 FROM transport_item_operations op WHERE op.order_id=o.id) ORDER BY i.total_price DESC,i.id LIMIT 1`,
        [p.refs.orders.filter((o) => o.vendor === 1).map((o) => o.id), method],
      )
    ).rows[0];
    if (!source) throw new Pending("Không có vé nguồn phù hợp");
    let target, seat;
    for (const tr of p.refs.trips.filter(
      (tr) =>
        tr.vendor === 1 &&
        tr.status === "ON_SALE" &&
        new Date(tr.departure) > plus(new Date(), 2 * 1440) &&
        tr.id !== source.transport_trip_id,
    )) {
      for (const candidate of tr.car.seats) {
        const price = tr.price + (candidate.seatClass === "VIP" ? 50000 : 0);
        if (
          sign === 0
            ? price === Number(source.total_price)
            : sign > 0
              ? price > Number(source.total_price)
              : price < Number(source.total_price)
        ) {
          const available = (
            await dbs.inventory.query(
              `SELECT 1 FROM transport_trip_seats WHERE trip_id=$1 AND seat_id=$2 AND status='AVAILABLE'`,
              [tr.id, candidate.id],
            )
          ).rowCount;
          if (available) {
            target = tr;
            seat = candidate;
            break;
          }
        }
      }
      if (target) break;
    }
    if (!target) throw new Pending("Chưa tìm được ghế có chênh lệch đúng loại");
    const a = method === "CASH" ? fullStaff : account(source.user_id),
      body = {
        operationId: key(code),
        tripId: target.id,
        seatId: seat.id,
        pickupStopId: target.route.stops[0].id,
        dropoffStopId: target.route.stops.at(-1).id,
      };
    let op = await call(
      a,
      "cart",
      `/api/v1/orders/transport/${source.order_id}/items/${source.id}/exchange`,
      "POST",
      body,
    );
    own("cart", "transport_item_operations", { id: key(code) });
    if (sign > 0) {
      if (method === "ONLINE") await payOrderOperation(a, key(code));
      else
        await call(
          fullStaff,
          "cart",
          `/api/v1/orders/transport/item-operations/${key(code)}/cash-topup`,
          "POST",
          { amount: op.topup, reference: `DEMO-API-TOPUP-${p.runId}` },
        );
      op = await call(
        a,
        "cart",
        `/api/v1/orders/transport/item-operations/${key(code)}`,
      );
    }
    if (!["COMPLETED", "REFUND_PENDING"].includes(op.state))
      throw new Pending(`Operation ${key(code)} đang ${op.state}`);
    return op;
  }
  async function payOrderOperation(a, opId) {
    let pay = (
      await dbs.pay.query(
        "SELECT id::text,status FROM payment_requests WHERE order_id=$1",
        [opId],
      )
    ).rows[0];
    if (!pay)
      pay = flat(
        await call(a, "pay", "/api/v1/payments/create-mock", "POST", {
          orderId: opId,
        }),
      );
    if (pay.status === "PENDING")
      await call(a, "pay", `/api/v1/payments/${pay.id}/mock-pay`, "POST", {});
    return pay;
  }
  await step("U-09", () => exchange("U-09", 0));
  await step("U-10", () => exchange("U-10", 1));
  await step("U-11", () => exchange("U-11", -1));
  await step("U-12", async () => {
    if (!art.group?.id) throw new Pending("Chưa có đơn nhóm");
    if (state.results["U-06"]?.state !== "EXECUTED")
      throw new Pending("Chờ U-06 hoàn tất phát vé");
    const i = (
      await dbs.cart.query(
        "SELECT * FROM order_items WHERE order_id=$1 ORDER BY id LIMIT 1",
        [art.group.id],
      )
    ).rows[0];
    await call(
      u,
      "cart",
      `/api/v1/orders/transport/${art.group.id}/items/${i.id}/amend`,
      "POST",
      {
        commandId: key("U-12"),
        expectedRevision: i.transport_ticket_revision,
        passengerName: "Nguyễn Minh Anh · DEMO cập nhật",
        pickupStopId: i.pickup_stop_id,
        dropoffStopId: i.dropoff_stop_id,
      },
    );
    await call(
      u,
      "cart",
      `/api/v1/orders/${art.group.id}/ticket-email/resend`,
      "POST",
      {},
    );
    return { orderId: art.group.id, itemId: i.id };
  });
  await step("U-13", async () => {
    if (!art.group?.id) throw new Pending("Chưa có đơn nhóm");
    if (state.results["U-06"]?.state !== "EXECUTED")
      throw new Pending("Chờ U-06 hoàn tất phát vé");
    const i = (
      await dbs.cart.query(
        "SELECT * FROM order_items WHERE order_id=$1 ORDER BY id DESC LIMIT 1",
        [art.group.id],
      )
    ).rows[0];
    return call(
      u,
      "cart",
      `/api/v1/orders/transport/${art.group.id}/items/${i.id}/cancel`,
      "POST",
      { operationId: key("U-13"), reasonCode: "CHANGE_OF_PLANS", reasonText: "DEMO: Khách thay đổi kế hoạch chuyến đi." },
    );
  });
  await step("U-14", async () => {
    if (!art.group?.id) throw new Pending("Chưa có đơn nhóm");
    if (state.results["U-06"]?.state !== "EXECUTED")
      throw new Pending("Chờ U-06 hoàn tất phát vé");
    const known = (
      await dbs.cart.query(
        "SELECT id::text FROM order_disputes WHERE order_id=$1",
        [art.group.id],
      )
    ).rows[0];
    if (known) return known;
    const result = await call(u, "cart", "/api/v1/orders/disputes", "POST", {
      orderId: art.group.id,
      reason: "DEMO API: xác nhận điểm đón",
      description: "Dữ liệu demo từ seed, khách cần hướng dẫn điểm đón.",
    });
    own("cart", "order_disputes", result);
    return result;
  });
  await step("V-01", async () => {
    const digits = String(parseInt(p.runId.slice(-6), 16) % 10000000).padStart(
      7,
      "0",
    );
    const plate = `99DE-${digits.slice(0, 5)}.${digits.slice(5)}`;
    const known = (
      await dbs.car.query("SELECT id FROM cars WHERE license_plate=$1", [plate])
    ).rows[0];
    art.car =
      known ||
      (await call(v, "car", "/cars", "POST", {
        name: `Xe thao tác API DEMO ${p.slug}`,
        type: "SEAT",
        licensePlate: plate,
        totalSeats: 4,
      }));
    // Presentation responses may expose carId instead of id.
    const carId = art.car.id || art.car.carId;
    if (!carId) throw Error("Tạo xe không trả id");
    art.car.id = carId;
    save();
    own("car", "cars", { id: carId });
    return call(v, "car", `/cars/${carId}/seats`, "PUT", {
      seats: Array.from({ length: 4 }, (_, i) => ({
        code: `A0${i + 1}`,
        level: 1,
        seatClass: "STANDARD",
        row: Math.floor(i / 2),
        column: i % 2,
      })),
    });
  });
  await step("V-02", async () => {
    if (!art.car?.id) throw new Pending("Chưa có xe API");
    return call(v, "car", `/cars/${art.car.id}`, "PATCH", {
      name: `Xe API cập nhật · DEMO ${p.slug}`,
    });
  });
  await step("V-03", async () => {
    const name = `Trạm API DEMO ${p.slug}`,
      known = (
        await dbs.car.query(
          "SELECT id FROM operator_stops WHERE operator_id=$1 AND name=$2",
          [p.refs.vendors[0].id, name],
        )
      ).rows[0];
    const stop =
      known ||
      (await call(v, "car", "/operators/me/stops", "POST", {
        name,
        address: "Điểm đón mẫu, Hà Nội",
        province: "Hà Nội",
      }));
    own("car", "operator_stops", stop);
    return call(v, "car", `/operators/me/stops/${stop.id}`, "PATCH", {
      address: "Điểm đón API đã cập nhật, Hà Nội",
      active: false,
    });
  });
  await step("V-04", async () => {
    const destination = `Hải Phòng DEMO ${p.slug}`,
      known = (
        await dbs.car.query(
          "SELECT id FROM routes WHERE operator_id=$1 AND destination=$2",
          [p.refs.vendors[0].id, destination],
        )
      ).rows[0];
    art.route =
      known ||
      (await call(v, "car", "/routes", "POST", {
        origin: "Hà Nội",
        destination,
        stops: [
          {
            name: "Bến Hà Nội DEMO",
            order: 0,
            address: "Hà Nội",
            province: "Hà Nội",
          },
          {
            name: "Bến Hải Phòng DEMO",
            order: 1,
            address: "Hải Phòng",
            province: "Hải Phòng",
          },
        ],
      }));
    if (!art.route.id) art.route.id = art.route.routeId;
    if (!art.route.id) throw Error("Tạo tuyến không trả id");
    save();
    own("car", "routes", art.route);
    return call(v, "car", `/routes/${art.route.id}`);
  });
  await step("V-05", async () => {
    const archived = p.refs.vendors[0].routes.find((route) => route.archived);
    await call(v, "car", `/routes/${archived.id}`, "DELETE");
    return {
      routeId: archived.id,
      detail:
        "Archive lặp an toàn tuyến demo có chuyến lịch sử; tuyến đã archive từ snapshot.",
    };
  });
  await step("V-06", async () => {
    if (!art.car?.id || !art.route?.id)
      throw new Pending("Chưa có xe/tuyến API");
    const known = (
      await dbs.car.query(
        "SELECT id FROM trips WHERE car_id=$1 ORDER BY created_at LIMIT 1",
        [art.car.id],
      )
    ).rows[0];
    const depart = plus(new Date(), 27 * 60);
    art.trip =
      known ||
      (await call(v, "car", "/trips", "POST", {
        carId: art.car.id,
        routeId: art.route.id,
        departureTime: stamp(depart),
        arrivalTime: stamp(plus(depart, 150)),
        pricePerSeat: 220000,
      }));
    if (!art.trip.id) art.trip.id = art.trip.tripId;
    if (!art.trip.id) throw Error("Tạo chuyến không trả id");
    save();
    own("car", "trips", art.trip);
    return { tripId: art.trip.id };
  });
  await step("V-07", async () => {
    if (!art.trip?.id) throw new Pending("Chưa có chuyến API");
    return call(v, "car", `/trips/${art.trip.id}/publish`, "POST", {});
  });
  await step("V-08", async () => {
    if (!art.trip?.id) throw new Pending("Chưa có chuyến API");
    await call(v, "car", `/trips/${art.trip.id}/stop-sale`, "POST", {});
    return call(v, "car", `/trips/${art.trip.id}/resume-sale`, "POST", {});
  });
  await step("V-09", async () => {
    const tr = trip(),
      seat = (
        await dbs.inventory.query(
          `SELECT seat_id::text FROM transport_trip_seats WHERE trip_id=$1 AND status='AVAILABLE' ORDER BY seat_code DESC LIMIT 1`,
          [tr.id],
        )
      ).rows[0];
    if (!seat) throw new Pending("Không có ghế trống");
    await call(v, "car", `/trips/${tr.id}/seat-blocks`, "PUT", {
      seatIds: [seat.seat_id],
      blocked: true,
      reason: "DEMO API dành ghế vận hành",
    });
    await call(v, "car", `/trips/${tr.id}/seat-blocks`, "PUT", {
      seatIds: [seat.seat_id],
      blocked: false,
      reason: "DEMO API mở lại ghế",
    });
    return { tripId: tr.id, seatId: seat.seat_id };
  });
  await step("V-10", async () => {
    const s = p.refs.staff.find((s) => s.vendor === 1 && s.slot === 2);
    return call(v, "car", `/operators/me/staff/${s.id}`, "PUT", {
      canSellCash: s.canSellCash,
      canCheckIn: s.canCheckIn,
      canManageTrip: s.canManageTrip,
      canCloseShift: s.canCloseShift,
      active: s.active,
      tripIds: s.tripIds,
    });
  });
  await step("V-11", async () => {
    await call(v, "cart", "/api/v1/orders/transport/vendor");
    return call(
      v,
      "cart",
      `/api/v1/orders/transport/vendor/reports?from=${p.calendarDateVietnam}&to=${p.calendarDateVietnam}`,
    );
  });
  await step("V-12", async () => {
    const payout = (
      await dbs.pay.query(
        `SELECT id::text FROM host_payouts WHERE host_id=$1 AND id=ANY($2::uuid[]) AND status='PENDING' AND order_id=ANY($3::uuid[]) LIMIT 1`,
        [
          v.id,
          p.tables.pay.host_payouts.map((p) => p.id),
          p.refs.orders
            .filter((o) => o.status === "COMPLETED")
            .map((o) => o.id),
        ],
      )
    ).rows[0];
    if (!payout) throw new Pending("Không có payout demo đủ điều kiện");
    return call(
      v,
      "pay",
      `/api/v1/payouts/transport/${payout.id}/withdraw`,
      "POST",
      {},
    );
  });
  await step("S-01", () => call(fullStaff, "car", "/staff/me/trips"));
  const shiftStaff = account(
      p.refs.staff.find((s) => s.vendor === 7 && s.slot === 1).id,
    ),
    shiftTrip = () =>
      p.refs.trips.find(
        (tr) =>
          tr.vendor === 7 &&
          tr.status === "ON_SALE" &&
          new Date(tr.departure) > plus(new Date(), 1440),
      );
  await step("S-02", async () => {
    art.shift = await call(
      shiftStaff,
      "cart",
      "/api/v1/orders/transport/cash/shifts/open",
      "POST",
      { tripId: shiftTrip().id },
    );
    save();
    return art.shift;
  });
  await step("S-03", async () => {
    art.cash = await checkout("S-03", shiftStaff, "CASH", 1, shiftTrip());
    save();
    return { orderId: art.cash.id };
  });
  await step("S-04", async () => {
    art.cashGroup = await checkout("S-04", shiftStaff, "CASH", 4, shiftTrip());
    save();
    return { orderId: art.cashGroup.id };
  });
  await step("S-05", async () => {
    if (!art.cashGroup?.id) throw new Pending("Chưa có đơn CASH nhóm");
    art.cashGroup = await checkout("S-04", shiftStaff, "CASH", 4, shiftTrip());
    save();
    const order = (
      await dbs.cart.query(
        "SELECT total_amount,status FROM orders WHERE id=$1",
        [art.cashGroup.id],
      )
    ).rows[0];
    if (order.status !== "CASH_PENDING")
      return { orderId: art.cashGroup.id, status: order.status };
    return call(
      shiftStaff,
      "cart",
      `/api/v1/orders/transport/cash/orders/${art.cashGroup.id}/receive`,
      "POST",
      { amount: Number(order.total_amount) },
    );
  });
  await step("S-06", async () => {
    const op = p.refs.operations.find(
      (o) => o.method === "CASH" && o.state === "REFUND_PENDING",
    );
    if (!op) throw new Pending("Không có operation CASH chờ hoàn");
    const plan = p.tables.cart.transport_item_operations.find(
        (row) => row.id === op.id,
      ),
      data = JSON.parse(plan.plan_json),
      vendor = p.refs.orders.find((order) => order.id === op.orderId).vendor;
    const cashier = account(
        p.refs.staff.find((s) => s.vendor === vendor && s.slot === 4).id,
      ),
      shift = p.refs.shifts.find((s) => s.actor === cashier.id && s.open);
    return call(
      cashier,
      "cart",
      `/api/v1/orders/transport/item-operations/${op.id}/cash-refund`,
      "POST",
      {
        amount: data.refundDue,
        reference: `DEMO-API-CASH-REFUND-${p.runId}`,
        evidenceUrl:
          "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
        cashShiftId: shift?.id,
      },
    );
  });
  await step("S-07", () => exchange("S-07", 1, "CASH"));
  await step("S-08", async () => {
    if (state.results["S-05"]?.state !== "EXECUTED")
      throw new Pending("Chờ thu tiền xong ở S-05 trước khi đóng ca");
    if (!art.shift?.id) throw new Pending("Chưa mở ca S-02");
    const detail = await call(
      shiftStaff,
      "cart",
      "/api/v1/orders/transport/cash/shifts/active/detail",
    );
    return call(
      shiftStaff,
      "cart",
      "/api/v1/orders/transport/cash/shifts/close",
      "POST",
      {
        countedAmount:
          detail.expectedAmount ??
          (detail.receipts || []).reduce((s, r) => s + Number(r.amount), 0) +
            (detail.adjustments || []).reduce(
              (s, r) => s + (r.kind === "TOPUP" ? 1 : -1) * Number(r.amount),
              0,
            ),
      },
    );
  });
  await step("S-09", async () => {
    const s = account(
        p.refs.staff.find((s) => s.vendor === 8 && s.slot === 1).id,
      ),
      tr = p.refs.trips.find(
        (tr) =>
          tr.vendor === 8 &&
          tr.status === "ON_SALE" &&
          new Date(tr.departure) > plus(new Date(), 1440),
      );
    if (art.varianceClosed) return art.varianceClosed;
    art.varianceShift = await call(
      s,
      "cart",
      "/api/v1/orders/transport/cash/shifts/open",
      "POST",
      { tripId: tr.id },
    );
    save();
    art.varianceClosed = await call(
      s,
      "cart",
      "/api/v1/orders/transport/cash/shifts/close",
      "POST",
      { countedAmount: 10000 },
    );
    save();
    return art.varianceClosed;
  });
  await step("S-10", async () => {
    const now = new Date(),
      ids = p.refs.trips
        .filter(
          (tr) =>
            tr.vendor === 1 &&
            new Date(tr.departure) > now &&
            new Date(tr.departure) < plus(now, 240),
        )
        .map((tr) => tr.id);
    const ticket = (
      await dbs.cart.query(
        `SELECT i.transport_check_in_token token,i.transport_ticket_id::text id FROM order_items i WHERE i.order_id=ANY($1::uuid[]) AND i.transport_trip_id=ANY($2::uuid[]) AND i.transport_item_state='ACTIVE' AND i.transport_boarding_status IS NULL LIMIT 1`,
        [p.refs.orders.map((o) => o.id), ids],
      )
    ).rows[0];
    if (!ticket?.token)
      throw new Pending("Không còn vé đúng cửa sổ giờ check-in");
    art.checkIn = ticket;
    save();
    return call(fullStaff, "car", "/tickets/check-in", "POST", {
      token: ticket.token,
    });
  });
  await step("S-11", async () => {
    if (!art.checkIn?.token) throw new Pending("Chưa có vé S-10");
    try {
      const result = await call(fullStaff, "car", "/tickets/check-in", "POST", {
        token: art.checkIn.token,
      });
      return {
        detail: "Quét lặp được backend xử lý theo trạng thái hiện tại.",
        result,
      };
    } catch (e) {
      if (e.status === 409 || e.status === 400)
        return {
          detail: "Backend từ chối quét lặp đúng nghiệp vụ.",
          httpStatus: e.status,
        };
      throw e;
    }
  });
  await step("S-12", async () => {
    const tr = p.refs.trips.find((tr) => tr.vendor === 1 && tr.live);
    return call(fullStaff, "car", `/trips/${tr.id}/manifest`);
  });
  // Admin scenarios require a real existing session. No passwords or privileges are changed.
  for (let n = 1; n <= 12; n++)
    await step(`A-${String(n).padStart(2, "0")}`, async () => {
      await api.auth("admin");
      return adminScenario(n, { api, p, dbs, art, call, key, save });
    });
  const rows = Object.values(state.results).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
  jsonWrite(resolve(dir, "scenarios.json"), rows);
  return rows;
}

async function adminScenario(n, { api, p, dbs, art, call, key, save }) {
  const admin = (s, path, m = "GET", body) => call("admin", s, path, m, body);
  if (n === 1) return admin("cart", "/api/v1/orders/transport/admin/summary");
  if (n === 2 || n === 3) {
    const owner = p.refs.vendors[n === 2 ? 9 : 10].owner;
    return admin("auth", `/api/users/ticket-vendors/${owner}/approval`, "PUT", {
      status: n === 2 ? "APPROVED" : "REJECTED",
      reason: n === 2 ? null : "DEMO API: cần bổ sung giấy phép vận tải",
    });
  }
  if (n === 4) {
    const listing = p.tables.catalog.listings.find(
      (l) => l.status === "PENDING",
    );
    await admin(
      "catalog",
      `/api/v1/catalog/admin/listings/${listing.id}/status?status=ACTIVE`,
      "PATCH",
      {},
    );
    return { listingId: listing.id, status: "ACTIVE" };
  }
  if (n === 5) {
    const operator = p.refs.vendors[8];
    await admin("car", `/operators/${operator.id}/status`, "PATCH", {
      status: "ACTIVE",
    });
    await admin("car", `/operators/${operator.id}/status`, "PATCH", {
      status: "SUSPENDED",
      reason: "DEMO API: khôi phục trạng thái đình chỉ để người demo thao tác",
    });
    return { operatorId: operator.id, status: "SUSPENDED" };
  }
  if (n === 6)
    return admin(
      "cart",
      "/api/v1/orders/transport/admin/orders?page=0&size=20",
    );
  if (n === 7) {
    const claim = p.tables.cart.order_disputes.find(
      (c) => c.status === "IN_REVIEW",
    );
    return admin(
      "cart",
      `/api/v1/orders/transport/admin/disputes/${claim.id}/resolve`,
      "PUT",
      {
        status: "RESOLVED",
        adminNote: "DEMO API: đã xác minh điểm đón và phản hồi khách.",
      },
    );
  }
  if (n === 8) {
    const order = p.refs.orders.find(
      (o) => o.status === "REFUND_PENDING" && o.method === "ONLINE",
    );
    return admin(
      "cart",
      `/api/v1/orders/transport/admin/refunds/${order.id}/complete`,
      "PUT",
      {
        amount: order.row.transport_refund_due,
        reference: `DEMO-ADMIN-WHOLE-REFUND-${p.runId}`,
        evidenceUrl:
          "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
      },
    );
  }
  if (n === 9) {
    const op = p.refs.operations.find(
        (o) => o.state === "ABORT_REFUND_PENDING",
      ),
      plan = JSON.parse(
        p.tables.cart.transport_item_operations.find((o) => o.id === op.id)
          .plan_json,
      );
    return admin(
      "cart",
      `/api/v1/orders/transport/admin/item-operations/${op.id}/refund`,
      "POST",
      {
        amount: plan.topup,
        reference: `DEMO-API-ADMIN-REFUND-${p.runId}`,
        evidenceUrl:
          "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
        refundMethod: "BANK_TRANSFER",
      },
    );
  }
  if (n === 10) {
    const tr = p.refs.trips.find(
      (tr) =>
        tr.vendor === 8 &&
        tr.status === "ON_SALE" &&
        tr.kind === "future" &&
        p.refs.orders.some((o) => o.trip === tr.id && o.status === "CONFIRMED"),
    );
    if (!tr) throw new Pending("Không có chuyến phù hợp để demo hủy");
    await admin("car", `/trips/${tr.id}/admin-summary`);
    return admin("car", `/trips/${tr.id}/admin-cancellation`, "POST", {
      reason:
        "DEMO API: nhà xe hủy chuyến, xử lý đơn và khoản hoàn theo coordinator",
    });
  }
  if (n === 11) {
    const payout = p.tables.pay.host_payouts.find(
      (o) => o.status === "REQUESTED",
    );
    const current = await admin(
      "pay",
      `/api/v1/payouts/transport/${payout.id}/prepare`,
      "POST",
      {},
    );
    return admin(
      "pay",
      `/api/v1/payouts/transport/${payout.id}/mark-paid`,
      "PUT",
      {
        amount: current.hostAmount,
        reference: `DEMO-ADMIN-PAYOUT-${p.runId}`,
        evidenceUrl:
          "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
      },
    );
  }
  if (n === 12) {
    const order = p.refs.orders.find((o) => o.status === "CONFIRMED");
    const findings = await admin(
      "cart",
      `/api/v1/orders/transport/admin/reconciliation/${order.id}/refresh`,
      "PUT",
      {},
    );
    if (findings?.length)
      await admin(
        "cart",
        `/api/v1/orders/transport/admin/reconciliation/${order.id}/${findings[0].issueCode}/notes`,
        "POST",
        {
          note: "DEMO API: đã đọc kết quả quét, không chỉnh dữ liệu tiền/ghế tự động.",
        },
      );
    const outbox = await admin(
      "cart",
      "/api/v1/orders/transport/admin/notifications",
    );
    return {
      orderId: order.id,
      findings,
      outboxCount: Array.isArray(outbox) ? outbox.length : null,
    };
  }
}

export async function refreshLive(dbs, p, manifest) {
  const api = new Api(p),
    a = p.credentials.find((a) => a.group === "user" && a.index === 22),
    now = new Date();
  const trips = (
    await dbs.car.query(
      `SELECT id FROM trips WHERE id=ANY($1::text[]) AND status='ON_SALE' AND departure_time>($2::timestamp) ORDER BY departure_time LIMIT 8`,
      [p.refs.trips.map((tr) => tr.id), sqlTime("car", plus(now, 60))],
    )
  ).rows;
  if (!trips.length)
    throw Error(
      "Phiên cũ không còn chuyến đủ giờ. Chạy --profile full để tạo lịch mới; không dời lịch sử.",
    );
  const batch = [];
  for (let n = 0; n < trips.length; n++) {
    const tr = p.refs.trips.find((tr) => tr.id === trips[n].id),
      seat = (
        await dbs.inventory.query(
          `SELECT seat_id::text FROM transport_trip_seats WHERE trip_id=$1 AND status='AVAILABLE' ORDER BY seat_code LIMIT 1`,
          [tr.id],
        )
      ).rows[0];
    if (!seat) continue;
    const command = id(
      p.runId,
      "refresh",
      `${Math.floor(now.getTime() / 60000)}:${n}`,
    );
    const order = flat(
      await api.call(
        a,
        "cart",
        "/api/v1/orders/transport/checkout",
        "POST",
        {
          tripId: tr.id,
          fullName: a.fullName,
          email: a.email,
          phone: "0900000000",
          passengers: [
            {
              seatId: seat.seat_id,
              name: "Khách DEMO refresh",
              pickupStopId: tr.route.stops[0].id,
              dropoffStopId: tr.route.stops.at(-1).id,
            },
          ],
        },
        { "Idempotency-Key": command },
      ),
    );
    manifest.own(p.runId, "cart", "orders", [{ id: order.id }]);
    batch.push({
      code: `REFRESH-${n + 1}`,
      state: "EXECUTED",
      orderId: order.id,
      user: a.username,
      expiresAt: order.expiresAt,
      tripId: tr.id,
    });
  }
  jsonWrite(resolve(DATA, "runs", p.runId, "refresh-live.json"), batch);
  return batch;
}
