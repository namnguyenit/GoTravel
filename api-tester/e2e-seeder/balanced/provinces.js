// Official 2025 mergers, with existing application spelling for city labels.
const groups = {
  "Lào Cai": ["Yên Bái", "Lào Cai"],
  "Tuyên Quang": ["Hà Giang", "Tuyên Quang"],
  "Thái Nguyên": ["Bắc Kạn", "Thái Nguyên"],
  "Phú Thọ": ["Vĩnh Phúc", "Hòa Bình", "Phú Thọ"],
  "Bắc Ninh": ["Bắc Giang", "Bắc Ninh"],
  "Hưng Yên": ["Thái Bình", "Hưng Yên"],
  "Hải Phòng": ["Hải Dương", "Hải Phòng"],
  "Ninh Bình": ["Hà Nam", "Nam Định", "Ninh Bình"],
  "Quảng Trị": ["Quảng Bình", "Quảng Trị"],
  "Đà Nẵng": ["Quảng Nam", "Đà Nẵng"],
  "Quảng Ngãi": ["Kon Tum", "Quảng Ngãi"],
  "Gia Lai": ["Bình Định", "Gia Lai"],
  "Khánh Hòa": ["Ninh Thuận", "Khánh Hòa"],
  "Lâm Đồng": ["Đắk Nông", "Bình Thuận", "Lâm Đồng"],
  "Đắk Lắk": ["Phú Yên", "Đắk Lắk"],
  "Hồ Chí Minh": ["Bà Rịa - Vũng Tàu", "Vũng Tàu", "Bình Dương", "Hồ Chí Minh"],
  "Đồng Nai": ["Bình Phước", "Đồng Nai"],
  "Tây Ninh": ["Long An", "Tây Ninh"],
  "Cần Thơ": ["Sóc Trăng", "Hậu Giang", "Cần Thơ"],
  "Vĩnh Long": ["Bến Tre", "Trà Vinh", "Vĩnh Long"],
  "Đồng Tháp": ["Tiền Giang", "Đồng Tháp"],
  "Cà Mau": ["Bạc Liêu", "Cà Mau"],
  "An Giang": ["Kiên Giang", "An Giang"],
  Huế: ["Thừa Thiên Huế", "Huế"],
  "Cao Bằng": ["Cao Bằng"],
  "Điện Biên": ["Điện Biên"],
  "Hà Tĩnh": ["Hà Tĩnh"],
  "Lai Châu": ["Lai Châu"],
  "Lạng Sơn": ["Lạng Sơn"],
  "Nghệ An": ["Nghệ An"],
  "Quảng Ninh": ["Quảng Ninh"],
  "Thanh Hóa": ["Thanh Hóa"],
  "Sơn La": ["Sơn La"],
  "Hà Nội": ["Hà Nội"],
};
const aliases = Object.fromEntries(
  Object.entries(groups).flatMap(([name, old]) => old.map((x) => [x, name])),
);
const provinces = Object.keys(groups).sort((a, b) => a.localeCompare(b, "vi"));
const canonical = (name) => aliases[name] || name;
module.exports = {
  groups,
  aliases,
  provinces,
  canonical,
  source:
    "https://xaydungchinhsach.chinhphu.vn/quoc-hoi-thong-qua-nghi-quyet-sap-xep-don-vi-hanh-chinh-cap-tinh-119250612101356465.htm",
};
