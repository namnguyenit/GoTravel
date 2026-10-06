// Extract named establishments/room types from their publisher's own pages.
// This is a research stage: no uploads, business writes, fabricated reviews or inventory.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { load } = require('cheerio');
const { save } = require('./research');
const { canonical, provinces } = require('../balanced/provinces');
const base = 'https://booking.muongthanh.com/';
const cache = path.join(__dirname, '.cache', 'official-pages');
const out = path.join(__dirname, 'official-establishments.json');
const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = s => load('<div>' + String(s || '') + '</div>')('div').text().replace(/\s+/g, ' ').trim();
const parseJson = value => { try { return JSON.parse(value || '[]'); } catch { return []; } };
const pause = ms => new Promise(r => setTimeout(r, ms));
function imageList(value, page) {
  return [...new Set(parseJson(value).map(x => x.image).filter(Boolean).map(x => new URL(x, page).href))]
    .filter(x => new URL(x).hostname === 'booking.muongthanh.com' && /\/images\/(?:hotels|rooms|service|foods)\//.test(x) && /\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(x));
}
async function getHtml(url) {
  fs.mkdirSync(cache, { recursive: true });
  const file = path.join(cache, createHash('sha256').update(url).digest('hex') + '.html');
  if (fs.existsSync(file)) return { html: fs.readFileSync(file, 'utf8'), checkedAt: fs.statSync(file).mtime.toISOString() };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'GoTravel-CatalogResearch/1.0 (https://github.com/namnguyenit/GoTravel)' } });
      if (new URL(r.url).hostname !== 'booking.muongthanh.com') throw Error('Publisher redirect left the approved source');
      if (!r.ok) throw Error('HTTP ' + r.status);
      const html = await r.text(); if (html.length > 4e6) throw Error('Source page exceeds research limit');
      fs.writeFileSync(file, html); return { html, checkedAt: new Date().toISOString() };
    } catch (e) { if (attempt === 2 || /HTTP (403|404|429)/.test(e.message)) throw e; await pause(1000 * (attempt + 1)); }
  }
}
function classifyProvince(address, hint) {
  const aliases = { ...require('../balanced/provinces').aliases, 'TP HCM': 'Hồ Chí Minh', 'TP Hồ Chí Minh': 'Hồ Chí Minh', 'Khánh Hoà': 'Khánh Hòa' };
  // Preserve the publisher's address; only the province filter is canonicalized.
  const segments = address.split(/[,;.]/).map(x => x.trim().replace(/^(?:tỉnh|thành phố|tp\.?|t\.)\s*/i, '')).reverse();
  const match = segments.map(x => Object.keys(aliases).find(n => fold(x) === fold(n))).find(Boolean);
  const province = aliases[match] || aliases[hint];
  return provinces.includes(province) ? province : null;
}
function extract(seed, page, verifiedLocation) {
  const $ = load(page.html), header = $('.box-room-name');
  const title = clean(header.find('h1').first().text());
  if (!title || !fold(title).includes(fold(seed.name))) throw Error('Publisher page name does not match the requested establishment');
  const address = clean(header.find('p').first().text());
  const province = classifyProvince(address, seed.provinceHint);
  if (!province) throw Error('A current Vietnam province could not be established from source address');
  const iframe = $('iframe[src*="google.com/maps"]').first().attr('src') || '';
  const longitude = verifiedLocation?.longitude ?? Number(iframe.match(/!2d(-?[\d.]+)/)?.[1]), latitude = verifiedLocation?.latitude ?? Number(iframe.match(/!3d(-?[\d.]+)/)?.[1]);
  if (!(latitude >= 8 && latitude <= 24 && longitude >= 102 && longitude <= 111)) throw Error('No usable Vietnam coordinates in the establishment-specific location block');
  const rooms = [];
  for (const e of $('#list-room-wrapper .card').toArray()) {
    const card = $(e), box = card.find('[data-images]').first();
    const name = clean(box.attr('data-title')); if (!name || rooms.some(x => fold(x.name) === fold(name))) continue;
    const text = clean(card.text()), priceMatch = text.match(/Chỉ từ\s+([\d,.]+)\s*VNĐ/i);
    const images = imageList(box.attr('data-images'), seed.sourceUrl);
    if (!images.length) continue;
    rooms.push({ name, images, areaSquareMeters: Number(text.match(/([\d,.]+)\s*m2/)?.[1]?.replace(',', '.')) || null,
      amenities: parseJson(box.attr('data-services')).map(x => clean(x.title)).filter(Boolean),
      quotedPrice: priceMatch ? Number(priceMatch[1].replace(/\D/g,'')) : null,
      quoteCurrency: 'VND', quoteCheckIn: $('input[name="checkin"]').first().attr('value') || null,
      quoteCheckOut: $('input[name="checkout"]').first().attr('value') || null,
      sourceReportedUnavailable: /Hết phòng/i.test(text), sourcePage: seed.sourceUrl, checkedAt: page.checkedAt });
  }
  const services = [];
  for (const e of $('a.show-detail[data-images]').toArray()) {
    const box = $(e), name = clean(box.attr('data-title')).replace(/\\\//g, '/');
    let category;
    if (/spa|massage/i.test(name)) category = 'SPA';
    else if (/nhà hàng|restaurant/i.test(name)) category = 'PREPARED_MEALS';
    else continue; // A hotel gym/pool does not establish a separately sold training/experience offer.
    if (services.some(x => fold(x.name) === fold(name))) continue;
    const images = imageList(box.attr('data-images'), seed.sourceUrl); if (!images.length) continue;
    services.push({ name, subCategory: category, images, sourceSummary: clean(box.attr('data-summary')).slice(0,1200),
      facts: parseJson(box.attr('data-services')).map(x => ({ name: clean(x.service_name), value: clean(x.content) })),
      price: null, priceVerification: 'not_published', sourcePage: seed.sourceUrl, checkedAt: page.checkedAt });
  }
  const gallery = imageList($('#dynamic-gallery-demo').attr('data-image'), seed.sourceUrl);
  return { sourceId: 'muongthanh:' + seed.id, name: title, sourceUrl: seed.sourceUrl, sourcePublisher: 'Mường Thanh Hospitality',
    address, province, latitude, longitude, coordinateBasis: verifiedLocation ? 'matched_property_coordinate_source' : 'establishment_specific_official_location_embed_not_generic_geo_meta',
    locationSource: verifiedLocation?.sourceUrl || seed.sourceUrl, addressSource: seed.sourceUrl, mapReferenceUrl: iframe,
    ward: address.match(/(?:phường|xã)\s+([^,;.]+)/i)?.[0] || null,
    sourceWardStatus: 'verbatim_publisher_address_not_independently_normalized',
    images: gallery, rooms, services, checkedAt: page.checkedAt, sourceVerification: 'publisher_page_and_item_specific_photo_binding',
    partnershipStatus: 'not_established', imageRights: 'publisher_copyright_not_an_open_license',
    commercialData: 'Public quote snapshots only; no provider availability or GoTravel partnership asserted' };
}
async function main() {
  const homepage = await getHtml(base), $ = load(homepage.html), seeds = [];
  for (const e of $('a[data-hotel]').toArray()) {
    const v = e.attribs; if (!v['data-hotel'] || seeds.some(x => x.id === v['data-hotel'])) continue;
    if (/lào|lao|vientiane/i.test(v['title-city'] || '')) continue;
    seeds.push({ id: v['data-hotel'], name: v['data-title'], provinceHint: v['title-city'], sourceUrl: new URL('khach-san-' + v['data-alias'].replace(/ /g,'-'), base).href });
  }
  const result = fs.existsSync(out) && !process.argv.includes('--refresh-extraction') ? JSON.parse(fs.readFileSync(out)) : { schemaVersion: 1, startedAt: new Date().toISOString(), establishments: [], rejected: [] };
  for (let i=0; i<seeds.length; i++) {
    const seed = seeds[i]; if (result.establishments.some(x => x.sourceId === 'muongthanh:' + seed.id)) continue;
    try { result.establishments.push(extract(seed, await getHtml(seed.sourceUrl))); result.rejected = result.rejected.filter(x => x.sourceUrl !== seed.sourceUrl); }
    catch (e) { result.rejected.push({ ...seed, error: e.message }); }
    save(out, result); console.log('Official property ' + (i+1) + '/' + seeds.length + ': ' + seed.name); await pause(700);
  }
  result.completedAt = new Date().toISOString(); save(out,result);
  console.log(JSON.stringify({ establishments:result.establishments.length, rooms:result.establishments.reduce((s,x)=>s+x.rooms.length,0), services:result.establishments.reduce((s,x)=>s+x.services.length,0), provinces:[...new Set(result.establishments.map(x=>x.province))], rejected:result.rejected.length }));
}
if (require.main === module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports = { extract, classifyProvince, imageList, getHtml };
