const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Crop = require('./models/Crop');
const Order = require('./models/Order');
const Review = require('./models/Review');
const products = require('./data/products');

const DEMO_PASSWORD = 'AgriDemo#2026';
const FALLBACK_IMAGE = '/public/placeholder-crop.jpg';
const farmerProfiles = [
  ['Ramesh Patel', 'Tenali', 'Guntur', 'Andhra Pradesh', 80.64, 16.24],
  ['Lakshmi Reddy', 'Vijayawada', 'Krishna', 'Andhra Pradesh', 80.65, 16.51],
  ['Venkata Subbaiah', 'Nandyal', 'Kurnool', 'Andhra Pradesh', 78.48, 15.48],
  ['Kavitha Goud', 'Guntakal', 'Anantapur', 'Andhra Pradesh', 77.37, 15.17],
  ['Balaraju Naik', 'Hanamkonda', 'Warangal', 'Telangana', 79.58, 17.99],
  ['Mohammed Salim', 'Huzurabad', 'Karimnagar', 'Telangana', 79.20, 18.20],
  ['Suresh Naidu', 'Nashik Road', 'Nashik', 'Maharashtra', 73.79, 19.99],
  ['Gurpreet Singh', 'Jagraon', 'Ludhiana', 'Punjab', 75.47, 30.78],
  ['Anjali Rao', 'Punganur', 'Chittoor', 'Andhra Pradesh', 78.58, 13.36],
  ['Srinivas Chary', 'Rajahmundry', 'East Godavari', 'Andhra Pradesh', 81.78, 17.00],
  ['Padmaja Devi', 'Armoor', 'Nizamabad', 'Telangana', 78.29, 18.79],
  ['Ravi Kumar', 'Ongole', 'Prakasam', 'Andhra Pradesh', 80.05, 15.50],
  ['Venkat Reddy', 'Proddatur', 'Kadapa', 'Andhra Pradesh', 78.55, 14.75],
  ['Meena Subramanian', 'Kumbakonam', 'Thanjavur', 'Tamil Nadu', 79.39, 10.96],
  ['Prakash Jadhav', 'Baramati', 'Pune', 'Maharashtra', 74.58, 18.15],
  ['Mohan Lal', 'Chomu', 'Jaipur', 'Rajasthan', 75.72, 27.17],
  ['Rajesh Pawar', 'Mhow', 'Indore', 'Madhya Pradesh', 75.76, 22.55],
  ['Sunita Thakur', 'Theog', 'Shimla', 'Himachal Pradesh', 77.36, 31.12],
  ['Hari Babu', 'Anandapuram', 'Visakhapatnam', 'Andhra Pradesh', 83.00, 17.89],
  ['Nandini Gowda', 'Anekal', 'Bengaluru Urban', 'Karnataka', 77.70, 12.71]
];

const buyerProfiles = [
  ['Priya Sharma', 'Madhapur', 'Hyderabad', 'Telangana'],
  ['Karthik Varma', 'Gajuwaka', 'Visakhapatnam', 'Andhra Pradesh'],
  ['Ananya Roy', 'Indiranagar', 'Bengaluru Urban', 'Karnataka'],
  ['Rajesh Gupta', 'T Nagar', 'Chennai', 'Tamil Nadu'],
  ['Meena Krishnan', 'Benz Circle', 'Vijayawada', 'Andhra Pradesh'],
  ['Farhan Ahmed', 'Banjara Hills', 'Hyderabad', 'Telangana'],
  ['Simran Kaur', 'Model Town', 'Ludhiana', 'Punjab'],
  ['Amit Deshmukh', 'College Road', 'Nashik', 'Maharashtra'],
  ['Divya Nair', 'Kakkanad', 'Ernakulam', 'Kerala'],
  ['Vikram Sethi', 'Connaught Place', 'New Delhi', 'Delhi']
];

const orderStatuses = [
  'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
  'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
  'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
  'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted',
  'rejected', 'rejected', 'rejected', 'rejected',
  'cancelled', 'cancelled', 'cancelled', 'cancelled',
  'negotiating', 'negotiating', 'pending', 'accepted'
];

const randomInt = (minimum, maximum) =>
  Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

const randomItem = (items) => items[randomInt(0, items.length - 1)];

const shuffled = (items) => [...items].sort(() => Math.random() - 0.5);

const randomQuantity = (unit) => {
  const ranges = {
    kg: [40, 1400],
    quintal: [8, 180],
    ton: [2, 35],
    dozen: [8, 180],
    litre: [25, 700],
    piece: [20, 1600]
  };
  const [minimum, maximum] = ranges[unit] || ranges.kg;
  return randomInt(minimum, maximum);
};

const randomHarvestDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, 13));
  return date;
};

const getImageMap = () => {
  const imageMapPath = path.join(__dirname, 'data', 'imageMap.json');
  if (!fs.existsSync(imageMapPath)) return {};
  return JSON.parse(fs.readFileSync(imageMapPath, 'utf8'));
};

const cleanSeedData = async () => {
  await Promise.all([
    Review.deleteMany({ isSeed: true }),
    Order.deleteMany({ isSeed: true }),
    Crop.deleteMany({ isSeed: true }),
    User.deleteMany({ isSeed: true })
  ]);
};

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Removing only records marked isSeed: true...');
    await cleanSeedData();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const farmersToCreate = farmerProfiles.map((profile, index) => ({
      name: profile[0],
      email: `demo.farmer${String(index + 1).padStart(2, '0')}@agriconnect.com`,
      password: passwordHash,
      phone: `987${String(index + 1).padStart(7, '0')}`,
      role: 'farmer',
      location: { village: profile[1], district: profile[2], state: profile[3] },
      isVerified: index < 10,
      verificationStatus: index < 10 ? 'approved' : 'none',
      isSeed: true
    }));
    const buyersToCreate = buyerProfiles.map((profile, index) => ({
      name: profile[0],
      email: `demo.buyer${String(index + 1).padStart(2, '0')}@agriconnect.com`,
      password: passwordHash,
      phone: `887${String(index + 1).padStart(7, '0')}`,
      role: 'buyer',
      location: { village: profile[1], district: profile[2], state: profile[3] },
      isSeed: true
    }));
    const adminToCreate = {
      name: 'AgriConnect Demo Admin',
      email: 'demo.admin@agriconnect.com',
      password: passwordHash,
      phone: '7770000001',
      role: 'admin',
      location: { village: 'Hitech City', district: 'Hyderabad', state: 'Telangana' },
      isSeed: true
    };

    const [farmers, buyers, admins] = await Promise.all([
      User.insertMany(farmersToCreate),
      User.insertMany(buyersToCreate),
      User.insertMany([adminToCreate])
    ]);
    const imageMap = getImageMap();
    const cropData = products.flatMap((product) => {
      const imageRecord = imageMap[product.name];
      return shuffled(farmers).slice(0, 3).map((farmer) => {
        const profile = farmerProfiles.find((item, index) =>
          farmers[index]._id.equals(farmer._id)
        );
        const pricePerUnit = Number((product.minPrice +
          Math.random() * (product.maxPrice - product.minPrice)).toFixed(2));
        const imageUrl = imageRecord?.url || FALLBACK_IMAGE;

        return {
          farmer: farmer._id,
          name: product.name,
          category: product.category,
          quantity: randomQuantity(product.unit),
          unit: product.unit,
          pricePerUnit,
          location: farmer.location,
          geoLocation: {
            type: 'Point',
            coordinates: [profile[4], profile[5]]
          },
          images: [imageUrl],
          imageAttribution: {
            photographer: imageRecord?.photographer || '',
            photographerUrl: imageRecord?.photographerUrl || '',
            sourceUrl: imageRecord?.pexelsUrl || ''
          },
          description: product.description,
          harvestDate: randomHarvestDate(),
          status: 'available',
          isSeed: true
        };
      });
    });

    const crops = await Crop.insertMany(cropData);
    const ordersToCreate = orderStatuses.map((status, index) => {
      const crop = randomItem(crops);
      const buyer = randomItem(buyers);
      const quantity = Math.min(crop.quantity, randomInt(1, Math.max(1, Math.ceil(crop.quantity / 5))));
      const pricePerUnit = crop.pricePerUnit;

      return {
        crop: crop._id,
        buyer: buyer._id,
        farmer: crop.farmer,
        quantity,
        pricePerUnit,
        totalPrice: Number((quantity * pricePerUnit).toFixed(2)),
        message: `Demo order ${index + 1} for ${crop.name}. Please confirm grading and dispatch timing.`,
        deliveryLocation: `${buyer.location.village}, ${buyer.location.district}, ${buyer.location.state}`,
        status,
        paymentMethod: randomItem(['cash', 'upi', 'other']),
        isSeed: true
      };
    });
    const orders = await Order.insertMany(ordersToCreate);

    const completedOrders = orders.filter((order) => order.status === 'completed').slice(0, 8);
    const cropNamesById = new Map(crops.map((crop) => [String(crop._id), crop.name]));
    const reviewsToCreate = completedOrders.map((order, index) => ({
      farmer: order.farmer,
      buyer: order.buyer,
      order: order._id,
      rating: index % 4 === 0 ? 4 : 5,
      comment: `Fresh ${cropNamesById.get(String(order.crop))} arrived as described. Clear communication and careful handling from the farm.`,
      isSeed: true
    }));
    await Review.insertMany(reviewsToCreate);

    console.log(`Created ${farmers.length} farmers, ${buyers.length} buyers, and ${admins.length} admin.`);
    console.log(`Created ${crops.length} crop listings, ${orders.length} orders, and ${reviewsToCreate.length} reviews.`);
    console.log('Demo login credentials:');
    console.log(`Admin: demo.admin@agriconnect.com / ${DEMO_PASSWORD}`);
    console.log(`Farmers: demo.farmer01@agriconnect.com through demo.farmer20@agriconnect.com / ${DEMO_PASSWORD}`);
    console.log(`Buyers: demo.buyer01@agriconnect.com through demo.buyer10@agriconnect.com / ${DEMO_PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
};

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});