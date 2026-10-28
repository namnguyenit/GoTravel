import bcrypt from "bcryptjs";
import {
  id,
  sha,
  token,
  vnDate,
  local,
  plus,
  dateOffset,
  stamp,
  sqlTime,
} from "./core.mjs";

const names = [
  "Nguyễn Minh Anh",
  "Trần Quốc Bảo",
  "Lê Hoàng Chi",
  "Phạm Gia Duy",
  "Võ Thanh Hà",
  "Đặng Tuấn Kiệt",
  "Bùi Ngọc Lan",
  "Đỗ Hải Nam",
  "Hồ Phương Thảo",
  "Dương Đức Việt",
];
const regions = [
  ["Hà Nội", "Hải Phòng", "Ninh Bình", "Thanh Hóa", "Hòa Bình", "Nam Định"],
  [
    "Hồ Chí Minh",
    "Vũng Tàu",
    "Đồng Nai",
    "Bình Dương",
    "Tây Ninh",
    "Tiền Giang",
  ],
  ["Đà Nẵng", "Huế", "Quảng Nam", "Quảng Ngãi", "Tam Kỳ", "Hội An"],
  ["Cần Thơ", "An Giang", "Vĩnh Long", "Đồng Tháp", "Sóc Trăng", "Hậu Giang"],
  ["Hà Nội", "Ninh Bình", "Hải Dương", "Phú Thọ", "Thái Nguyên", "Bắc Giang"],
  [
    "Hồ Chí Minh",
    "Bến Tre",
    "Tiền Giang",
    "Đồng Nai",
    "Vũng Tàu",
    "Bình Dương",
  ],
  ["Đà Nẵng", "Hội An", "Huế", "Tam Kỳ", "Quảng Ngãi", "Quảng Nam"],
  ["Đà Lạt", "Nha Trang", "Bảo Lộc", "Đức Trọng", "Di Linh", "Khánh Hòa"],
  ["Hà Nội", "Hải Phòng", "Nam Định", "Ninh Bình", "Hòa Bình", "Thanh Hóa"],
];
const brands = [
  "Sao Việt",
  "Nam Phương",
  "Miền Trung",
  "Mekong",
  "Bắc Hà",
  "Phương Nam",
  "Biển Xanh",
  "Cao Nguyên",
  "Hồ Tây",
];
const image = "/demo/transport-document.svg";
export async function generate(runId, now, adminId, commission) {
  const day = vnDate(now),
    slug = runId.replace(/[^a-z0-9]/g, "").slice(-12),
    password = process.env.SEED_DEMO_PASSWORD || "GoTicket@123";
  const hash = await bcrypt.hash(password, 12);
  const p = {
    version: 1,
    runId,
    slug,
    startedAtUtc: stamp(now),
    calendarDateVietnam: day,
    timezone: "Asia/Ho_Chi_Minh",
    adminId,
    commission,
    credentials: [],
    tables: {
      auth: {},
      car: {},
      catalog: {},
      inventory: {},
      cart: {},
      pay: {},
    },
    refs: {
      users: [],
      vendors: [],
      staff: [],
      trips: [],
      orders: [],
      operations: [],
      shifts: [],
    },
  };
  const t = p.tables;
  const add = (db, table, row) => (t[db][table] ??= []).push(row);
  const ID = (kind, key) => id(runId, kind, key),
    C = (date) => sqlTime("car", date),
    J = (date) => sqlTime("cart", date);
  const old = plus(local(day), -14 * 1440),
    recent = plus(now, -20);
  function account(group, n, active = true, deleted = false) {
    const uid = ID(group, n),
      username = `gtd_${slug}_${group}_${String(n).padStart(3, "0")}`,
      email = `${username}@example.test`,
      fullName = `${names[(n - 1) % names.length]} · DEMO ${group} ${n}`;
    add("auth", "users", {
      id: uid,
      username,
      email,
      password: hash,
      provider: "LOCAL",
      provider_id: null,
      is_active: active,
      is_deleted: deleted,
      created_at: stamp(old),
    });
    add("auth", "user_profiles", {
      user_id: uid,
      full_name: fullName,
      phone_number: `09${sha(uid).slice(0, 8).replace(/[a-f]/g, "5")}`,
      date_of_birth: "1995-05-19",
      avartar_url: null,
    });
    add("auth", "users_roles", { user_id: uid, roles_name: "USER" });
    p.credentials.push({
      group,
      index: n,
      id: uid,
      username,
      password,
      email,
      fullName,
      active,
      deleted,
    });
    return p.credentials.at(-1);
  }
  for (let n = 1; n <= 200; n++)
    p.refs.users.push(account("user", n, n < 195, n >= 199));
  for (let n = 1; n <= 12; n++) {
    const a = account("vendor", n),
      approved = n <= 9,
      status = approved ? "APPROVED" : n === 12 ? "REJECTED" : "PENDING";
    if (approved)
      add("auth", "users_roles", {
        user_id: a.id,
        roles_name: "TICKET_VENDOR",
      });
    const label = brands[n - 1] || `Khởi Nghiệp ${n}`;
    add("auth", "ticket_vendor_profiles", {
      user_id: a.id,
      approval_status: status,
      company_name: `Công ty Vận tải ${label} DEMO ${slug}`,
      company_address: regions[(n - 1) % 9][0],
      representative_name: a.fullName,
      representative_id_number: `DEMO${slug}${n}`,
      tax_code: `DEMO-${slug}-${n}`,
      contact_phone: `09120000${String(n).padStart(2, "0")}`,
      document_front_url: image,
      document_back_url: image,
      rejection_reason:
        n === 12
          ? "DEMO: thiếu giấy phép kinh doanh vận tải, cần bổ sung."
          : null,
      created_at: J(old),
      updated_at: J(recent),
    });
    const op = {
      n,
      id: ID("operator", n),
      owner: a.id,
      name: label,
      regions: regions[(n - 1) % 9],
      cars: [],
      routes: [],
      staff: [],
    };
    p.refs.vendors.push(op);
    if (approved)
      add("car", "operators", {
        id: op.id,
        user_id: a.id,
        name: `${label} DEMO ${slug}`,
        display_name: `${label} · Demo ${slug}`,
        status: n === 9 ? "SUSPENDED" : "ACTIVE",
        contact_phone: `09120000${String(n).padStart(2, "0")}`,
        contact_address: op.regions[0],
        description: `Nhà xe mô phỏng ${label}. Dữ liệu DEMO ${runId}.`,
        created_at: C(old),
        updated_at: C(recent),
      });
  }
  let carN = 0,
    stopN = 0,
    routeN = 0;
  for (const v of p.refs.vendors.slice(0, 9)) {
    const count = v.n <= 8 ? 7 : 4;
    for (let j = 0; j < count; j++) {
      const n = ++carN,
        type = ["SLEEPER", "LIMOUSINE", "SEAT"][(n - 1) % 3],
        size = { SLEEPER: 36, LIMOUSINE: 22, SEAT: 40 }[type];
      const car = { id: ID("car", n), type, size, seats: [], calendar: [] };
      v.cars.push(car);
      add("car", "cars", {
        id: car.id,
        operator_id: v.id,
        name: `${v.name} ${String(j + 1).padStart(2, "0")} · DEMO`,
        type,
        status: "ACTIVE",
        license_plate: (() => {
          const d = String(
            (parseInt(runId.slice(-6), 16) * 61 + n) % 10000000,
          ).padStart(7, "0");
          return `99D-${d.slice(0, 5)}.${d.slice(5)}`;
        })(),
        total_seats: size,
        created_at: C(old),
        updated_at: C(recent),
      });
      for (let s = 0; s < size; s++) {
        const code = `${s < size / 2 ? "A" : "B"}${String((s % (size / 2)) + 1).padStart(2, "0")}`,
          seat = {
            id: ID("seat", `${n}:${s}`),
            code,
            seatClass: s % 8 === 0 ? "VIP" : "STANDARD",
          };
        car.seats.push(seat);
        add("car", "seat_templates", {
          id: seat.id,
          car_id: car.id,
          code,
          level: type === "SLEEPER" && s >= size / 2 ? 2 : 1,
          seat_class: seat.seatClass,
          row: Math.floor((type === "SLEEPER" ? s % (size / 2) : s) / 2),
          column: s % 2,
          active: true,
          created_at: C(old),
        });
      }
    }
    const opStops = [];
    for (let s = 0; s < (v.n <= 3 ? 14 : 13); s++) {
      const city = v.regions[s % 6],
        stop = {
          id: ID("stop", ++stopN),
          operator_id: v.id,
          name: `Bến ${city} · ${s < 6 ? "Trung tâm" : s < 12 ? "Văn phòng" : "Trạm đón"} DEMO`,
          address: `Điểm đón mẫu ${s + 1}, ${city}`,
          province: city,
          active: true,
          created_at: C(old),
          updated_at: C(recent),
        };
      opStops.push(stop);
      add("car", "operator_stops", stop);
    }
    const routeCount = v.n <= 4 ? 6 : v.n <= 8 ? 5 : 4;
    for (let j = 0; j < routeCount; j++) {
      const n = ++routeN,
        archived = v.n <= 4 && j === 5;
      const status = archived || v.n === 9 ? "INACTIVE" : "ACTIVE";
      const listingStatus = archived
        ? "DELETED"
        : v.n === 9
          ? "HIDDEN"
          : j === 4 && v.n <= 4
            ? "PENDING"
            : j === 4
              ? "HIDDEN"
              : "ACTIVE";
      const route = {
        id: ID("route", n),
        listingId: ID("listing", n),
        origin: v.regions[0],
        destination: v.regions[1 + (j % 5)],
        status,
        listingStatus,
        archived,
        stops: [],
        duration: 150 + (j % 3) * 45,
      };
      v.routes.push(route);
      add("car", "routes", {
        id: route.id,
        operator_id: v.id,
        origin: route.origin,
        destination: route.destination,
        status,
        deleted_at: archived ? C(plus(now, -1440)) : null,
        created_at: C(old),
        updated_at: C(recent),
      });
      const stops = [opStops[0], opStops[6], opStops[7], opStops[1 + (j % 5)]];
      for (let s = 0; s < 4; s++) {
        const os = stops[s],
          rs = {
            id: ID("route-stop", `${n}:${s}`),
            route_id: route.id,
            operator_stop_id: os.id,
            name: os.name,
            address: os.address,
            province: os.province,
            order: s,
            created_at: C(old),
            updated_at: C(recent),
          };
        route.stops.push(rs);
        add("car", "route_stops", rs);
      }
      add("catalog", "listings", {
        id: route.listingId,
        host_id: v.owner,
        transport_operator_id: v.id,
        transport_route_id: route.id,
        category: "TRANSPORT",
        sub_category: "NONE",
        title: `${route.origin} – ${route.destination} · ${v.name} DEMO`,
        description: `Tuyến ${route.origin} – ${route.destination}. Dữ liệu mô phỏng để trình diễn GoTicket ${runId}.`,
        province: route.origin,
        base_price: 180000 + j * 30000,
        price_unit: "PER_SEAT",
        latitude:
          route.origin === "Hà Nội"
            ? 21.0285
            : route.origin === "Hồ Chí Minh"
              ? 10.7769
              : 16.0544,
        longitude:
          route.origin === "Hà Nội"
            ? 105.8542
            : route.origin === "Hồ Chí Minh"
              ? 106.7009
              : 108.2022,
        thumbnail_url: null,
        attributes: {
          categoryType: "TRANSPORT",
          galleryUrls: [],
          operatorId: v.id,
          routeId: route.id,
          origin: route.origin,
          destination: route.destination,
        },
        average_rating: 0,
        total_reviews: 0,
        status: listingStatus,
        created_at: J(old),
        updated_at: J(recent),
      });
    }
  }
  // Allocate exactly 200/160/240 trips by vehicle type and retain vendor/date quotas.
  const quotas = { SLEEPER: 200, LIMOUSINE: 160, SEAT: 240 };
  let tripN = 0;
  function schedule(v, date, j, kind) {
    const types = Object.keys(quotas)
      .filter((type) => quotas[type] > 0 && v.cars.some((c) => c.type === type))
      .sort(
        (a, b) =>
          quotas[b] / { SLEEPER: 200, LIMOUSINE: 160, SEAT: 240 }[b] -
          quotas[a] / { SLEEPER: 200, LIMOUSINE: 160, SEAT: 240 }[a],
      );
    const type = types[0];
    quotas[type]--;
    const route =
      kind === "past" && j === 0 && v.n <= 4
        ? v.routes[5]
        : v.routes[j % (kind === "future" && j >= 44 ? 5 : 4)];
    const live = kind === "today" && j === 0;
    let departure = live
      ? plus(now, 60)
      : local(
          date,
          kind === "today" ? 5 + (j % 3) * 6 : 6 + (j % 3) * 5,
          (j % 2) * 20,
        );
    if (live && vnDate(departure) !== day) departure = local(day, 23, 40);
    const duration = route.duration;
    let car, arrival;
    for (let attempt = 0; attempt < 50; attempt++) {
      arrival = plus(departure, duration);
      car = v.cars.find(
        (c) =>
          c.type === type &&
          !c.calendar.some(
            ([a, b]) => departure < plus(b, 30) && arrival > plus(a, -30),
          ),
      );
      if (car) break;
      departure = plus(departure, 30);
    }
    if (!car || vnDate(departure) !== date)
      throw Error(`Không bố trí được xe ${v.n}/${date}/${j}`);
    car.calendar.push([departure, arrival]);
    let status =
      kind === "past"
        ? "COMPLETED"
        : departure <= now
          ? "STOP_SALE"
          : route.listingStatus === "ACTIVE"
            ? "ON_SALE"
            : "DRAFT";
    if (kind === "future" && j % 15 === 14) status = "STOP_SALE";
    if (kind === "future" && j === 49) status = "DRAFT";
    const price = 180000 + (v.n % 3) * 20000 + (j % 4) * 30000;
    const ref = {
      n: ++tripN,
      id: ID("trip", tripN),
      operator: v.id,
      owner: v.owner,
      vendor: v.n,
      route,
      car,
      departure: stamp(departure),
      arrival: stamp(arrival),
      price,
      status,
      kind,
      live,
      used: [],
      items: [],
    };
    p.refs.trips.push(ref);
    add("car", "trips", {
      id: ref.id,
      operator_id: v.id,
      route_id: route.id,
      car_id: car.id,
      departure_time: C(departure),
      arrival_time: C(arrival),
      price_per_seat: price,
      price_vnd: price,
      search_price_vnd: price,
      offer_listing_id: status === "DRAFT" ? null : route.listingId,
      status,
      sale_snapshot: null,
      class_prices: { STANDARD: price, VIP: price + 50000 },
      publish_attempts: status === "DRAFT" ? 0 : 1,
      inventory_sync_version: status === "DRAFT" ? 0 : 1,
      inventory_synced_version: status === "DRAFT" ? 0 : 1,
      created_at: C(old),
      updated_at: C(recent),
      completion_synced_at:
        status === "COMPLETED" ? C(plus(arrival, 20)) : null,
    });
    if (status !== "DRAFT") {
      add("inventory", "transport_trip_inventory", {
        trip_id: ref.id,
        operator_id: v.id,
        departure_at: sqlTime("inventory", departure),
        sale_enabled: status === "ON_SALE",
        sync_version: 1,
      });
      for (const seat of car.seats)
        add("inventory", "transport_trip_seats", {
          trip_id: ref.id,
          seat_id: seat.id,
          seat_code: seat.code,
          status: "AVAILABLE",
          order_id: null,
          hold_id: null,
          expires_at: null,
        });
    }
  }
  for (const v of p.refs.vendors.slice(0, 8)) {
    const past = v.n <= 4 ? 12 : 13,
      today = 25 - past;
    for (let j = 0; j < past; j++)
      schedule(v, dateOffset(day, -7 + (j % 7)), j, "past");
    // Live departure first; fixed slots use other cars or move within the day.
    for (let j = 0; j < today; j++) schedule(v, day, j, "today");
    for (let j = 0; j < 50; j++)
      schedule(v, dateOffset(day, 1 + (j % 14)), j, "future");
    for (let j = 1; j <= 4; j++) {
      const a = account("staff", (v.n - 1) * 4 + j);
      add("auth", "users_roles", { user_id: a.id, roles_name: "STAFF" });
      const tripIds =
        j === 2 || j === 3
          ? p.refs.trips
              .filter((tr) => tr.vendor === v.n && (tr.live || tr.n % 3 === 0))
              .map((tr) => tr.id)
          : [];
      const staff = {
        id: a.id,
        username: a.username,
        operator: v.id,
        vendor: v.n,
        slot: j,
        canSellCash: j === 1 || j === 4,
        canCheckIn: j === 2 || j === 4,
        canManageTrip: j === 3 || j === 4,
        canCloseShift: j === 1 || j === 4,
        tripIds,
        active: !(v.n === 8 && j === 3),
      };
      v.staff.push(staff);
      p.refs.staff.push(staff);
      add("car", "operator_staff", {
        id: ID("assignment", a.id),
        operator_id: v.id,
        user_id: a.id,
        can_sell_cash: staff.canSellCash,
        can_check_in: staff.canCheckIn,
        can_manage_trip: staff.canManageTrip,
        can_close_shift: staff.canCloseShift,
        trip_ids: tripIds,
        active: staff.active,
        assigned_by: v.owner,
        created_at: C(old),
        updated_at: C(recent),
      });
    }
  }
  // Drop calendars from serialized plan; they are only scheduling scratch data.
  for (const v of p.refs.vendors) for (const c of v.cars) delete c.calendar;
  p.demoPassword = password;
  return p;
}
