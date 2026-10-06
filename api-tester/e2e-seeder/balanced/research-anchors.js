const fs = require("fs"),
  path = require("path");
const { storePublicImage } = require("../image-store");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = {
  "user-agent":
    "GoTravel-SeedResearch/1.0 (educational travel demo; https://github.com/namnguyenit/GoTravel)",
};
const clean = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
async function query(host, params) {
  const u = new URL("/w/api.php", host);
  for (const [k, v] of Object.entries({
    ...params,
    format: "json",
    formatversion: 2,
  }))
    u.searchParams.set(k, v);
  await wait(500);
  const r = await fetch(u, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error("Research HTTP " + r.status);
  return r.json();
}
(async () => {
  const file = path.join(__dirname, "anchors.json");
  if (fs.existsSync(file)) {
    console.log("Anchors cache ready");
    return;
  }
  const provinces = ["Hà Tĩnh", "Lai Châu", "Lạng Sơn"];
  const info = await query("https://vi.wikipedia.org", {
    action: "query",
    titles: provinces.map((x) => x + " (thành phố)").join("|"),
    redirects: 1,
    prop: "coordinates|pageimages|info",
    coprimary: "primary",
    piprop: "original",
    inprop: "url",
  });
  const auditDir = path.join(__dirname, "../.image-migration/balanced");
  fs.mkdirSync(auditDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(auditDir, "anchor-pages.json"),
    JSON.stringify(info, null, 2),
    { mode: 0o600 },
  );
  const result = [];
  for (const province of provinces) {
    const page = info.query?.pages?.find((p) => p.title.startsWith(province));
    if (!page?.coordinates?.[0] || !page.original?.source)
      throw Error("Located illustrated city page required: " + province);
    const coord = page.coordinates[0],
      image = page.original.source;
    const title =
      "File:" +
      decodeURIComponent(new URL(image).pathname.split("/").pop()).replace(
        /_/g,
        " ",
      );
    const meta = await query("https://commons.wikimedia.org", {
      action: "query",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|extmetadata|size",
      iiurlwidth: 1600,
    });
    const photo = meta.query?.pages?.[0]?.imageinfo?.[0];
    if (!photo) throw Error("Photo metadata missing: " + province);
    const m = photo.extmetadata || {},
      license = clean(m.LicenseShortName?.value);
    if (!/^(CC BY(?:-SA)? [1-4]\.[0-9]|CC0|Public domain)$/i.test(license))
      throw Error("Unsupported license: " + license);
    const source = photo.thumburl || photo.url;
    const secureUrl = await storePublicImage(source);
    const maps = new URL("https://www.google.com/maps/search/");
    maps.searchParams.set("api", "1");
    maps.searchParams.set(
      "query",
      province + " " + coord.lat + "," + coord.lon,
    );
    result.push({
      province,
      name: "Trung tâm " + province,
      latitude: coord.lat,
      longitude: coord.lon,
      thumbnailUrl: secureUrl,
      galleryUrls: [secureUrl],
      wikipediaUrl: page.fullurl,
      googleMapsUrl: maps.href,
      image: {
        source,
        secureUrl,
        author: clean(m.Artist?.value),
        license,
        licenseUrl: clean(m.LicenseUrl?.value),
        sourcePage: photo.descriptionurl,
      },
      description: `Trung tâm đô thị ${province} là điểm xuất phát để tìm nơi lưu trú, kết hợp tham quan các khu vực lân cận và sắp xếp dịch vụ trong chuyến đi. Tên khu vực, tọa độ và ảnh được đối chiếu từ ${page.fullurl}. Kiểm tra tuyến đường, thời tiết và điều kiện tiếp cận trước khi đi. Google Maps: ${maps.href}\n\nẢnh: ${clean(m.Artist?.value)}, ${license}; ${photo.descriptionurl}. Đã đổi kích thước và chuyển WebP; giữ giấy phép nguồn. ${clean(m.LicenseUrl?.value)}`,
    });
    console.log("Uploaded destination: " + province);
  }
  fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
