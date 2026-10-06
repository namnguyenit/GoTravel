const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { migrateLandmarkImages } = require('./image-store');
const { replaceLandmarkBlock } = require('./seed-file');

const VIETNAM_DATA_PATH = path.join(__dirname, 'vietnam-data.js');

async function getWikiImages(query) {
  try {
    const searchRes = await axios.get(`https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`);
    if (!searchRes.data.query.search.length) return [];
    const title = searchRes.data.query.search[0].title;

    const imagesRes = await axios.get(`https://vi.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&imlimit=30&format=json`);
    const pages = imagesRes.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (!pages[pageId].images) return [];

    const files = pages[pageId].images
      .map(img => img.title)
      .filter(t => !t.toLowerCase().includes('icon') && !t.toLowerCase().includes('logo') && t.match(/\.(jpg|jpeg|png)$/i));

    if (!files.length) return [];

    const urls = [];
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const imgInfoRes = await axios.get(`https://vi.wikipedia.org/w/api.php?action=query&titles=${batch.map(encodeURIComponent).join('|')}&prop=imageinfo&iiprop=url&format=json`);
      const imgPages = imgInfoRes.data.query.pages;
      for (const key in imgPages) {
        if (imgPages[key].imageinfo && imgPages[key].imageinfo[0].url) {
          urls.push(imgPages[key].imageinfo[0].url);
        }
      }
    }
    return urls;
  } catch (e) {
    return [];
  }
}

async function run() {
  console.log('Đang cào dữ liệu ảnh thật từ Wikipedia cho 90 địa danh...');
  
  // Require current data
  const { PROVINCES_AND_LANDMARKS, IMAGE_POOLS } = require('./vietnam-data');
  const fallbackPool = [...new Set(IMAGE_POOLS.LANDMARK)];

  for (const prov of PROVINCES_AND_LANDMARKS) {
    for (const lm of prov.landmarks) {
      if (lm.thumbnail && lm.gallery && lm.gallery.length === 4) {
        continue; // Already has images
      }
      
      console.log(`- Đang tìm ảnh cho: ${lm.name} (${prov.province})...`);
      let images = await getWikiImages(lm.name);
      
      if (images.length < 5) {
        // Try searching with province
        const moreImages = await getWikiImages(`${lm.name} ${prov.province}`);
        images = [...new Set([...images, ...moreImages])];
      }
      
      // Fallback
      images = [...new Set([...images, ...fallbackPool])].slice(0, 5);
      if (images.length < 5) throw new Error('Fallback pool needs at least 5 distinct images');

      lm.thumbnail = images[0];
      lm.gallery = images.slice(1, 5);
      await new Promise(r => setTimeout(r, 200)); // Sleep to respect API rate limits
    }
  }

  await migrateLandmarkImages(PROVINCES_AND_LANDMARKS);
  const fileContent = fs.readFileSync(VIETNAM_DATA_PATH, 'utf-8');
  const updated = replaceLandmarkBlock(fileContent, PROVINCES_AND_LANDMARKS);
  const temporary = `${VIETNAM_DATA_PATH}.tmp`;
  fs.writeFileSync(temporary, updated, 'utf-8');
  fs.renameSync(temporary, VIETNAM_DATA_PATH);
  console.log('✅ Đã cập nhật địa danh với ảnh Cloudinary; giữ nguyên các pool và helper.');
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
