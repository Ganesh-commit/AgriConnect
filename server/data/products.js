const CATEGORY_METHODS = {
  Vegetables: 'season-appropriate planting, careful irrigation and hand-sorting',
  Fruits: 'orchard care, natural ripening checks and gentle hand-picking',
  'Grains & Cereals': 'crop rotation, timely harvest and clean sun-drying',
  Pulses: 'soil-building rotation and careful drying after harvest',
  Spices: 'traditional cultivation, clean curing and shade-conscious drying',
  Oilseeds: 'well-drained fields, timely harvesting and clean seed sorting',
  Millets: 'rain-fed, low-input cultivation and careful threshing',
  'Dairy & Eggs': 'clean housing, hygienic milking and responsible animal care',
  Flowers: 'morning hand-picking and careful shade packing',
  'Cash Crops': 'field-wise crop care and careful grading at harvest',
  'Nuts & Dry Fruits': 'careful harvesting, sun-drying and moisture-safe storage',
  'Honey & Jaggery': 'small-batch preparation and traditional, careful processing',
  'Seeds & Saplings': 'healthy nursery practices, selected parent stock and careful packing',
  'Organic Products': 'organic inputs, crop rotation and careful small-batch processing'
};

const categoryProducts = [
  ['Vegetables', [
    ['Tenali Farm Tomato', 'fresh red tomatoes on vine', 'kg', 18, 42],
    ['Nellore Long Purple Brinjal', 'long purple eggplant brinjal', 'kg', 24, 58],
    ['Andhra Bendakaya Okra', 'fresh green okra lady finger', 'kg', 30, 75],
    ['Coastal Ridge Gourd', 'fresh ridge gourd vegetables', 'kg', 25, 65],
    ['Krishna Bottle Gourd', 'green bottle gourd lauki', 'kg', 18, 45],
    ['Rayalaseema Bitter Gourd', 'fresh bitter melon karela', 'kg', 30, 85],
    ['Telangana Drumstick Moringa', 'fresh moringa drumstick pods', 'kg', 45, 120],
    ['Guntur Cluster Beans', 'fresh cluster beans guar', 'kg', 28, 70],
    ['Guntur Green Chilli', 'fresh green chilli peppers', 'kg', 35, 100],
    ['Warangal Red Onion', 'red onions harvest', 'kg', 18, 48],
    ['Kurnool Table Potato', 'fresh potatoes farm', 'kg', 16, 38]
  ]],
  ['Fruits', [
    ['Anakapalle Robusta Banana', 'fresh banana bunches', 'kg', 18, 42],
    ['Banginapalli Mango', 'banganapalli mango fruit', 'kg', 55, 150],
    ['Totapuri Mango', 'totapuri mango green fruit', 'kg', 28, 75],
    ['Coastal Rasalu Mango', 'rasalu mango variety', 'kg', 45, 120],
    ['Krishna Red Lady Papaya', 'ripe papaya fruit', 'kg', 18, 42],
    ['Taiwan Pink Guava', 'pink guava fruit', 'kg', 30, 85],
    ['Bhagwa Pomegranate', 'fresh bhagwa pomegranate', 'kg', 75, 190],
    ['Mosambi Sweet Lime', 'sweet lime mosambi fruit', 'kg', 28, 80],
    ['Kurnool Watermelon', 'watermelon fresh harvest', 'kg', 12, 35],
    ['Nuzvid Sapota Chikoo', 'sapota chikoo fruit', 'kg', 30, 75],
    ['East Godavari Coconut', 'fresh whole coconuts', 'piece', 18, 42]
  ]],
  ['Grains & Cereals', [
    ['Sona Masoori Rice', 'sona masoori rice grains', 'kg', 38, 68],
    ['BPT 5204 Rice', 'BPT 5204 rice grain', 'kg', 42, 76],
    ['Andhra Premium Basmati Rice', 'basmati rice long grain', 'kg', 75, 180],
    ['Punjab Sharbati Wheat', 'sharbati wheat grains', 'kg', 26, 48],
    ['Nizamabad Yellow Maize', 'dried yellow maize corn kernels', 'kg', 18, 34],
    ['Kurnool White Jowar', 'white sorghum jowar grains', 'kg', 30, 65],
    ['Telangana Pearl Bajra', 'pearl millet bajra grains', 'kg', 28, 62],
    ['Finger Millet Ragi', 'finger millet ragi grains', 'kg', 32, 72],
    ['Rajasthan Barley', 'barley grain harvest', 'kg', 24, 46],
    ['Paddy Rice Grain', 'unmilled paddy rice field', 'quintal', 1800, 2900],
    ['Organic Red Rice', 'organic red rice grains', 'kg', 60, 130]
  ]],
  ['Pulses', [
    ['Kandi Pappu Red Gram', 'red gram pigeon pea lentils', 'kg', 90, 180],
    ['Minapappu Black Gram', 'black gram urad beans', 'kg', 95, 190],
    ['Pesalu Green Gram', 'green gram mung beans', 'kg', 85, 170],
    ['Desi Senagalu Chickpea', 'desi chickpea brown chana', 'kg', 55, 120],
    ['Rayalaseema Horse Gram', 'horse gram kulthi beans', 'kg', 65, 140],
    ['Telangana Cowpea Alasandalu', 'cowpea black eyed peas', 'kg', 70, 145],
    ['Masoor Red Lentils', 'red lentils masoor dal', 'kg', 75, 155],
    ['Kabuli Chana Chickpeas', 'kabuli chana chickpeas', 'kg', 70, 150],
    ['Andhra Toor Dal', 'toor dal split pigeon peas', 'kg', 115, 220],
    ['Green Peas Dried', 'dried green peas pulses', 'kg', 55, 115],
    ['Moth Bean Matki', 'moth beans matki pulse', 'kg', 75, 150]
  ]],
  ['Spices', [
    ['Guntur Sannam Red Chilli', 'guntur sannam red chilli peppers', 'kg', 150, 320],
    ['Guntur Teja Dry Chilli', 'teja dry red chilli pods', 'kg', 170, 380],
    ['Nizamabad Turmeric Fingers', 'fresh turmeric roots fingers', 'kg', 75, 180],
    ['Dhaniyalu Coriander Seeds', 'whole coriander seeds spice', 'kg', 65, 145],
    ['Cumin Jeera Seeds', 'cumin jeera seeds', 'kg', 180, 420],
    ['Malabar Black Pepper', 'black peppercorns spice', 'kg', 350, 850],
    ['Green Cardamom Elaichi', 'green cardamom pods', 'kg', 900, 2400],
    ['Cloves Lavang', 'whole cloves spice', 'kg', 650, 1500],
    ['Tamarind Imli', 'tamarind pods fruit', 'kg', 45, 130],
    ['Fresh Ginger Rhizomes', 'fresh ginger roots harvest', 'kg', 35, 100],
    ['Indian Garlic Bulbs', 'fresh garlic bulbs cloves', 'kg', 60, 180]
  ]],
  ['Oilseeds', [
    ['Anantapur Groundnut Kernels', 'groundnut peanut kernels harvest', 'kg', 65, 125],
    ['Black Sesame Nuvvulu', 'black sesame seeds', 'kg', 110, 230],
    ['White Sesame Seeds', 'white sesame seeds harvest', 'kg', 100, 210],
    ['Hybrid Sunflower Seeds', 'sunflower seeds oil crop', 'kg', 45, 95],
    ['Soybean Yellow Seeds', 'yellow soybean seeds', 'kg', 38, 78],
    ['Castor Seeds', 'castor seeds oil crop', 'kg', 55, 115],
    ['Rajasthan Mustard Seeds', 'mustard seeds harvest', 'kg', 50, 95],
    ['Safflower Kusum Seeds', 'safflower seeds oil crop', 'kg', 60, 125],
    ['Coconut Copra', 'dried coconut copra', 'kg', 110, 220],
    ['Linseed Flax Seeds', 'linseed flax seeds', 'kg', 65, 135],
    ['Niger Seed Ramtil', 'niger seed oil crop', 'kg', 75, 150]
  ]],
  ['Millets', [
    ['Foxtail Millet Korralu', 'foxtail millet grains', 'kg', 55, 115],
    ['Little Millet Samalu', 'little millet grains', 'kg', 60, 125],
    ['Kodo Millet Arikelu', 'kodo millet grains', 'kg', 55, 120],
    ['Barnyard Millet Udalu', 'barnyard millet grains', 'kg', 65, 135],
    ['Proso Millet Varigalu', 'proso millet grains', 'kg', 50, 105],
    ['Finger Millet Ragi Flour Crop', 'finger millet ragi grain harvest', 'kg', 32, 75],
    ['Pearl Millet Sajjalu', 'pearl millet bajra grains', 'kg', 28, 62],
    ['Sorghum Jonna', 'sorghum jowar grains', 'kg', 30, 68],
    ['Brown Top Millet', 'brown top millet grains', 'kg', 58, 120],
    ['Organic Foxtail Millet', 'organic foxtail millet grains', 'kg', 75, 145],
    ['Deccan Mixed Millet Grain', 'mixed millets grain harvest', 'kg', 48, 100]
  ]],
  ['Dairy & Eggs', [
    ['Farm Fresh Cow Milk', 'fresh cow milk glass dairy farm', 'litre', 42, 68],
    ['Buffalo Milk', 'fresh buffalo milk dairy', 'litre', 55, 88],
    ['Cultured Cow Ghee', 'traditional cow ghee jar', 'kg', 650, 1100],
    ['Farm Churned Butter', 'fresh farm butter dairy', 'kg', 280, 520],
    ['Fresh Paneer', 'fresh paneer cheese dairy', 'kg', 240, 420],
    ['Homemade Curd', 'fresh plain curd yogurt', 'kg', 55, 100],
    ['Country Hen Eggs', 'country hen eggs brown', 'dozen', 85, 150],
    ['White Shell Eggs', 'farm fresh white eggs', 'dozen', 65, 120],
    ['A2 Cow Milk', 'A2 cow milk fresh dairy', 'litre', 65, 110],
    ['Buffalo Bilona Ghee', 'buffalo bilona ghee dairy', 'kg', 700, 1250],
    ['Fresh Buttermilk', 'fresh buttermilk dairy drink', 'litre', 25, 55]
  ]],
  ['Flowers', [
    ['Guntur Marigold', 'fresh orange marigold flowers', 'kg', 35, 120],
    ['Mysore Jasmine Mallige', 'fresh jasmine flowers buds', 'kg', 250, 900],
    ['Farm Red Rose', 'fresh red roses flower stems', 'dozen', 40, 140],
    ['Chrysanthemum Sevanti', 'white chrysanthemum flowers', 'kg', 40, 150],
    ['Crossandra Kanakambaram', 'crossandra orange flowers', 'kg', 180, 650],
    ['Tuberose Rajanigandha', 'tuberose flower stems', 'dozen', 45, 160],
    ['Temple Lotus Flowers', 'fresh pink lotus flowers', 'dozen', 80, 240],
    ['Pink Gerbera', 'pink gerbera flowers bunch', 'dozen', 55, 180],
    ['Jasmine Mogra Buds', 'mogra jasmine flower buds', 'kg', 220, 850],
    ['Yellow Gladiolus', 'yellow gladiolus cut flowers', 'dozen', 50, 170],
    ['Andhra Aster Flowers', 'fresh aster flowers bunch', 'kg', 60, 210]
  ]],
  ['Cash Crops', [
    ['Warangal Long Staple Cotton', 'raw cotton boll harvest', 'quintal', 6500, 8500],
    ['Krishna Sugarcane', 'fresh sugarcane stalk harvest', 'ton', 2800, 4200],
    ['Virginia Flue Cured Tobacco', 'tobacco leaves curing barn', 'kg', 120, 260],
    ['Andhra Jute Fibre', 'natural jute fibre bundles', 'kg', 45, 90],
    ['Araku Arabica Coffee', 'arabica coffee cherries beans', 'kg', 180, 460],
    ['Nilgiri Tea Leaves', 'fresh tea leaves harvest', 'kg', 90, 240],
    ['Indigo Dye Crop', 'indigo plant leaves farm', 'kg', 30, 85],
    ['Pattada Silk Cocoons', 'silkworm cocoons harvest', 'kg', 350, 750],
    ['Castor Commercial Crop', 'castor crop seed harvest', 'quintal', 5000, 10500],
    ['Andhra Betel Leaf Bundles', 'fresh betel leaves bundle', 'dozen', 35, 120],
    ['Commercial Bamboo Poles', 'bamboo poles farm harvest', 'piece', 80, 260]
  ]],
  ['Nuts & Dry Fruits', [
    ['Palasa Cashew Kernels W320', 'cashew nuts kernels W320', 'kg', 650, 1100],
    ['California Almonds', 'whole almonds dry fruits', 'kg', 700, 1400],
    ['Kashmir Walnut Kernels', 'walnut kernels dry fruits', 'kg', 650, 1500],
    ['Dry Coconut Copra', 'dry coconut copra whole', 'kg', 100, 220],
    ['Seedless Dates', 'seedless dates dry fruit', 'kg', 120, 320],
    ['Thompson Raisins', 'green raisins kishmish dry fruit', 'kg', 180, 420],
    ['Pistachio Kernels', 'pistachio nuts kernels', 'kg', 900, 1800],
    ['Fox Nuts Makhana', 'makhana fox nuts dry snack', 'kg', 450, 1100],
    ['Anjeer Dried Figs', 'dried figs anjeer fruit', 'kg', 500, 1200],
    ['Dried Apricots', 'dried apricot dry fruits', 'kg', 350, 900],
    ['Roasted Groundnut Kernels', 'roasted groundnut peanuts', 'kg', 100, 220]
  ]],
  ['Honey & Jaggery', [
    ['Raw Forest Honey', 'raw forest honey jar', 'kg', 280, 650],
    ['Organic Sugarcane Jaggery', 'organic sugarcane jaggery blocks', 'kg', 55, 120],
    ['Palm Jaggery Tati Bellam', 'palm jaggery blocks', 'kg', 110, 260],
    ['Nallamala Wild Honey', 'wild forest honeycomb honey', 'kg', 380, 850],
    ['Coconut Flower Honey', 'coconut blossom honey', 'kg', 350, 760],
    ['Liquid Forest Honey', 'raw liquid honey dipper', 'litre', 320, 720],
    ['Date Palm Jaggery', 'date palm jaggery gur', 'kg', 120, 280],
    ['Jaggery Powder Bellam Podi', 'jaggery powder natural', 'kg', 65, 140],
    ['Organic Ginger Jaggery', 'ginger jaggery natural blocks', 'kg', 90, 190],
    ['Multifloral Apiary Honey', 'multifloral apiary honey jar', 'kg', 260, 580],
    ['Traditional Sugarcane Syrup', 'traditional sugarcane syrup', 'litre', 80, 190]
  ]],
  ['Seeds & Saplings', [
    ['Hybrid Tomato Seeds', 'tomato seeds packet agriculture', 'kg', 900, 2600],
    ['Green Chilli Hybrid Seeds', 'green chilli seeds packet', 'kg', 1200, 3200],
    ['Banginapalli Mango Graft', 'mango graft sapling nursery', 'piece', 90, 260],
    ['Coconut Tall Sapling', 'young coconut palm sapling', 'piece', 80, 220],
    ['Curry Leaf Plant', 'curry leaf plant nursery pot', 'piece', 35, 100],
    ['Papaya Red Lady Seedlings', 'papaya seedlings nursery', 'piece', 8, 25],
    ['Sona Masoori Paddy Seeds', 'paddy rice seeds agriculture', 'kg', 45, 95],
    ['Foxtail Millet Seeds', 'foxtail millet seeds farming', 'kg', 90, 180],
    ['Groundnut Seed Kernels', 'groundnut seed kernels planting', 'kg', 75, 145],
    ['Drumstick Tree Sapling', 'moringa drumstick tree sapling', 'piece', 35, 120],
    ['Neem Tree Sapling', 'neem tree sapling nursery', 'piece', 30, 100]
  ]],
  ['Organic Products', [
    ['Organic Vermicompost', 'organic vermicompost compost soil', 'kg', 8, 24],
    ['Organic Sona Masoori Rice', 'organic sona masoori rice grains', 'kg', 65, 130],
    ['Organic Turmeric Powder', 'organic turmeric powder spice', 'kg', 220, 520],
    ['Cold Pressed Groundnut Oil', 'cold pressed groundnut oil bottle', 'litre', 220, 420],
    ['Organic Red Chilli Powder', 'organic red chilli powder', 'kg', 240, 560],
    ['Organic Cow Dung Manure', 'organic cow dung manure fertilizer', 'kg', 5, 18],
    ['Organic Green Gram', 'organic mung beans green gram', 'kg', 110, 230],
    ['Organic Millet Flour', 'organic millet flour whole grain', 'kg', 75, 160],
    ['Organic Coconut Oil', 'organic cold pressed coconut oil', 'litre', 260, 520],
    ['Organic Neem Cake', 'organic neem cake fertilizer', 'kg', 28, 70],
    ['Organic Fresh Turmeric', 'organic fresh turmeric roots', 'kg', 95, 220]
  ]]
];

const products = categoryProducts.flatMap(([category, entries]) =>
  entries.map(([name, imageQuery, unit, minPrice, maxPrice]) => ({
    name,
    category,
    imageQuery,
    unit,
    minPrice,
    maxPrice,
    description: `I offer fresh ${name}, raised or prepared with ${CATEGORY_METHODS[category]}. It is carefully selected at the right stage to preserve the character of this local variety and reach your market in good condition.`
  }))
);

module.exports = products;