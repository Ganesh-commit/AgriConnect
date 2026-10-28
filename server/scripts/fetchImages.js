const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const products = require('../data/products');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dataDir = path.join(__dirname, '..', 'data');
const imageMapPath = path.join(dataDir, 'imageMap.json');
const requestLogPath = path.join(dataDir, '.pexels-request-log.json');
const fallbackImage = '/public/placeholder-crop.jpg';
const hourInMilliseconds = 60 * 60 * 1000;
const requestsPerHour = 200;
let requestTimestamps = [];
const categoryQueries = {
  'Vegetables': 'fresh vegetables farm produce',
  'Fruits': 'fresh fruit harvest',
  'Grains & Cereals': 'grain cereal harvest',
  'Pulses': 'dry beans pulses harvest',
  'Spices': 'spice crop harvest',
  'Oilseeds': 'oilseed crop harvest',
  'Millets': 'millet grain harvest',
  'Dairy & Eggs': 'farm dairy milk eggs',
  'Flowers': 'fresh cut flowers farm',
  'Cash Crops': 'cash crop farm harvest',
  'Nuts & Dry Fruits': 'nuts dry fruit harvest',
  'Honey & Jaggery': 'raw honey jaggery farm',
  'Seeds & Saplings': 'farm seeds saplings nursery',
  'Organic Products': 'organic farm produce'
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const waitForRequestSlot = async () => {
  while (true) {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < hourInMilliseconds);
    if (requestTimestamps.length < requestsPerHour) break;
    await delay(requestTimestamps[0] + hourInMilliseconds - now + 50);
  }

  await delay(300);
  requestTimestamps.push(Date.now());
  fs.writeFileSync(requestLogPath, `${JSON.stringify(requestTimestamps)}\n`);
};

const searchPexels = async (query, apiKey) => {
  await waitForRequestSlot();
  const params = new URLSearchParams({ query, per_page: '5', orientation: 'landscape' });
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey }
  });

  if (!response.ok) {
    throw new Error(`Pexels request failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.photos.find((photo) => photo.width >= photo.height && photo.src?.large) || null;
};

const toImageRecord = (photo, query) => ({
  url: photo.src.large,
  photographer: photo.photographer,
  photographerUrl: photo.photographer_url,
  pexelsUrl: photo.url,
  query
});

const uploadToCloudinary = async (record, productName) => {
  const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (!hasCloudinaryConfig) return record;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  const uploaded = await cloudinary.uploader.upload(record.url, {
    folder: 'agriconnect/crops',
    public_id: slugify(productName),
    overwrite: true,
    resource_type: 'image'
  });

  return { ...record, url: uploaded.secure_url, cloudinaryPublicId: uploaded.public_id };
};

const fetchImages = async () => {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey === 'your_pexels_api_key_here') {
    throw new Error('Set PEXELS_API_KEY in server/.env before running npm run fetch-images.');
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const imageMap = fs.existsSync(imageMapPath)
    ? JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))
    : {};
  requestTimestamps = fs.existsSync(requestLogPath)
    ? JSON.parse(fs.readFileSync(requestLogPath, 'utf8'))
    : [];
  requestTimestamps = requestTimestamps.filter((timestamp) => Date.now() - timestamp < hourInMilliseconds);
  const categoryFallbacks = new Map();
  const missing = products.filter((product) => !imageMap[product.name]);
  console.log(`Fetching images for ${missing.length} uncached products...`);

  for (const [index, product] of missing.entries()) {
    let photo = await searchPexels(product.imageQuery, apiKey);
    let record = photo ? toImageRecord(photo, product.imageQuery) : null;

    if (!record) {
      const fallbackQuery = categoryQueries[product.category] || product.category;
      if (!categoryFallbacks.has(product.category)) {
        photo = await searchPexels(fallbackQuery, apiKey);
        categoryFallbacks.set(
          product.category,
          photo ? toImageRecord(photo, fallbackQuery) : null
        );
      }
      record = categoryFallbacks.get(product.category);
    }

    if (record) {
      imageMap[product.name] = await uploadToCloudinary(record, product.name);
    } else {
      imageMap[product.name] = {
        url: fallbackImage,
        photographer: 'Local placeholder',
        photographerUrl: '',
        pexelsUrl: '',
        query: product.imageQuery
      };
    }

    fs.writeFileSync(imageMapPath, `${JSON.stringify(imageMap, null, 2)}\n`);
    console.log(`[${index + 1}/${missing.length}] ${product.name}: ${imageMap[product.name].url}`);
  }

  console.log(`Image cache saved to ${imageMapPath}`);
};

fetchImages().catch((error) => {
  console.error(`Image fetch failed: ${error.message}`);
  process.exitCode = 1;
});