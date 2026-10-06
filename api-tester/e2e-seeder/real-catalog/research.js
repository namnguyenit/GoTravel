// Public source discovery only. Candidates are never automatically published.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dir = __dirname;
const cacheDir = path.join(dir, '.cache');
const roots = ['Hotels in Vietnam', 'Spas in Vietnam', 'Amusement parks in Vietnam', 'Restaurants in Vietnam'];
const clean = v => String(v || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const pause = ms => new Promise(r => setTimeout(r, ms));
const save = (file, value) => { const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n'); fs.renameSync(tmp, file); };
async function api(host, params) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const u = new URL('/w/api.php', host);
  for (const [k, v] of Object.entries({ ...params, format: 'json', formatversion: 2 })) u.searchParams.set(k, v);
  const file = path.join(cacheDir, createHash('sha256').update(u.href).digest('hex') + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file));
  for (let attempt = 0; attempt < 3; attempt++) {
    await pause(400);
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'GoTravel-CatalogResearch/1.0 (https://github.com/namnguyenit/GoTravel)' }, signal: AbortSignal.timeout(25000) });
      if (r.status === 429) throw Error('Provider rate limit; retry in a later run');
      if (!r.ok) throw Error('HTTP ' + r.status);
      const v = await r.json();
      if (v.error) throw Error(v.error.info);
      save(file, v); return v;
    } catch (e) { if (attempt === 2 || /rate limit/.test(e.message)) throw e; await pause(1500 * (attempt + 1)); }
  }
}
async function members(title) {
  let result = [], continuation;
  do {
    const v = await api('https://commons.wikimedia.org', { action: 'query', list: 'categorymembers', cmtitle: title, cmlimit: 500, cmtype: 'file|subcat', ...continuation });
    result.push(...v.query.categorymembers); continuation = v.continue;
  } while (continuation);
  return result;
}
async function main() {
  const result = { schemaVersion: 1, startedAt: new Date().toISOString(), sources: roots, categories: [], images: {}, entities: {}, status: 'research_in_progress' };
  const file = path.join(dir, 'research.json');
  const queue = roots.map(x => ({ title: 'Category:' + x, depth: 0, root: x }));
  const seen = new Set(), files = new Set();
  while (queue.length && seen.size < 180) {
    const item = queue.shift(); if (seen.has(item.title)) continue; seen.add(item.title);
    if (/photographed in|by year|by decade|historic photographs|taken on|demolished|former hotels/i.test(item.title)) continue;
    let rows;
    try { rows = await members(item.title); } catch (e) { result.categories.push({ ...item, error: e.message }); save(file, result); continue; }
    const images = rows.filter(x => x.ns === 6).map(x => x.title);
    result.categories.push({ ...item, files: images }); images.forEach(x => files.add(x));
    if (item.depth < 3) for (const x of rows.filter(x => x.ns === 14)) queue.push({ title: x.title, depth: item.depth + 1, root: item.root });
    if (seen.size % 15 === 0) { save(file, result); console.log('Categories ' + seen.size + ', photographs ' + files.size); }
  }
  const cats = result.categories.filter(x => !x.error).map(x => x.title);
  for (let i = 0; i < cats.length; i += 40) {
    const v = await api('https://commons.wikimedia.org', { action: 'query', titles: cats.slice(i, i + 40).join('|'), prop: 'pageprops|coordinates|info', inprop: 'url', colimit: 'max' });
    for (const p of v.query.pages) {
      const c = result.categories.find(x => x.title === p.title); if (c) Object.assign(c, { coordinates: p.coordinates || [], wikidataId: p.pageprops?.wikibase_item || null, sourcePage: p.fullurl });
    }
  }
  const titles = [...files].filter(x => !/\.(svg|gif|tiff?|pdf|webm|ogg|mp4)$/i.test(x));
  for (let i = 0; i < titles.length; i += 40) {
    const v = await api('https://commons.wikimedia.org', { action: 'query', titles: titles.slice(i, i + 40).join('|'), prop: 'imageinfo', iiprop: 'url|size|sha1|extmetadata', iiurlwidth: 1600 });
    for (const p of v.query.pages) {
      const info = p.imageinfo?.[0]; if (!info) continue;
      const get = k => clean(info.extmetadata?.[k]?.value);
      const license = get('LicenseShortName');
      const eligible = /^(CC BY(?:-SA)? [1-4]\.[0-9]|CC0|Public domain)$/i.test(license) && Math.min(info.width, info.height) >= 400 && !/map|logo|postcard|advertisement|AI-generated|synthetic image|midjourney|dall.e/i.test(p.title + ' ' + get('ImageDescription'));
      result.images[p.title] = { title: p.title, sourceUrl: info.url, downloadUrl: info.thumburl || info.url, sourcePage: info.descriptionurl, sourceSha1: info.sha1, width: info.width, height: info.height, description: get('ImageDescription'), author: get('Artist'), credit: get('Credit'), license, licenseUrl: get('LicenseUrl'), photographedAt: get('DateTimeOriginal'), categories: get('Categories'), attributionRequired: get('AttributionRequired'), eligible, checkedAt: new Date().toISOString() };
    }
    save(file, result); if (i % 200 === 0) console.log('Photo metadata ' + Math.min(i + 40, titles.length) + '/' + titles.length);
  }
  const ids = [...new Set(result.categories.map(x => x.wikidataId).filter(Boolean))];
  for (let i = 0; i < ids.length; i += 40) {
    const v = await api('https://www.wikidata.org', { action: 'wbgetentities', ids: ids.slice(i, i + 40).join('|'), props: 'labels|claims', languages: 'vi|en' });
    for (const [id, e] of Object.entries(v.entities)) result.entities[id] = { id, labels: e.labels, officialWebsites: (e.claims?.P856 || []).filter(x => x.rank !== 'deprecated').map(x => x.mainsnak.datavalue?.value).filter(Boolean), coordinates: (e.claims?.P625 || []).filter(x => x.rank !== 'deprecated').map(x => x.mainsnak.datavalue?.value).filter(Boolean), address: (e.claims?.P6375 || []).map(x => x.mainsnak.datavalue?.value).filter(Boolean), locatedIn: (e.claims?.P131 || []).map(x => x.mainsnak.datavalue?.value?.id).filter(Boolean) };
    save(file, result);
  }
  result.completedAt = new Date().toISOString(); result.status = 'research_complete_review_required'; save(file, result);
  console.log(JSON.stringify({ categories: result.categories.length, entities: Object.keys(result.entities).length, photographs: Object.keys(result.images).length, eligible: Object.values(result.images).filter(x => x.eligible).length, output: file }));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { api, members, clean, save };
