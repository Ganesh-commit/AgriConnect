const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const products = require('../data/products');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Exact Wikipedia article titles for all 154 products in server/data/products.js
const PRODUCT_WIKI_MAP = {
  // 1. Vegetables
  'Tenali Farm Tomato': ['Tomato'],
  'Nellore Long Purple Brinjal': ['Eggplant'],
  'Andhra Bendakaya Okra': ['Okra'],
  'Coastal Ridge Gourd': ['Luffa acutangula', 'Luffa'],
  'Krishna Bottle Gourd': ['Calabash'],
  'Rayalaseema Bitter Gourd': ['Momordica charantia'],
  'Telangana Drumstick Moringa': ['Moringa oleifera'],
  'Guntur Cluster Beans': ['Guar'],
  'Guntur Green Chilli': ['Chili pepper', 'Capsicum annuum'],
  'Warangal Red Onion': ['Red onion', 'Onion'],
  'Kurnool Table Potato': ['Potato'],

  // 2. Fruits
  'Anakapalle Robusta Banana': ['Cavendish banana', 'Banana'],
  'Banginapalli Mango': ['Banganapalle', 'Mango'],
  'Totapuri Mango': ['Totapuri', 'Mango'],
  'Coastal Rasalu Mango': ['Alphonso (mango)', 'Mango'],
  'Krishna Red Lady Papaya': ['Papaya'],
  'Taiwan Pink Guava': ['Common guava', 'Guava'],
  'Bhagwa Pomegranate': ['Pomegranate'],
  'Mosambi Sweet Lime': ['Citrus limetta', 'Sweet lemon'],
  'Kurnool Watermelon': ['Watermelon'],
  'Nuzvid Sapota Chikoo': ['Manilkara zapota'],
  'East Godavari Coconut': ['Coconut'],

  // 3. Grains & Cereals
  'Sona Masoori Rice': ['Sona Masuri', 'White rice', 'Rice'],
  'BPT 5204 Rice': ['Rice', 'Paddy field'],
  'Andhra Premium Basmati Rice': ['Basmati'],
  'Punjab Sharbati Wheat': ['Common wheat', 'Wheat'],
  'Nizamabad Yellow Maize': ['Maize'],
  'Kurnool White Jowar': ['Sorghum bicolor', 'Commercial sorghum'],
  'Telangana Pearl Bajra': ['Pearl millet'],
  'Finger Millet Ragi': ['Eleusine coracana'],
  'Rajasthan Barley': ['Barley'],
  'Paddy Rice Grain': ['Paddy field', 'Rice'],
  'Organic Red Rice': ['Red rice', 'Brown rice'],

  // 4. Pulses
  'Kandi Pappu Red Gram': ['Pigeon pea'],
  'Minapappu Black Gram': ['Vigna mungo'],
  'Pesalu Green Gram': ['Mung bean'],
  'Desi Senagalu Chickpea': ['Chickpea'],
  'Rayalaseema Horse Gram': ['Macrotyloma uniflorum', 'Pulse (legume)'],
  'Telangana Cowpea Alasandalu': ['Black-eyed pea', 'Cowpea'],
  'Masoor Red Lentils': ['Lentil'],
  'Kabuli Chana Chickpeas': ['Chickpea'],
  'Andhra Toor Dal': ['Dal', 'Pigeon pea'],
  'Green Peas Dried': ['Split pea', 'Pea'],
  'Moth Bean Matki': ['Vigna aconitifolia', 'Mung bean'],

  // 5. Spices
  'Guntur Sannam Red Chilli': ['Guntur chilli', 'Cayenne pepper', 'Chili pepper'],
  'Guntur Teja Dry Chilli': ['Dried chili', 'Chili pepper'],
  'Nizamabad Turmeric Fingers': ['Turmeric'],
  'Dhaniyalu Coriander Seeds': ['Coriander'],
  'Cumin Jeera Seeds': ['Cumin'],
  'Malabar Black Pepper': ['Black pepper'],
  'Green Cardamom Elaichi': ['True cardamom', 'Cardamom'],
  'Cloves Lavang': ['Clove'],
  'Tamarind Imli': ['Tamarind'],
  'Fresh Ginger Rhizomes': ['Ginger'],
  'Indian Garlic Bulbs': ['Garlic'],

  // 6. Oilseeds
  'Anantapur Groundnut Kernels': ['Peanut'],
  'Black Sesame Nuvvulu': ['Sesame'],
  'White Sesame Seeds': ['Sesame seed', 'Sesame'],
  'Hybrid Sunflower Seeds': ['Sunflower seed', 'Common sunflower'],
  'Soybean Yellow Seeds': ['Soybean'],
  'Castor Seeds': ['Ricinus', 'Castor oil'],
  'Rajasthan Mustard Seeds': ['Mustard seed', 'Brassica juncea'],
  'Safflower Kusum Seeds': ['Safflower'],
  'Coconut Copra': ['Copra', 'Coconut'],
  'Linseed Flax Seeds': ['Flax'],
  'Niger Seed Ramtil': ['Guizotia abyssinica', 'Sunflower seed'],

  // 7. Millets
  'Foxtail Millet Korralu': ['Foxtail millet'],
  'Little Millet Samalu': ['Panicum sumatrense', 'Millet'],
  'Kodo Millet Arikelu': ['Paspalum scrobiculatum', 'Millet'],
  'Barnyard Millet Udalu': ['Echinochloa esculenta', 'Millet'],
  'Proso Millet Varigalu': ['Proso millet'],
  'Finger Millet Ragi Flour Crop': ['Eleusine coracana'],
  'Pearl Millet Sajjalu': ['Pearl millet'],
  'Sorghum Jonna': ['Sorghum bicolor'],
  'Brown Top Millet': ['Millet'],
  'Organic Foxtail Millet': ['Foxtail millet'],
  'Deccan Mixed Millet Grain': ['Millet'],

  // 8. Dairy & Eggs
  'Farm Fresh Cow Milk': ['Milk'],
  'Buffalo Milk': ['Water buffalo', 'Milk'],
  'Cultured Cow Ghee': ['Clarified butter', 'Butter'],
  'Farm Churned Butter': ['Butter'],
  'Fresh Paneer': ['Paneer'],
  'Homemade Curd': ['Curd (India)', 'Yogurt'],
  'Country Hen Eggs': ['Egg as food', 'Egg'],
  'White Shell Eggs': ['Egg as food'],
  'A2 Cow Milk': ['Dairy cattle', 'Milk'],
  'Buffalo Bilona Ghee': ['Clarified butter', 'Butter'],
  'Fresh Buttermilk': ['Chaas', 'Buttermilk'],

  // 9. Flowers
  'Guntur Marigold': ['Tagetes', 'Tagetes erecta'],
  'Mysore Jasmine Mallige': ['Jasminum sambac', 'Jasmine'],
  'Farm Red Rose': ['Garden roses', 'Rose'],
  'Chrysanthemum Sevanti': ['Chrysanthemum'],
  'Crossandra Kanakambaram': ['Crossandra infundibuliformis', 'Tagetes'],
  'Tuberose Rajanigandha': ['Agave amica', 'Jasmine'],
  'Temple Lotus Flowers': ['Nelumbo nucifera'],
  'Pink Gerbera': ['Gerbera'],
  'Jasmine Mogra Buds': ['Jasminum sambac'],
  'Yellow Gladiolus': ['Gladiolus'],
  'Andhra Aster Flowers': ['Aster (genus)', 'Callistephus'],

  // 10. Cash Crops
  'Warangal Long Staple Cotton': ['Cotton'],
  'Krishna Sugarcane': ['Sugarcane'],
  'Virginia Flue Cured Tobacco': ['Nicotiana tabacum', 'Tobacco'],
  'Andhra Jute Fibre': ['Jute'],
  'Araku Arabica Coffee': ['Coffea arabica', 'Coffee bean'],
  'Nilgiri Tea Leaves': ['Camellia sinensis', 'Tea'],
  'Indigo Dye Crop': ['Indigofera tinctoria'],
  'Pattada Silk Cocoons': ['Bombyx mori', 'Silk'],
  'Castor Commercial Crop': ['Ricinus'],
  'Andhra Betel Leaf Bundles': ['Betel'],
  'Commercial Bamboo Poles': ['Bamboo'],

  // 11. Nuts & Dry Fruits
  'Palasa Cashew Kernels W320': ['Cashew'],
  'California Almonds': ['Almond'],
  'Kashmir Walnut Kernels': ['Walnut'],
  'Dry Coconut Copra': ['Copra', 'Coconut'],
  'Seedless Dates': ['Date palm'],
  'Thompson Raisins': ['Raisin'],
  'Pistachio Kernels': ['Pistachio'],
  'Fox Nuts Makhana': ['Euryale ferox'],
  'Anjeer Dried Figs': ['Fig'],
  'Dried Apricots': ['Dried apricot', 'Apricot'],
  'Roasted Groundnut Kernels': ['Peanut'],

  // 12. Honey & Jaggery
  'Raw Forest Honey': ['Honey'],
  'Organic Sugarcane Jaggery': ['Jaggery'],
  'Palm Jaggery Tati Bellam': ['Palm sugar', 'Jaggery'],
  'Nallamala Wild Honey': ['Honeycomb', 'Honey'],
  'Coconut Flower Honey': ['Honey'],
  'Liquid Forest Honey': ['Honey'],
  'Date Palm Jaggery': ['Date palm', 'Jaggery'],
  'Jaggery Powder Bellam Podi': ['Jaggery', 'Brown sugar'],
  'Organic Ginger Jaggery': ['Jaggery'],
  'Multifloral Apiary Honey': ['Beekeeping', 'Honey'],
  'Traditional Sugarcane Syrup': ['Sugarcane juice', 'Molasses'],

  // 13. Seeds & Saplings
  'Hybrid Tomato Seeds': ['Tomato', 'Seed'],
  'Green Chilli Hybrid Seeds': ['Chili pepper'],
  'Banginapalli Mango Graft': ['Mangifera indica', 'Mango'],
  'Coconut Tall Sapling': ['Coconut'],
  'Curry Leaf Plant': ['Curry tree'],
  'Papaya Red Lady Seedlings': ['Papaya'],
  'Sona Masoori Paddy Seeds': ['Paddy field'],
  'Foxtail Millet Seeds': ['Foxtail millet'],
  'Groundnut Seed Kernels': ['Peanut'],
  'Drumstick Tree Sapling': ['Moringa oleifera'],
  'Neem Tree Sapling': ['Azadirachta indica'],

  // 14. Organic Products
  'Organic Vermicompost': ['Vermicompost', 'Compost'],
  'Organic Sona Masoori Rice': ['Brown rice', 'Rice'],
  'Organic Turmeric Powder': ['Turmeric'],
  'Cold Pressed Groundnut Oil': ['Peanut oil'],
  'Organic Red Chilli Powder': ['Chili powder'],
  'Organic Cow Dung Manure': ['Cow dung', 'Compost'],
  'Organic Green Gram': ['Mung bean'],
  'Organic Millet Flour': ['Eleusine coracana', 'Millet'],
  'Organic Coconut Oil': ['Coconut oil'],
  'Organic Neem Cake': ['Azadirachta indica'],
  'Organic Fresh Turmeric': ['Turmeric']
};

const fetchWikiImagesBatch = async (titles) => {
  const uniqueTitles = [...new Set(titles)];
  const results = {};
  const chunkSize = 40;

  for (let i = 0; i < uniqueTitles.length; i += chunkSize) {
    const chunk = uniqueTitles.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      action: 'query',
      prop: 'pageimages',
      format: 'json',
      piprop: 'thumbnail|original',
      pithumbsize: '800',
      redirects: '1',
      titles: chunk.join('|')
    });

    const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgriConnectMarketplace/1.0 (https://agriconnect.local; support@agriconnect.local)'
      }
    });

    if (!res.ok) {
      console.warn(`Wikipedia API status: ${res.status}`);
      continue;
    }

    const data = await res.json();
    const pages = data?.query?.pages || {};
    const redirects = data?.query?.redirects || [];
    const normalized = data?.query?.normalized || [];

    // Map final page title -> image url
    const titleToImg = {};
    for (const page of Object.values(pages)) {
      const imgUrl = page?.thumbnail?.source || page?.original?.source;
      if (imgUrl && page?.title) {
        titleToImg[page.title] = imgUrl;
      }
    }

    // Resolve redirects and normalizations back to requested title
    for (const reqTitle of chunk) {
      let current = reqTitle;
      const norm = normalized.find((n) => n.from === current);
      if (norm) current = norm.to;
      const redir = redirects.find((r) => r.from === current);
      if (redir) current = redir.to;
      if (titleToImg[current]) {
        results[reqTitle] = titleToImg[current];
      } else if (titleToImg[reqTitle]) {
        results[reqTitle] = titleToImg[reqTitle];
      }
    }
  }

  return results;
};

const syncProductImagesAndCrops = async () => {
  const imageMapPath = path.join(__dirname, '..', 'data', 'imageMap.json');
  let imageMap = {};
  if (fs.existsSync(imageMapPath)) {
    try {
      imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'));
    } catch {
      imageMap = {};
    }
  }

  const needsFetch = products.some(
    (p) => !imageMap[p.name]?.url || imageMap[p.name].url.includes('placeholder-crop.jpg')
  );

  if (needsFetch) {
    const allTitles = [];
    for (const prod of products) {
      const candidates = PRODUCT_WIKI_MAP[prod.name] || [prod.name];
      allTitles.push(...candidates);
    }

    console.log(`[Images] Fetching item-specific images for ${products.length} products from Wikimedia Commons...`);
    const wikiImgByTitle = await fetchWikiImagesBatch(allTitles);

    let resolvedCount = 0;
    for (const prod of products) {
      const candidates = PRODUCT_WIKI_MAP[prod.name] || [prod.name];
      let matchedUrl = null;
      for (const title of candidates) {
        if (wikiImgByTitle[title]) {
          matchedUrl = wikiImgByTitle[title];
          break;
        }
      }

      if (matchedUrl) {
        resolvedCount++;
        imageMap[prod.name] = {
          url: matchedUrl,
          photographer: 'Wikimedia Commons',
          photographerUrl: 'https://commons.wikimedia.org',
          pexelsUrl: matchedUrl,
          query: prod.imageQuery
        };
      } else if (!imageMap[prod.name]) {
        imageMap[prod.name] = {
          url: '/public/placeholder-crop.jpg',
          photographer: 'Local placeholder',
          photographerUrl: '',
          pexelsUrl: '',
          query: prod.imageQuery
        };
      }
    }

    fs.writeFileSync(imageMapPath, JSON.stringify(imageMap, null, 2));
    console.log(`[Images] Saved ${resolvedCount}/${products.length} item-specific images to ${imageMapPath}`);
  }

  const Crop = require('../models/Crop');
  const User = require('../models/User');
  const farmer =
    (await User.findOne({ email: 'ramesh.farmer@agriconnect.com' })) ||
    (await User.findOne({ role: 'farmer' }));

  const existingCrops = await Crop.find({});
  const existingNames = new Set(existingCrops.map((c) => c.name));

  let updatedCount = 0;
  for (const crop of existingCrops) {
    const imgRecord = imageMap[crop.name];
    if (
      imgRecord &&
      imgRecord.url &&
      (!crop.images?.[0] || crop.images[0].includes('placeholder-crop.jpg') || crop.images[0] !== imgRecord.url)
    ) {
      crop.images = [imgRecord.url];
      crop.imageAttribution = {
        photographer: imgRecord.photographer || '',
        photographerUrl: imgRecord.photographerUrl || '',
        sourceUrl: imgRecord.pexelsUrl || ''
      };
      await crop.save();
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    console.log(`[Images] Updated ${updatedCount} existing crops in MongoDB with item-specific images.`);
  }

  if (farmer) {
    const missingProducts = products.filter((p) => !existingNames.has(p.name));
    if (missingProducts.length > 0) {
      const toInsert = missingProducts.map((p, idx) => {
        const imgRecord = imageMap[p.name];
        return {
          farmer: farmer._id,
          name: p.name,
          category: p.category,
          quantity: 200 + (idx % 15) * 25,
          unit: p.unit || 'kg',
          pricePerUnit: Math.round((p.minPrice + p.maxPrice) / 2),
          location: farmer.location || {
            village: 'Tenali',
            district: 'Guntur',
            state: 'Andhra Pradesh'
          },
          geoLocation: {
            type: 'Point',
            coordinates: [80.64 + (idx % 8) * 0.02, 16.24 + (idx % 6) * 0.02]
          },
          images: [imgRecord?.url || '/public/placeholder-crop.jpg'],
          imageAttribution: {
            photographer: imgRecord?.photographer || '',
            photographerUrl: imgRecord?.photographerUrl || '',
            sourceUrl: imgRecord?.pexelsUrl || ''
          },
          description: p.description,
          harvestDate: new Date(),
          status: 'available',
          isSeed: true
        };
      });
      await Crop.insertMany(toInsert);
      console.log(`[Images] Inserted ${toInsert.length} additional catalog crops with item-specific images (total: ${existingCrops.length + toInsert.length}).`);
    }
  }
};

module.exports = { syncProductImagesAndCrops, PRODUCT_WIKI_MAP };

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB()
    .then(() => syncProductImagesAndCrops())
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('Failed to populate crop images:', err);
      process.exit(1);
    });
}
