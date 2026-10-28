const fs = require('fs');
const os = require('os');
const net = require('net');
const dns = require('dns');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const findMongodBinary = () => {
  const candidates = [
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe'
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const isPortListening = (port = 27017, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });

const ensureLocalMongodRunning = async () => {
  const alreadyUp = await isPortListening(27017, '127.0.0.1');
  if (alreadyUp) return true;

  const mongodBin = findMongodBinary();
  if (!mongodBin) return false;

  // Store MongoDB data outside the watched server folder when possible, falling back to local .mongodb-data
  let dbPath = path.join(os.homedir(), '.agriconnect-mongodb');
  try {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
  } catch {
    dbPath = path.join(__dirname, '..', '.mongodb-data');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
  }

  console.log(`[MongoDB] Starting local mongod service (dbpath: ${dbPath})...`);
  const child = spawn(
    mongodBin,
    ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1'],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }
  );
  child.unref();

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortListening(27017, '127.0.0.1')) {
      return true;
    }
  }
  return false;
};

const ensureQuickDemoAccounts = async () => {
  try {
    const User = require('../models/User');
    const Crop = require('../models/Crop');
    const Order = require('../models/Order');
    const Requirement = require('../models/Requirement');

    const quickAccounts = [
      {
        name: 'Ramesh Patel',
        email: 'ramesh.farmer@agriconnect.com',
        phone: '9876511001',
        role: 'farmer',
        upiId: 'ramesh.farmer@okaxis',
        location: { village: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh' },
        isVerified: true,
        verificationStatus: 'approved'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.buyer@agriconnect.com',
        phone: '9876522001',
        role: 'buyer',
        location: { village: 'Madhapur', district: 'Hyderabad', state: 'Telangana' }
      },
      {
        name: 'AgriConnect Admin',
        email: 'admin@agriconnect.com',
        phone: '9876500001',
        role: 'admin',
        location: { village: 'Hitech City', district: 'Hyderabad', state: 'Telangana' }
      }
    ];

    for (const acct of quickAccounts) {
      const exists = await User.findOne({ email: acct.email });
      if (!exists) {
        await User.create({
          ...acct,
          password: 'Password123!'
        });
      }
    }

    const { syncProductImagesAndCrops } = require('../scripts/populateCropImages');
    await syncProductImagesAndCrops();

    const cropCount = await Crop.countDocuments();
    if (cropCount === 0) {
      const farmer = await User.findOne({ email: 'ramesh.farmer@agriconnect.com' });
      if (farmer) {
        const products = require('../data/products');
        const imageMapPath = path.join(__dirname, '..', 'data', 'imageMap.json');
        const imageMap = fs.existsSync(imageMapPath)
          ? JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))
          : {};

        const sampleCrops = products.map((p, idx) => {
          const img = imageMap[p.name];
          return {
            farmer: farmer._id,
            name: p.name,
            category: p.category,
            quantity: 250 + idx * 20,
            unit: p.unit || 'kg',
            pricePerUnit: Math.round((p.minPrice + p.maxPrice) / 2),
            location: farmer.location,
            geoLocation: {
              type: 'Point',
              coordinates: [80.64 + (idx % 5) * 0.03, 16.24 + (idx % 4) * 0.03]
            },
            images: [img?.url || '/public/placeholder-crop.jpg'],
            imageAttribution: {
              photographer: img?.photographer || '',
              photographerUrl: img?.photographerUrl || '',
              sourceUrl: img?.pexelsUrl || ''
            },
            description: p.description,
            harvestDate: new Date(),
            status: 'available',
            isSeed: true
          };
        });
        const createdCrops = await Crop.insertMany(sampleCrops);
        console.log(`[MongoDB] Seeded ${createdCrops.length} initial marketplace crops.`);
      }
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      const farmer = await User.findOne({ email: 'ramesh.farmer@agriconnect.com' });
      const buyer = await User.findOne({ email: 'priya.buyer@agriconnect.com' });
      const existingCrops = await Crop.find({ farmer: farmer?._id }).limit(2);
      if (farmer && buyer && existingCrops.length >= 2) {
        await Order.create([
          {
            crop: existingCrops[0]._id,
            buyer: buyer._id,
            farmer: farmer._id,
            quantity: 50,
            pricePerUnit: existingCrops[0].pricePerUnit,
            totalPrice: 50 * existingCrops[0].pricePerUnit,
            deliveryLocation: 'Shop 12, Bowenpally Market Yard, Hyderabad',
            message: 'Please pack in 25kg breathable jute bags.',
            status: 'accepted',
            paymentMethod: 'upi',
            paymentStatus: 'unpaid',
            isSeed: true
          },
          {
            crop: existingCrops[1]._id,
            buyer: buyer._id,
            farmer: farmer._id,
            quantity: 40,
            pricePerUnit: existingCrops[1].pricePerUnit,
            totalPrice: 40 * existingCrops[1].pricePerUnit,
            deliveryLocation: 'Madhapur Wholesale Hub, Hyderabad',
            message: 'Completed sample order with downloadable PDF invoice.',
            status: 'completed',
            paymentMethod: 'upi',
            paymentStatus: 'paid',
            paidAt: new Date(),
            isSeed: true
          }
        ]);

        await Requirement.create({
          buyer: buyer._id,
          cropName: 'Tomato',
          category: 'Vegetables',
          quantity: 500,
          unit: 'kg',
          targetPricePerUnit: 26,
          deliveryLocation: {
            address: 'Bowenpally Market, Hyderabad',
            district: 'Hyderabad',
            state: 'Telangana'
          },
          neededByDate: new Date(Date.now() + 5 * 86400000),
          notes: 'Looking for Grade-A firm red tomatoes direct from Guntur/Krishna farms.',
          status: 'open'
        });
        console.log('[MongoDB] Seeded sample orders and reverse-marketplace requirement.');
      }
    }
  } catch (err) {
    console.warn('[MongoDB] Demo bootstrap warning:', err.message);
  }
};

const connectDB = async () => {
  const primaryUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/agriconnect';
  try {
    if (primaryUri.startsWith('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
      } catch {
        // ignore if dns servers cannot be set
      }
    }
    if (primaryUri.includes('127.0.0.1:27017') || primaryUri.includes('localhost:27017')) {
      await ensureLocalMongodRunning();
    }

    const isAtlas = primaryUri.startsWith('mongodb+srv://');
    const conn = await mongoose.connect(primaryUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      ...(isAtlas ? { tlsAllowInvalidCertificates: true } : {})
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    await ensureQuickDemoAccounts();
  } catch (error) {
    console.error(`[MongoDB Primary Connection Error]: ${error.message}`);
    // If Cloud Atlas fails (e.g. offline or IP not yet added), fall back to local MongoDB
    if (!primaryUri.includes('127.0.0.1:27017') && !primaryUri.includes('localhost:27017')) {
      try {
        console.log('[MongoDB] Falling back to local MongoDB (127.0.0.1:27017)...');
        await ensureLocalMongodRunning();
        const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/agriconnect', {
          autoIndex: true
        });
        console.log(`[MongoDB Connected (Local Fallback)]: ${fallbackConn.connection.host}`);
        await ensureQuickDemoAccounts();
      } catch (fallbackErr) {
        console.error(`[MongoDB Fallback Error]: ${fallbackErr.message}`);
      }
    }
  }
};

module.exports = connectDB;
