const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  assert = require("assert/strict");
const { connect, accounts } = require("../expansion/db");
const { canonical, provinces, source } = require("./provinces");
const templates = require("../expansion/plan.json"),
  anchors = require("./anchors.json"),
  { IMAGE_POOLS } = require("../vietnam-data");
const batchId = "gotravel-province-balance-2026-10-05-v1",
  dir = path.join(__dirname, "../.image-migration/balanced");
const id = (k) => {
  const h = crypto
    .createHash("sha1")
    .update(batchId + ":" + k)
    .digest("hex")
    .slice(0, 32)
    .split("");
  h[12] = "5";
  h[16] = "8";
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};
const key = (l) =>
  l.category === "STAY"
    ? "STAY:" + l.attributes.stayDetail.propertyType
    : l.category === "SVC"
      ? "SVC:" + l.sub_category
      : "EXP";
const choose = (xs, i) => xs[i % xs.length];
const propertyNames = {
  hotel: "Khách sạn",
  boutique_hotel: "Khách sạn boutique",
  resort_room: "Phòng resort",
  villa: "Villa",
  apartment: "Căn hộ",
  homestay: "Homestay",
  bungalow: "Bungalow",
  guesthouse: "Nhà nghỉ",
  resort: "Resort",
  cabin: "Cabin gỗ",
  camping: "Lều glamping",
  farmstay: "Farmstay",
  hostel: "Hostel phòng riêng",
};
async function createPlan() {
  const c = await connect("CatalogandListing"),
    b = await connect("BookingandInventory");
  let rows, complexes, landmarks, inventory, calendars;
  try {
    rows = (
      await c.query("SELECT * FROM listings WHERE status='ACTIVE' ORDER BY id")
    ).rows;
    complexes = (
      await c.query("SELECT * FROM complexes WHERE status='ACTIVE' ORDER BY id")
    ).rows;
    landmarks = (
      await c.query("SELECT * FROM landmarks WHERE status='ACTIVE' ORDER BY id")
    ).rows;
    inventory = (await b.query("SELECT * FROM inventory_configs")).rows;
    calendars = (
      await b.query(
        "SELECT listing_id,count(*)::int AS n FROM inventory_calendars WHERE date BETWEEN $1::date AND $1::date+90 GROUP BY listing_id",
        [
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
        ],
      )
    ).rows;
  } finally {
    await c.end();
    await b.end();
  }
  const users = await accounts(),
    owners = users.filter((u) => u.roles.includes("HOST")),
    enterprises = users.filter((u) => u.roles.includes("ENTERPRISE")),
    guests = users.filter(
      (u) =>
        u.roles.includes("USER") &&
        !u.roles.includes("HOST") &&
        !u.roles.includes("ENTERPRISE"),
    );
  assert.ok(
    owners.length >= 7 && enterprises.length >= 3 && guests.length >= 3,
  );
  const counts = Object.fromEntries(provinces.map((p) => [p, {}]));
  for (const l of rows) {
    const p = canonical(l.province);
    assert.ok(counts[p], "Unrecognized province " + l.province);
    const k = key(l);
    counts[p][k] = (counts[p][k] || 0) + 1;
  }
  for (const x of complexes) {
    const p = canonical(x.province);
    counts[p].COMPLEX = (counts[p].COMPLEX || 0) + 1;
  }
  const kinds = [...new Set(rows.map(key))].sort(),
    targets = Object.fromEntries(
      [...kinds, "COMPLEX"].map((k) => [
        k,
        Math.max(
          k === "EXP" ? 30 : 6,
          ...provinces.map((p) => counts[p][k] || 0),
        ),
      ]),
    );
  const normalization = [
    ...rows.map((r) => ({
      table: "listings",
      id: r.id,
      before: r.province,
      after: canonical(r.province),
    })),
    ...complexes.map((r) => ({
      table: "complexes",
      id: r.id,
      before: r.province,
      after: canonical(r.province),
    })),
    ...landmarks.map((r) => ({
      table: "landmarks",
      id: r.id,
      before: r.province,
      after: canonical(r.province),
    })),
  ].filter((r) => r.before !== r.after);
  const plan = {
    batchId,
    createdAt: new Date().toISOString(),
    inventoryStart: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    inventoryDays: 91,
    provinceSource: source,
    targets,
    beforeCounts: counts,
    normalization,
    landmarks: [],
    complexes: [],
    listings: [],
    reviews: [],
    inventory: [],
    recordOrigins: {
      listings: "synthetic",
      complexes: "synthetic",
      reviews: "synthetic",
      landmarks: "public-sourced",
    },
  };
  const known = new Set([...rows, ...complexes, ...landmarks].map((x) => x.id));
  const newId = (base) => {
    let n = 0;
    while (known.has(id(base + ":" + n))) n++;
    const uuid = id(base + ":" + n);
    known.add(uuid);
    return uuid;
  };
  for (const a of anchors)
    if (!landmarks.some((l) => canonical(l.province) === a.province)) {
      const l = {
        id: newId("landmark:" + a.province),
        name: a.name,
        description: a.description,
        province: a.province,
        latitude: a.latitude,
        longitude: a.longitude,
        thumbnailUrl: a.thumbnailUrl,
        galleryUrls: a.galleryUrls,
        radiusMeters: 5000,
        isFeatured: false,
        status: "ACTIVE",
      };
      plan.landmarks.push(l);
      landmarks.push({
        id: l.id,
        name: l.name,
        description: l.description,
        province: l.province,
        latitude: l.latitude,
        longitude: l.longitude,
        thumbnail_url: l.thumbnailUrl,
      });
    }
  let global = 0;
  for (const province of provinces) {
    const local = landmarks.filter((x) => canonical(x.province) === province);
    assert.ok(local.length);
    const oldComplexes = complexes.filter(
      (x) => canonical(x.province) === province,
    );
    const eligibleOld = oldComplexes.filter((c) =>
      users.some(
        (u) =>
          u.id === c.host_id &&
          u.roles.some((r) => r === "HOST" || r === "ENTERPRISE"),
      ),
    );
    const pool = [
      ...eligibleOld.map((c) => ({
        id: c.id,
        hostId: c.host_id,
        latitude: c.latitude,
        longitude: c.longitude,
        province,
      })),
    ];
    for (let n = counts[province].COMPLEX || 0; n < targets.COMPLEX; n++) {
      const a = choose(local, n),
        images = Array.from({ length: 5 }, (_, j) =>
          choose(IMAGE_POOLS.COMPLEX, n + j + global),
        );
      const x = {
        id: newId("complex:" + province),
        hostId: choose(enterprises, n).id,
        name: `${choose(["Khu lưu trú", "Tổ hợp nghỉ dưỡng", "Khu nghỉ gia đình"], n)} tại ${province} · ${String(n + 1).padStart(2, "0")}`,
        description: `Tổ hợp lưu trú tại khu vực ${a.name}, ${province}, có các lựa chọn phòng và căn hộ dành cho khách đi theo cặp, gia đình hoặc nhóm bạn. Các dịch vụ trực thuộc được quản lý cùng một chủ sở hữu, có giá và lịch còn chỗ riêng. Khách kiểm tra số người, tiện nghi, giờ nhận/trả phòng, chính sách thú cưng và điều kiện di chuyển trước khi chọn phòng. Khu tiếp nhận và không gian sinh hoạt chung được mô tả theo từng lựa chọn; các khoản phát sinh cần được trao đổi trước chuyến đi.`,
        province,
        latitude: a.latitude + 0.001 * (n % 4),
        longitude: a.longitude + 0.001 * (n % 3),
        thumbnailUrl: images[0],
        galleryUrls: images,
        status: "ACTIVE",
      };
      plan.complexes.push(x);
      pool.push(x);
    }
    for (const kind of kinds) {
      const current = counts[province][kind] || 0;
      for (let n = current; n < targets[kind]; n++) {
        const a = choose(local, n + global),
          category = kind.split(":")[0],
          sub = category === "SVC" ? kind.slice(4) : "NONE";
        let template = templates.listings.find((l) =>
          category === "STAY"
            ? l.category === "STAY" &&
              l.attributes.stayDetail.propertyType === kind.slice(5)
            : category === "EXP"
              ? l.category === "EXP"
              : l.subCategory === sub,
        );
        if (!template && category === "STAY")
          template = templates.listings.find(
            (l) =>
              l.category === "STAY" &&
              l.attributes.stayDetail.propertyType === "hotel",
          );
        assert.ok(template);
        const l = structuredClone(template);
        l.id = newId("listing:" + province + ":" + kind);
        l.hostId = choose(owners, global).id;
        l.complexId = null;
        l.province = province;
        l.latitude = a.latitude + 0.002 * Math.sin(global);
        l.longitude = a.longitude + 0.002 * Math.cos(global);
        l.averageRating = [4.3, 4.7, 4.0][global % 3];
        l.totalReviews = 3;
        l.status = "ACTIVE";
        const images =
          category === "STAY"
            ? require("../vietnam-data").LISTING_IMAGE_POOLS.STAY
            : category === "EXP"
              ? require("../vietnam-data").LISTING_IMAGE_POOLS.EXP
              : require("../vietnam-data").LISTING_IMAGE_POOLS.SVC[sub];
        l.attributes.galleryUrls = Array.from({ length: 5 }, (_, j) =>
          choose(images, global + j),
        );
        l.thumbnailUrl = l.attributes.galleryUrls[0];
        if (category === "STAY") {
          const property = kind.slice(5),
            type = propertyNames[property];
          l.attributes.stayDetail.propertyType = property;
          const cx = choose(pool, global);
          l.complexId = cx.id;
          l.hostId = cx.hostId;
          l.latitude = cx.latitude;
          l.longitude = cx.longitude;
          l.title = `${type} tại ${province} · ${String(n + 1).padStart(2, "0")}`;
          const d = l.attributes.stayDetail;
          l.description = `${type} ở khu vực ${province}, diện tích ${d.roomSizeSqM} m² với ${d.bedrooms} phòng ngủ, ${d.bathrooms} phòng tắm, phù hợp tối đa ${d.maxGuests} khách. Tiện nghi gồm ${l.attributes.amenities.join(", ")}. Phù hợp chuyến đi nghỉ dưỡng, khám phá địa phương hoặc lưu trú cùng gia đình và nhóm bạn.\n\nNhận phòng từ ${l.attributes.policies.checkInTime}, trả phòng trước ${l.attributes.policies.checkOutTime}. Không hút thuốc trong nhà, không tổ chức tiệc; ${l.attributes.policies.allowPets ? "có hỗ trợ thú cưng khi xác nhận trước" : "không nhận thú cưng"}. Giá tính theo đêm; chọn ngày, số người và kiểm tra lịch còn phòng trước khi đặt. Trao đổi trước về cách nhận chìa khóa, chỗ đỗ xe và các yêu cầu đặc biệt.`;
        } else if (category === "EXP") {
          l.title = `${choose(["Khám phá", "Tản bộ và chụp ảnh", "Hành trình nhóm nhỏ"], n)} ${a.name} · ${String(n + 1).padStart(2, "0")}`;
          l.thumbnailUrl = a.thumbnail_url;
          l.attributes.galleryUrls = [
            a.thumbnail_url,
            ...l.attributes.galleryUrls.slice(0, 4),
          ];
          l.attributes.expDetail.meetingPoint = `Khu vực ${a.name}, ${province}; xác nhận điểm hẹn trước chuyến đi`;
          l.attributes.expDetail.meetingPointLat = a.latitude;
          l.attributes.expDetail.meetingPointLng = a.longitude;
          l.attributes.itinerary = [
            {
              time: "00:00",
              activity: "Đón nhóm, trao đổi nhu cầu và giới thiệu tuyến",
            },
            {
              time: "00:15",
              activity: `Tìm hiểu cảnh quan và văn hóa quanh ${a.name}`,
            },
            { time: "01:15", activity: "Nghỉ ngắn, chụp ảnh và tổng kết" },
          ];
          l.description = `Chương trình nhóm nhỏ quanh ${a.name}, ${province}, thời lượng ${l.attributes.expDetail.durationMinutes} phút. Lịch trình gồm đón nhóm, giới thiệu khu vực, tham quan các điểm được phép tiếp cận và thời gian nghỉ/chụp ảnh. Nhóm tối đa 8 người, hỗ trợ Tiếng Việt và Tiếng Anh theo lịch đăng ký.\n\nBao gồm người hướng dẫn, nước uống và lưu ý an toàn; không bao gồm vé vào cửa, phương tiện tới điểm hẹn hoặc bữa ăn riêng. Chuẩn bị giày dễ đi, trang phục phù hợp và nước cá nhân; kiểm tra thời tiết, sức khỏe và quy định của điểm tham quan trước khi tham gia. Giá tính theo khách, chọn suất còn chỗ và xác nhận điểm hẹn trước chuyến đi.\n\nThông tin địa danh và nguồn ảnh: ${a.description}`;
        } else {
          const serviceName = template.title.split(" tại ")[0];
          l.title = `${serviceName} tại ${province} · ${String(n + 1).padStart(2, "0")}`;
          const lead = template.description.split("\n\n")[0];
          l.description = `${lead}\n\nKhu vực phục vụ tại ${province}, quanh ${a.name}, bán kính tối đa 10 km. Chọn khung giờ còn suất, xác nhận số người, địa điểm thực hiện và nhu cầu đặc biệt trước buổi sử dụng. Phạm vi công việc, dụng cụ và yêu cầu chuẩn bị được liệt kê trong thông tin gói. Khách chuẩn bị điện, nước sạch và không gian phù hợp khi dịch vụ thực hiện tại nơi lưu trú. Những phát sinh ngoài gói và phí di chuyển ngoài khu vực được trao đổi trước.`;
        }
        plan.listings.push(l);
        const ratings =
          global % 3 === 0
            ? [4, 4, 5]
            : global % 3 === 1
              ? [4, 5, 5]
              : [4, 4, 4];
        for (let j = 0; j < 3; j++)
          plan.reviews.push({
            id: newId("review:" + l.id + ":" + j),
            listingId: l.id,
            userId: choose(guests, global + j).id,
            rating: ratings[j],
            comment: `[Đánh giá giả lập] ${choose(["Thông tin tiện nghi và giá được trình bày rõ, thuận tiện đối chiếu với lịch trình chuyến đi.", "Phần ảnh, giờ nhận phòng hoặc thời lượng dịch vụ giúp chuẩn bị trước khi chọn lịch.", "Phạm vi gói và các yêu cầu chuẩn bị được nêu đầy đủ; nên xác nhận điểm hẹn trước chuyến đi."], j)} Tài nguyên: ${l.title}. Không phải đánh giá của khách hàng thật hay giao dịch đã hoàn tất.`,
            images: [],
          });
        global++;
      }
    }
  }
  const active = [
      ...rows.map((l) => ({
        id: l.id,
        category: l.category,
        subCategory: l.sub_category,
      })),
      ...plan.listings,
    ],
    configs = new Map(inventory.map((c) => [c.listing_id, c]));
  for (const l of active)
    if (!configs.has(l.id))
      plan.inventory.push({
        id: newId("inventory:" + l.id),
        listingId: l.id,
        category: l.category === "SVC" ? "SVC_" + l.subCategory : l.category,
        scheduleConfig: {
          defaultQuantity: l.category === "STAY" ? 3 : 8,
          timeSlots:
            l.category === "STAY"
              ? []
              : l.category === "EXP"
                ? [
                    { slot: "08:00 - 11:00", quantity: 8 },
                    { slot: "12:00 - 15:00", quantity: 8 },
                    { slot: "15:30 - 18:30", quantity: 8 },
                  ]
                : [
                    { slot: "08:00 - 10:00", quantity: 8 },
                    { slot: "13:00 - 15:00", quantity: 8 },
                    { slot: "16:00 - 18:00", quantity: 8 },
                  ],
        },
        isActive: true,
      });
  plan.activeListingIds = active.map((l) => l.id);
  const calendarCounts = new Map(calendars.map((r) => [r.listing_id, r.n]));
  plan.inventoryIncomplete = active
    .filter((l) => {
      const old = configs.get(l.id);
      const slots =
        l.category === "STAY" ? 1 : old?.schedule_config.timeSlots?.length || 3;
      return (calendarCounts.get(l.id) || 0) < slots * 91;
    })
    .map((l) => l.id);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(dir, "plan.json"),
    JSON.stringify(plan, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      mode: "plan",
      provinces: provinces.length,
      targets,
      normalization: normalization.length,
      add: {
        landmarks: plan.landmarks.length,
        complexes: plan.complexes.length,
        listings: plan.listings.length,
        reviews: plan.reviews.length,
        inventoryConfigs: plan.inventory.length,
      },
      inventoryIncomplete: plan.inventoryIncomplete.length,
      readyToSkip:
        !normalization.length &&
        !plan.landmarks.length &&
        !plan.complexes.length &&
        !plan.listings.length &&
        !plan.inventory.length &&
        !plan.inventoryIncomplete.length,
    }),
  );
  return plan;
}
if (require.main === module)
  createPlan().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { createPlan, dir, key };
