const mongoose = require('mongoose');
const Crop = require('../../models/Crop');
const Order = require('../../models/Order');
const { getMandiPrice, getMandiPrices } = require('../../utils/mandiService');
const {
  liveCropFilter,
  getLiveCropQuery,
  escapeRegex,
  sanitizeString,
  stripMongoOperators
} = require('../../utils/liveCropFilter');
const { z, validateWithSchema } = require('../llm/schemaValidator');

/**
 * Formats a Mongo Crop document into the safe, structured tool listing shape.
 * Never exposes farmerPhone unless `isAuthenticated` is true.
 * Neutralizes any prompt-injection phrases inside user-authored text fields.
 */
function sanitizeUntrustedDataText(text, maxLen = 280) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, '[filtered-content]')
    .replace(/system\s*prompt/gi, '[filtered-content]')
    .replace(/you\s+are\s+now/gi, '[filtered-content]')
    .slice(0, maxLen)
    .trim();
}

function formatCropItem(crop, isAuthenticated = false) {
  const id = String(crop._id || crop.id);
  const loc = crop.location || {};
  const farmer = crop.farmer && typeof crop.farmer === 'object' ? crop.farmer : {};

  const item = {
    id,
    name: sanitizeUntrustedDataText(crop.name, 120),
    category: crop.category || 'Others',
    pricePerUnit: Number(crop.pricePerUnit),
    unit: crop.unit || 'kg',
    quantityAvailable: Number(crop.quantity),
    location: {
      village: loc.village || '',
      district: loc.district || '',
      state: loc.state || ''
    },
    farmerName: sanitizeUntrustedDataText(farmer.name || 'Verified Farmer', 80),
    verified: Boolean(farmer.isVerified),
    imageUrl:
      Array.isArray(crop.images) && crop.images.length > 0
        ? crop.images[0]
        : '/public/placeholder-crop.jpg',
    cropUrl: `/crops/${id}`
  };

  if (isAuthenticated && farmer.phone) {
    item.farmerPhone = farmer.phone;
  }

  return item;
}

/**
 * Builds a MongoDB match filter from whitelisted crop/category/state/district parameters
 * combined with the mandatory `getLiveCropQuery()` filter.
 */
async function buildFilteredLiveMatch({ query, crop, category, state, district, unit } = {}) {
  const match = await getLiveCropQuery();

  const safeCategory = sanitizeString(category, 60);
  if (safeCategory && safeCategory.toLowerCase() !== 'all') {
    match.category = { $regex: `^${escapeRegex(safeCategory)}$`, $options: 'i' };
  }

  const safeState = sanitizeString(state, 60);
  if (safeState) {
    match['location.state'] = { $regex: escapeRegex(safeState), $options: 'i' };
  }

  const safeDistrict = sanitizeString(district, 60);
  if (safeDistrict) {
    match['location.district'] = { $regex: escapeRegex(safeDistrict), $options: 'i' };
  }

  const safeUnit = sanitizeString(unit, 20);
  if (safeUnit) {
    match.unit = safeUnit.toLowerCase();
  }

  const searchTerm = sanitizeString(query || crop, 80);
  if (searchTerm) {
    const escaped = escapeRegex(searchTerm);
    match.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } }
    ];
  }

  return match;
}

/**
 * Computes 33rd and 66th percentile price tiers via MongoDB aggregation on live listings.
 */
async function computeLivePriceTiers({ crop, category, district, state } = {}) {
  const match = await buildFilteredLiveMatch({ crop, category, district, state });

  // MongoDB aggregation: sort by pricePerUnit asc, group all prices + stats, and compute 33rd & 66th percentile in pipeline
  const agg = await Crop.aggregate([
    { $match: match },
    { $sort: { pricePerUnit: 1 } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        min: { $min: '$pricePerUnit' },
        max: { $max: '$pricePerUnit' },
        avg: { $avg: '$pricePerUnit' },
        prices: { $push: '$pricePerUnit' }
      }
    },
    {
      $project: {
        _id: 0,
        count: 1,
        min: 1,
        max: 1,
        avg: { $round: ['$avg', 2] },
        lowMax: {
          $arrayElemAt: [
            '$prices',
            {
              $floor: {
                $multiply: [0.33, { $max: [0, { $subtract: ['$count', 1] }] }]
              }
            }
          ]
        },
        mediumMax: {
          $arrayElemAt: [
            '$prices',
            {
              $floor: {
                $multiply: [0.66, { $max: [0, { $subtract: ['$count', 1] }] }]
              }
            }
          ]
        }
      }
    }
  ]);

  if (!agg || agg.length === 0 || agg[0].count === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      lowMax: null,
      mediumMax: null,
      match
    };
  }

  const stats = agg[0];
  return {
    count: stats.count,
    min: Number(stats.min),
    max: Number(stats.max),
    avg: Number(Number(stats.avg).toFixed(2)),
    lowMax: Number(stats.lowMax),
    mediumMax: Number(stats.mediumMax),
    match
  };
}

// ============================================================================
// TOOL SCHEMAS (Zod) & DEFINITIONS
// ============================================================================

const searchCropsSchema = z.object({
  query: z.string().optional().describe('Crop name or keyword to search (e.g. "Tomato", "Rice", "Mango")'),
  category: z.string().optional().describe('Category name (e.g. "Vegetables", "Fruits", "Spices", "Pulses", "Grains & Cereals", "Millets", "Oilseeds", "Dairy & Eggs", "Flowers", "Cash Crops", "Nuts & Dry Fruits", "Honey & Jaggery", "Seeds & Saplings", "Organic Products")'),
  state: z.string().optional().describe('State filter (e.g. "Andhra Pradesh", "Telangana")'),
  district: z.string().optional().describe('District filter (e.g. "Guntur", "Krishna", "Kurnool", "Warangal")'),
  minPrice: z.number().optional().describe('Minimum pricePerUnit in INR'),
  maxPrice: z.number().optional().describe('Maximum pricePerUnit in INR'),
  priceTier: z.enum(['low', 'medium', 'high']).optional().describe('Relative price tier ("low" = bottom 33%, "medium" = 33%-66%, "high" = top 34%)'),
  unit: z.string().optional().describe('Unit of measurement (kg, quintal, ton, dozen, litre, piece)'),
  availableOnly: z.boolean().optional().default(true).describe('Always true to return only live available listings'),
  sort: z.enum(['price-asc', 'price-desc', 'newest', 'quantity-desc']).optional().describe('Sort order'),
  limit: z.number().optional().default(8).describe('Max number of listings to return (clamped to <= 10)')
});

const getPriceTiersSchema = z.object({
  crop: z.string().optional().describe('Optional crop name to filter price tiers'),
  category: z.string().optional().describe('Optional category to filter price tiers (e.g. "Vegetables", "Fruits", "Spices")'),
  district: z.string().optional().describe('Optional district to filter price tiers')
});

const listAvailableCategoriesSchema = z.object({});

const listAvailableLocationsSchema = z.object({
  category: z.string().optional().describe('Optional category filter'),
  crop: z.string().optional().describe('Optional crop name filter')
});

const getCropDetailsSchema = z.object({
  cropId: z.string().describe('MongoDB ObjectId of the crop listing')
});

const getMarketPriceSchema = z.object({
  crop: z.string().describe('Crop/commodity name (e.g. "Tomato", "Chilli", "Turmeric", "Rice")'),
  state: z.string().optional().describe('Optional Indian state name')
});

const getMyOrdersSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'completed', 'cancelled']).optional().describe('Optional order status filter'),
  limit: z.number().optional().default(5).describe('Max orders to return (<= 10)')
});

const getMyListingsSchema = z.object({
  limit: z.number().optional().default(10).describe('Max listings to return (<= 10)')
});

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

const TOOLS = {
  searchCrops: {
    name: 'searchCrops',
    description:
      'Search live available crop listings on the AgriConnect marketplace by keyword, category, state, district, price range, or relative priceTier ("low", "medium", "high"). Always call this when the user asks what crops/items are available, who sells what, cheap/expensive items, or listings in a location.',
    schema: searchCropsSchema,
    statusLabel: 'Checking live listings...',
    async execute(rawArgs = {}, context = {}) {
      const cleanRaw = stripMongoOperators(rawArgs || {});
      // Coerce numeric strings if LLM passed strings for numbers
      if (typeof cleanRaw.minPrice === 'string' && cleanRaw.minPrice.trim() !== '') {
        cleanRaw.minPrice = Number(cleanRaw.minPrice);
      }
      if (typeof cleanRaw.maxPrice === 'string' && cleanRaw.maxPrice.trim() !== '') {
        cleanRaw.maxPrice = Number(cleanRaw.maxPrice);
      }
      if (typeof cleanRaw.limit === 'string' && cleanRaw.limit.trim() !== '') {
        cleanRaw.limit = Number(cleanRaw.limit);
      }

      const args = validateWithSchema(cleanRaw, searchCropsSchema);
      const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 10);

      const match = await buildFilteredLiveMatch({
        query: args.query,
        category: args.category,
        state: args.state,
        district: args.district,
        unit: args.unit
      });

      let tierBands = null;
      if (args.priceTier) {
        const tierStats = await computeLivePriceTiers({
          crop: args.query,
          category: args.category,
          district: args.district,
          state: args.state
        });
        tierBands = {
          min: tierStats.min,
          max: tierStats.max,
          avg: tierStats.avg,
          lowMax: tierStats.lowMax,
          mediumMax: tierStats.mediumMax,
          count: tierStats.count
        };

        if (tierStats.count > 0) {
          match.pricePerUnit = match.pricePerUnit || {};
          if (args.priceTier === 'low') {
            match.pricePerUnit.$lte = tierStats.lowMax;
          } else if (args.priceTier === 'medium') {
            match.pricePerUnit.$gt = tierStats.lowMax;
            match.pricePerUnit.$lte = tierStats.mediumMax;
          } else if (args.priceTier === 'high') {
            // If all prices are identical or mediumMax === max, allow >= mediumMax
            if (tierStats.mediumMax < tierStats.max) {
              match.pricePerUnit.$gt = tierStats.mediumMax;
            } else {
              match.pricePerUnit.$gte = tierStats.mediumMax;
            }
          }
        }
      }

      if (typeof args.minPrice === 'number' && !Number.isNaN(args.minPrice)) {
        match.pricePerUnit = match.pricePerUnit || {};
        match.pricePerUnit.$gte = Math.max(match.pricePerUnit.$gte ?? -Infinity, args.minPrice);
      }
      if (typeof args.maxPrice === 'number' && !Number.isNaN(args.maxPrice)) {
        match.pricePerUnit = match.pricePerUnit || {};
        match.pricePerUnit.$lte = Math.min(match.pricePerUnit.$lte ?? Infinity, args.maxPrice);
      }

      let sortOption = { createdAt: -1 };
      const effectiveSort =
        args.sort ||
        (args.priceTier === 'low'
          ? 'price-asc'
          : args.priceTier === 'high'
          ? 'price-desc'
          : 'newest');

      if (effectiveSort === 'price-asc') sortOption = { pricePerUnit: 1 };
      else if (effectiveSort === 'price-desc') sortOption = { pricePerUnit: -1 };
      else if (effectiveSort === 'quantity-desc') sortOption = { quantity: -1 };

      const [totalMatching, docs] = await Promise.all([
        Crop.countDocuments(match),
        Crop.find(match)
          .populate('farmer', 'name phone location isVerified isBlocked')
          .sort(sortOption)
          .limit(limit)
          .lean()
      ]);

      const isAuthenticated = Boolean(context?.user);
      const listings = docs
        .filter((d) => !d.farmer?.isBlocked)
        .map((d) => formatCropItem(d, isAuthenticated));

      return {
        totalMatching,
        returnedCount: listings.length,
        filtersApplied: {
          query: args.query || null,
          category: args.category || null,
          state: args.state || null,
          district: args.district || null,
          priceTier: args.priceTier || null,
          minPrice: args.minPrice ?? null,
          maxPrice: args.maxPrice ?? null
        },
        ...(tierBands ? { priceTierBands: tierBands } : {}),
        listings
      };
    }
  },

  getPriceTiers: {
    name: 'getPriceTiers',
    description:
      'Compute live low/medium/high price tiers (using 33rd and 66th percentiles in MongoDB aggregation) for available listings filtered by crop, category, or district. Returns { min, max, avg, lowMax, mediumMax, count } and example live listings per tier.',
    schema: getPriceTiersSchema,
    statusLabel: 'Calculating live marketplace price tiers...',
    async execute(rawArgs = {}, context = {}) {
      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, getPriceTiersSchema);

      const tierStats = await computeLivePriceTiers({
        crop: args.crop,
        category: args.category,
        district: args.district
      });

      if (tierStats.count === 0) {
        return {
          count: 0,
          min: null,
          max: null,
          avg: null,
          lowMax: null,
          mediumMax: null,
          note: 'No live available listings matched these filters on AgriConnect.',
          examples: { low: [], medium: [], high: [] }
        };
      }

      const isAuthenticated = Boolean(context?.user);
      const baseMatch = tierStats.match;

      const [lowDocs, medDocs, highDocs] = await Promise.all([
        Crop.find({ ...baseMatch, pricePerUnit: { $lte: tierStats.lowMax } })
          .populate('farmer', 'name phone location isVerified isBlocked')
          .sort({ pricePerUnit: 1 })
          .limit(3)
          .lean(),
        Crop.find({
          ...baseMatch,
          pricePerUnit: { $gt: tierStats.lowMax, $lte: tierStats.mediumMax }
        })
          .populate('farmer', 'name phone location isVerified isBlocked')
          .sort({ pricePerUnit: 1 })
          .limit(3)
          .lean(),
        Crop.find({
          ...baseMatch,
          pricePerUnit:
            tierStats.mediumMax < tierStats.max
              ? { $gt: tierStats.mediumMax }
              : { $gte: tierStats.mediumMax }
        })
          .populate('farmer', 'name phone location isVerified isBlocked')
          .sort({ pricePerUnit: -1 })
          .limit(3)
          .lean()
      ]);

      return {
        count: tierStats.count,
        min: tierStats.min,
        max: tierStats.max,
        avg: tierStats.avg,
        lowMax: tierStats.lowMax,
        mediumMax: tierStats.mediumMax,
        tiers: {
          low: { min: tierStats.min, max: tierStats.lowMax, label: `Low (₹${tierStats.min}–₹${tierStats.lowMax})` },
          medium: {
            min: tierStats.lowMax,
            max: tierStats.mediumMax,
            label: `Medium (₹${tierStats.lowMax}–₹${tierStats.mediumMax})`
          },
          high: {
            min: tierStats.mediumMax,
            max: tierStats.max,
            label: `High (₹${tierStats.mediumMax}–₹${tierStats.max})`
          }
        },
        note: 'Tiers are relative to current live listings on AgriConnect (33rd and 66th percentiles).',
        examples: {
          low: lowDocs.map((d) => formatCropItem(d, isAuthenticated)),
          medium: medDocs.map((d) => formatCropItem(d, isAuthenticated)),
          high: highDocs.map((d) => formatCropItem(d, isAuthenticated))
        }
      };
    }
  },

  listAvailableCategories: {
    name: 'listAvailableCategories',
    description:
      'List all crop categories that currently have live available listings on AgriConnect, along with the live listing count and price range per category.',
    schema: listAvailableCategoriesSchema,
    statusLabel: 'Checking available categories...',
    async execute() {
      const match = await getLiveCropQuery();
      const rows = await Crop.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            minPrice: { $min: '$pricePerUnit' },
            maxPrice: { $max: '$pricePerUnit' }
          }
        },
        { $sort: { count: -1, _id: 1 } }
      ]);

      return {
        totalCategories: rows.length,
        totalLiveListings: rows.reduce((acc, r) => acc + r.count, 0),
        categories: rows.map((r) => ({
          category: r._id,
          count: r.count,
          minPrice: r.minPrice,
          maxPrice: r.maxPrice
        }))
      };
    }
  },

  listAvailableLocations: {
    name: 'listAvailableLocations',
    description:
      'List states and districts that currently have live available listings on AgriConnect (optionally filtered by category or crop name), with live listing counts.',
    schema: listAvailableLocationsSchema,
    statusLabel: 'Checking available farm locations...',
    async execute(rawArgs = {}) {
      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, listAvailableLocationsSchema);
      const match = await buildFilteredLiveMatch({
        category: args.category,
        crop: args.crop
      });

      const rows = await Crop.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              state: '$location.state',
              district: '$location.district'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 25 }
      ]);

      return {
        locations: rows.map((r) => ({
          state: r._id?.state || 'Unknown',
          district: r._id?.district || 'Unknown',
          count: r.count
        }))
      };
    }
  },

  getCropDetails: {
    name: 'getCropDetails',
    description:
      'Get full live details of a single crop listing by its cropId. Returns { found: false } if the listing was deleted, sold out, or does not exist.',
    schema: getCropDetailsSchema,
    statusLabel: 'Checking listing details...',
    async execute(rawArgs = {}, context = {}) {
      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, getCropDetailsSchema);
      const cropId = sanitizeString(args.cropId, 40);

      if (!mongoose.Types.ObjectId.isValid(cropId)) {
        return { found: false, message: 'Invalid crop ID or listing no longer exists.' };
      }

      const liveQuery = await getLiveCropQuery({ _id: new mongoose.Types.ObjectId(cropId) });
      const crop = await Crop.findOne(liveQuery)
        .populate('farmer', 'name phone location isVerified isBlocked')
        .lean();

      if (!crop || crop.farmer?.isBlocked) {
        return {
          found: false,
          message: 'This listing is no longer available (it may have been sold out or removed by the farmer).'
        };
      }

      const isAuthenticated = Boolean(context?.user);
      const formatted = formatCropItem(crop, isAuthenticated);

      return {
        found: true,
        listing: {
          ...formatted,
          description: sanitizeUntrustedDataText(crop.description, 500),
          harvestDate: crop.harvestDate ? new Date(crop.harvestDate).toISOString().split('T')[0] : null
        }
      };
    }
  },

  getMarketPrice: {
    name: 'getMarketPrice',
    description:
      'Get the official reference government Mandi (Agmarknet) price for a crop/commodity (optional state filter). Note: this is a reference wholesale market benchmark, separate from live AgriConnect listings.',
    schema: getMarketPriceSchema,
    statusLabel: 'Checking reference Mandi prices...',
    async execute(rawArgs = {}) {
      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, getMarketPriceSchema);
      const crop = sanitizeString(args.crop, 60);
      const state = sanitizeString(args.state || '', 60);

      const [single, recordsRes] = await Promise.all([
        getMandiPrice(crop, state),
        getMandiPrices({ crop, state })
      ]);

      return {
        crop,
        state: state || 'All India',
        found: Boolean(single?.found),
        referencePricePerKg: single?.pricePerKg || null,
        referencePricePerQuintal: single?.pricePerQuintal || null,
        market: single?.market || null,
        recentMandiRecords: (recordsRes?.records || []).slice(0, 4),
        note: 'Reference government Mandi price (Agmarknet / sample benchmark). For actual items being sold on AgriConnect right now, use searchCrops or getPriceTiers.'
      };
    }
  },

  getMyOrders: {
    name: 'getMyOrders',
    description:
      'Get the currently logged-in user’s own orders on AgriConnect. Strictly scoped to the authenticated session user; never accepts another user ID.',
    schema: getMyOrdersSchema,
    statusLabel: 'Checking your orders...',
    async execute(rawArgs = {}, context = {}) {
      // Security rule: reject if not logged in OR if the caller tried to pass another user's identifier
      if (
        rawArgs &&
        (rawArgs.userId || rawArgs.user || rawArgs.buyerId || rawArgs.farmerId || rawArgs.email || rawArgs.userName)
      ) {
        return {
          authorized: false,
          error: 'Access denied: Cannot query another user’s orders. You may only view your own orders.'
        };
      }

      if (!context?.user?._id) {
        return {
          authorized: false,
          error: 'Please log in to your AgriConnect account to view your orders.'
        };
      }

      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, getMyOrdersSchema);
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);

      const roleField = context.user.role === 'farmer' ? 'farmer' : 'buyer';
      const query = { [roleField]: context.user._id };
      if (args.status) query.status = args.status;

      const orders = await Order.find(query)
        .populate('crop', 'name category unit pricePerUnit')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        authorized: true,
        role: context.user.role,
        count: orders.length,
        orders: orders.map((o) => ({
          orderId: String(o._id),
          cropName: o.crop?.name || 'Crop',
          quantity: o.quantity,
          unit: o.crop?.unit || 'kg',
          totalPrice: o.totalPrice,
          status: o.status,
          paymentStatus: o.paymentStatus || 'unpaid',
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : null
        }))
      };
    }
  },

  getMyListings: {
    name: 'getMyListings',
    description:
      'Get the currently logged-in farmer’s own crop listings on AgriConnect. Strictly scoped to the authenticated session user; never accepts another user ID.',
    schema: getMyListingsSchema,
    statusLabel: 'Checking your crop listings...',
    async execute(rawArgs = {}, context = {}) {
      if (
        rawArgs &&
        (rawArgs.userId || rawArgs.user || rawArgs.farmerId || rawArgs.email || rawArgs.farmerName)
      ) {
        return {
          authorized: false,
          error: 'Access denied: Cannot query another farmer’s private listings. Use searchCrops for public available listings.'
        };
      }

      if (!context?.user?._id) {
        return {
          authorized: false,
          error: 'Please log in as a Farmer on AgriConnect to view your own listings.'
        };
      }

      const cleanRaw = stripMongoOperators(rawArgs || {});
      const args = validateWithSchema(cleanRaw, getMyListingsSchema);
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 10);

      const crops = await Crop.find({
        farmer: context.user._id,
        isDeleted: { $ne: true }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        authorized: true,
        count: crops.length,
        listings: crops.map((c) => ({
          id: String(c._id),
          name: c.name,
          category: c.category,
          pricePerUnit: c.pricePerUnit,
          unit: c.unit,
          quantity: c.quantity,
          status: c.status,
          cropUrl: `/crops/${c._id}`
        }))
      };
    }
  }
};

/**
 * Returns tool definitions formatted for LLM tool calling (Gemini functionDeclarations & Ollama tools).
 */
function getToolDefinitions({ isAuthenticated = false } = {}) {
  const list = Object.values(TOOLS);
  return list.map((t) => {
    const jsonSchema =
      typeof t.schema?.toJSONSchema === 'function'
        ? t.schema.toJSONSchema()
        : { type: 'OBJECT', properties: {} };

    return {
      name: t.name,
      description: t.description,
      statusLabel: t.statusLabel,
      parameters: jsonSchema
    };
  });
}

/**
 * Executes a single tool with a strict 5-second timeout and schema validation.
 */
async function executeToolCall(toolName, rawArgs = {}, context = {}, timeoutMs = 5000) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return {
      error: `Unknown tool "${toolName}". Available tools: ${Object.keys(TOOLS).join(', ')}`
    };
  }

  return Promise.race([
    tool.execute(rawArgs, context),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

module.exports = {
  TOOLS,
  liveCropFilter,
  getLiveCropQuery,
  getToolDefinitions,
  executeToolCall,
  computeLivePriceTiers,
  searchCrops: (args, ctx) => TOOLS.searchCrops.execute(args, ctx),
  getPriceTiers: (args, ctx) => TOOLS.getPriceTiers.execute(args, ctx),
  listAvailableCategories: (args, ctx) => TOOLS.listAvailableCategories.execute(args, ctx),
  listAvailableLocations: (args, ctx) => TOOLS.listAvailableLocations.execute(args, ctx),
  getCropDetails: (args, ctx) => TOOLS.getCropDetails.execute(args, ctx),
  getMarketPrice: (args, ctx) => TOOLS.getMarketPrice.execute(args, ctx),
  getMyOrders: (args, ctx) => TOOLS.getMyOrders.execute(args, ctx),
  getMyListings: (args, ctx) => TOOLS.getMyListings.execute(args, ctx)
};

