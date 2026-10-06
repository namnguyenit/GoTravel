const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { migrateLandmarkImages } = require('./image-store');
const { replaceLandmarkBlock } = require('./seed-file');

const VIETNAM_DATA_PATH = path.join(__dirname, 'vietnam-data.js');

// Blacklist keywords for image titles to filter out maps, flags, icons, etc.
const BLACKLIST_KEYWORDS = [
  'icon', 'logo', 'map', 'bản đồ', 'flag', 'quốc kỳ', 'location', 'vị trí', 
  'biểu trưng', 'huy hiệu', 'sơ đồ', 'hành chính', 'vùng', 'chia', 'giới hạn', 
  'vĩ độ', 'tập tin', 'stub', 'coordinate', 'tọa độ', 'wiki', 'letter', 'nút', 
  'button', 'arrow', 'chỉ hướng', 'hướng dẫn', 'hành lang', 'coat of arms', 
  'red link', 'geograph', 'locator', 'district', 'administrative'
];

function isBlacklisted(title) {
  const t = title.toLowerCase();
  return BLACKLIST_KEYWORDS.some(kw => t.includes(kw));
}

// Province-specific Unsplash gallery pools for aesthetic coherence
const REGIONAL_POOLS = {
  HANOI: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp',
  ],
  CITY: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp'
  ],
  HERITAGE: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp',
  ],
  BEACH: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp',
  ],
  NATURE: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp'
  ],
  RURAL: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp'
  ]
};

// Map each province to a regional pool category
const PROVINCE_TO_POOL_MAP = {
  'Hà Nội': 'HANOI',
  'Hồ Chí Minh': 'CITY',
  'Đà Nẵng': 'HERITAGE',
  'Quảng Ninh': 'BEACH',
  'Lào Cai': 'NATURE',
  'Khánh Hòa': 'BEACH',
  'Lâm Đồng': 'NATURE',
  'Thừa Thiên Huế': 'HERITAGE',
  'Quảng Nam': 'HERITAGE',
  'Kiên Giang': 'BEACH',
  'Hà Giang': 'NATURE',
  'Ninh Bình': 'NATURE',
  'Phú Thọ': 'NATURE',
  'Quảng Bình': 'NATURE',
  'Bình Định': 'BEACH',
  'Phú Yên': 'BEACH',
  'Bình Thuận': 'BEACH',
  'Vũng Tàu': 'BEACH',
  'Cần Thơ': 'RURAL',
  'Tiền Giang': 'RURAL',
  'Bến Tre': 'RURAL',
  'Nghệ An': 'RURAL',
  'Thanh Hóa': 'RURAL',
  'Hải Phòng': 'BEACH',
  'Điện Biên': 'NATURE',
  'Sơn La': 'NATURE',
  'Gia Lai': 'RURAL',
  'Đắk Lắk': 'RURAL',
  'Kon Tum': 'RURAL',
  'Bình Dương': 'CITY'
};

const HEADERS = {
  'User-Agent': 'GoStayTravelSeeder/2.0 (contact: support@gostay.com; research project)'
};

// Axios helper with exponential backoff on 429 errors
async function axiosGetWithRetry(url, retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { headers: HEADERS });
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.warn(`      ⚠️  [429 Too Many Requests] Đang đợi ${delay}ms trước khi thử lại (Lần ${i+1}/${retries})...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Failed to GET ${url} after ${retries} retries due to rate limiting.`);
}

async function getWikiPageInfo(query) {
  try {
    const res = await axiosGetWithRetry(
      `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3`
    );
    if (!res.data.query.search.length) return null;
    return res.data.query.search[0].title;
  } catch (e) {
    console.error(`    ❌ Lỗi tìm kiếm wiki cho "${query}":`, e.message);
    return null;
  }
}

async function getWikiMainImage(title) {
  try {
    const res = await axiosGetWithRetry(
      `https://vi.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original&format=json`
    );
    const pages = res.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pages[pageId] && pages[pageId].original && pages[pageId].original.source) {
      const source = pages[pageId].original.source;
      const isInvalidExt = source.toLowerCase().match(/\.(svg|gif|tif)$/i);
      const filename = source.substring(source.lastIndexOf('/') + 1);
      if (!isInvalidExt && !isBlacklisted(filename)) {
        return source;
      }
    }
    return null;
  } catch (e) {
    console.error(`    ❌ Lỗi lấy ảnh wiki chính cho "${title}":`, e.message);
    return null;
  }
}

async function run() {
  console.log('====================================================');
  console.log('🏛️  BẮT ĐẦU CÀO ẢNH ĐỊA DANH CHÍNH XÁC TỪ WIKIPEDIA');
  console.log('====================================================\n');
  
  const { PROVINCES_AND_LANDMARKS } = require('./vietnam-data');
  let successCount = 0;
  let fallbackCount = 0;
  
  for (let pIdx = 0; pIdx < PROVINCES_AND_LANDMARKS.length; pIdx++) {
    const prov = PROVINCES_AND_LANDMARKS[pIdx];
    const poolKey = PROVINCE_TO_POOL_MAP[prov.province] || 'NATURE';
    const pool = [...new Set([
      ...REGIONAL_POOLS[poolKey],
      ...prov.landmarks.flatMap(landmark => [landmark.thumbnail, ...(landmark.gallery || [])])
    ].filter(Boolean))];
    if (pool.length < 5) throw new Error(`Regional image pool ${poolKey} needs at least 5 images`);
    
    console.log(`\n📍 Tỉnh/Thành phố: ${prov.province} (${pIdx + 1}/${PROVINCES_AND_LANDMARKS.length}) [Vùng: ${poolKey}]`);
    
    for (let lIdx = 0; lIdx < prov.landmarks.length; lIdx++) {
      const lm = prov.landmarks[lIdx];
      console.log(`  - Địa danh: "${lm.name}"`);
      
      let wikiTitle = await getWikiPageInfo(lm.name);
      if (!wikiTitle) {
        wikiTitle = await getWikiPageInfo(`${lm.name} ${prov.province}`);
      }
      
      let mainImage = null;
      if (wikiTitle) {
        mainImage = await getWikiMainImage(wikiTitle);
      }
      
      // Shuffle regional pool for unique gallery images
      const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
      
      if (mainImage) {
        lm.thumbnail = mainImage;
        // Make sure gallery doesn't repeat the thumbnail if it's from Unsplash (though mainImage is wiki)
        lm.gallery = shuffledPool.slice(0, 4);
        successCount++;
        console.log(`    ✅ Thành công! Lấy ảnh thật từ Wiki: ${mainImage}`);
      } else {
        // Fallback for both thumbnail and gallery
        lm.thumbnail = shuffledPool[0];
        lm.gallery = shuffledPool.slice(1, 5);
        fallbackCount++;
        console.log(`    ⚠️  Không có ảnh Wiki. Gán ảnh Unsplash vùng ${poolKey} (Thumbnail: ${lm.thumbnail})`);
      }
      
      // Short sleep to respect API limits
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Store all selected public images in our own cloud before writing seed data.
  await migrateLandmarkImages(PROVINCES_AND_LANDMARKS);

  console.log('\n📝 Đang lưu lại kết quả vào vietnam-data.js...');
  const fileContent = fs.readFileSync(VIETNAM_DATA_PATH, 'utf-8');
  const updated = replaceLandmarkBlock(fileContent, PROVINCES_AND_LANDMARKS);
  const temporary = `${VIETNAM_DATA_PATH}.tmp`;
  fs.writeFileSync(temporary, updated, 'utf-8');
  fs.renameSync(temporary, VIETNAM_DATA_PATH);
  console.log(`\n🎉 HOÀN TẤT THÀNH CÔNG!`);
  console.log(`- Địa danh lấy được ảnh Wiki chính xác: ${successCount}`);
  console.log(`- Địa danh dùng ảnh Unsplash vùng: ${fallbackCount}`);
  console.log(`- Đã cập nhật tệp: ${VIETNAM_DATA_PATH}`);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
