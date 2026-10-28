const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const llm = require('../services/llm');
const { runChatAgent } = require('../services/chatAgent');
const ChatSession = require('../models/ChatSession');
const DiseaseReport = require('../models/DiseaseReport');
const User = require('../models/User');
const { processUploadedFiles } = require('../middleware/upload');

let sharpLib = null;
try {
  sharpLib = require('sharp');
} catch {
  sharpLib = null;
}

const VALID_CROP_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains & Cereals',
  'Pulses',
  'Spices',
  'Oilseeds',
  'Millets',
  'Dairy & Eggs',
  'Flowers',
  'Cash Crops',
  'Nuts & Dry Fruits',
  'Honey & Jaggery',
  'Seeds & Saplings',
  'Organic Products',
  'Grains',
  'Others'
];

/**
 * Helper: optionally resolve logged-in user from Bearer token or cookie without rejecting guests.
 */
async function resolveOptionalUser(req) {
  if (req.user) return req.user;
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
}

/**
 * Helper: Resize image buffer using `sharp` if installed (max 1024x1024 JPEG quality 82),
 * or return original buffer as base64 if `sharp` native module is not installed.
 */
async function prepareImageForVision(filePath, mimeType = 'image/jpeg') {
  const rawBuffer = fs.readFileSync(filePath);
  if (sharpLib) {
    try {
      const resized = await sharpLib(rawBuffer)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      return {
        base64: resized.toString('base64'),
        mimeType: 'image/jpeg'
      };
    } catch (err) {
      console.warn('[AI Vision] sharp resize fallback to raw buffer:', err.message);
    }
  }
  return {
    base64: rawBuffer.toString('base64'),
    mimeType: mimeType || 'image/jpeg'
  };
}

/**
 * @desc    1. Health & Diagnostics
 * @route   GET /api/ai/health
 * @access  Public
 */
const getAiHealth = async (req, res, next) => {
  try {
    const health = await llm.getHealthStatus();
    return res.status(200).json({
      success: true,
      message: health.available
        ? `AI layer operational (primary: ${health.primaryProvider})`
        : health.uiNotice,
      data: health
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2a. Get Chatbot History for logged-in user
 * @route   GET /api/ai/chat/history
 * @access  Public (returns empty for guests, stored session for logged-in users)
 */
const getChatHistory = async (req, res, next) => {
  try {
    const user = await resolveOptionalUser(req);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Guest chat session',
        data: { messages: [], language: 'en' }
      });
    }

    const session = await ChatSession.findOne({ user: user._id });
    return res.status(200).json({
      success: true,
      message: 'Chat history loaded',
      data: {
        messages: session?.messages || [],
        language: session?.language || 'en'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2b. Clear Chatbot History for logged-in user
 * @route   DELETE /api/ai/chat/history
 * @access  Public / Private
 */
const clearChatHistory = async (req, res, next) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user) {
      await ChatSession.findOneAndUpdate(
        { user: user._id },
        { $set: { messages: [] } },
        { upsert: true }
      );
    }
    return res.status(200).json({
      success: true,
      message: 'Chat history cleared.',
      data: { messages: [] }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2c. Non-streaming AI Assistant Chat
 * @route   POST /api/ai/chat
 * @access  Public (enhanced context if authenticated)
 */
const sendAssistantChat = async (req, res, next) => {
  try {
    const { message, language = 'en', history = [] } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message.',
        data: null
      });
    }

    const user = await resolveOptionalUser(req);
    const cleanLang = language === 'te' ? 'te' : 'en';
    const userText = String(message).trim();

    let session = null;
    if (user) {
      session = await ChatSession.findOne({ user: user._id });
      if (!session) {
        session = await ChatSession.create({
          user: user._id,
          language: cleanLang,
          messages: []
        });
      }
    }

    const recentMessages = session
      ? session.messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      : Array.isArray(history)
      ? history.slice(-8)
      : [];

    const agentRes = await runChatAgent({
      message: userText,
      history: recentMessages,
      language: cleanLang,
      user
    });

    if (session) {
      session.language = agentRes.language || cleanLang;
      session.messages.push(
        { role: 'user', content: userText, language: agentRes.language || cleanLang },
        {
          role: 'assistant',
          content: agentRes.reply,
          language: agentRes.language || cleanLang,
          provider: agentRes.meta?.provider || '',
          model: agentRes.meta?.model || '',
          latencyMs: agentRes.meta?.latencyMs || 0,
          cards: agentRes.cards || [],
          toolsUsed: agentRes.toolsUsed || []
        }
      );
      if (session.messages.length > 60) {
        session.messages = session.messages.slice(-60);
      }
      await session.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Assistant reply generated',
      data: {
        reply: agentRes.reply,
        language: agentRes.language || cleanLang,
        cards: agentRes.cards || [],
        toolsUsed: agentRes.toolsUsed || [],
        meta: agentRes.meta,
        disclaimer: agentRes.disclaimer
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2d. SSE Streaming AI Assistant Chat
 * @route   POST /api/ai/chat/stream
 * @access  Public (enhanced context if authenticated)
 */
const streamAssistantChat = async (req, res) => {
  const { message, language = 'en', history = [] } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a message.',
      data: null
    });
  }

  // Configure SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const user = await resolveOptionalUser(req);
    const cleanLang = language === 'te' ? 'te' : 'en';
    const userText = String(message).trim();

    let session = null;
    if (user) {
      session = await ChatSession.findOne({ user: user._id });
      if (!session) {
        session = await ChatSession.create({
          user: user._id,
          language: cleanLang,
          messages: []
        });
      }
    }

    const recentMessages = session
      ? session.messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      : Array.isArray(history)
      ? history.slice(-8)
      : [];

    sendEvent('typing', { status: 'streaming' });

    const agentRes = await runChatAgent({
      message: userText,
      history: recentMessages,
      language: cleanLang,
      user,
      onToolActivity: (activity) => {
        sendEvent('tool_activity', activity);
      },
      onToken: (tokenChunk) => {
        sendEvent('token', { token: tokenChunk });
      }
    });

    if (session && agentRes.reply) {
      session.language = agentRes.language || cleanLang;
      session.messages.push(
        { role: 'user', content: userText, language: agentRes.language || cleanLang },
        {
          role: 'assistant',
          content: agentRes.reply,
          language: agentRes.language || cleanLang,
          provider: agentRes.meta?.provider || '',
          model: agentRes.meta?.model || '',
          latencyMs: agentRes.meta?.latencyMs || 0,
          cards: agentRes.cards || [],
          toolsUsed: agentRes.toolsUsed || []
        }
      );
      if (session.messages.length > 60) {
        session.messages = session.messages.slice(-60);
      }
      await session.save();
    }

    sendEvent('done', {
      reply: agentRes.reply,
      language: agentRes.language || cleanLang,
      cards: agentRes.cards || [],
      toolsUsed: agentRes.toolsUsed || [],
      meta: agentRes.meta,
      disclaimer: agentRes.disclaimer
    });
    res.end();
  } catch (err) {
    sendEvent('error', {
      message: err.message || 'AI is busy, try again in a minute'
    });
    res.end();
  }
};

/**
 * @desc    3a. Crop Disease Detection (Vision)
 * @route   POST /api/ai/disease-check
 * @access  Private (Farmer / Admin)
 */
const checkCropDisease = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload or capture a plant/leaf image (max 5MB).',
        data: null
      });
    }

    const cropHint = (req.body.cropName || '').trim();
    const { base64, mimeType } = await prepareImageForVision(file.path, file.mimetype);
    const uploadedUrls = await processUploadedFiles([file]);
    const imageUrl = uploadedUrls[0] || '';

    const diseaseSchema = llm.z.object({
      cropGuess: llm.z.string(),
      likelyIssue: llm.z.string(),
      confidence: llm.z.enum(['low', 'medium', 'high']),
      symptoms: llm.z.array(llm.z.string()),
      organicRemedies: llm.z.array(llm.z.string()),
      chemicalRemedies: llm.z.array(llm.z.string()),
      preventionTips: llm.z.array(llm.z.string()),
      whenToConsultExpert: llm.z.string()
    });

    const prompt = `Inspect this agricultural plant/leaf image${
      cropHint ? ` (farmer specified crop: "${cropHint}")` : ''
    }.
Return a structured JSON diagnosis with exact keys:
- "cropGuess": string (identified crop name)
- "likelyIssue": string (suspected fungal/bacterial/viral/pest/nutrient issue, or "Healthy Plant" if no disease visible)
- "confidence": "low" | "medium" | "high"
- "symptoms": string[] (2-4 visible signs on leaf/stem)
- "organicRemedies": string[] (2-3 practical organic/cultural remedies like neem oil spray, Trichoderma, pruning)
- "chemicalRemedies": string[] (2-3 standard agricultural extension recommendations with active ingredient names and safety note)
- "preventionTips": string[] (2-3 crop rotation, spacing, or irrigation tips)
- "whenToConsultExpert": string (clear threshold when to visit Rythu Bharosa Kendra / local Agriculture Officer)`;

    const visionRes = await llm.json({
      prompt,
      schema: diseaseSchema,
      imageBase64: base64,
      mimeType,
      system:
        'You are an Indian plant pathology & agricultural extension assistant. Provide cautious, practical crop health observations.',
      useCache: false,
      mockFallback: () => ({
        cropGuess: cropHint || 'Solanaceous / Field Crop (Tomato / Chilli)',
        likelyIssue: 'Early Leaf Spot / Mild Nutrient Stress (Sample Analysis)',
        confidence: 'medium',
        symptoms: [
          'Small yellowish-brown chlorotic spots on older leaves',
          'Slight curling along leaf margins',
          'Localized lesions without widespread stem necrosis'
        ],
        organicRemedies: [
          'Remove and destroy severely affected lower leaves away from the field',
          'Spray 5% Neem Seed Kernel Extract (NSKE) or Azadirachtin 1500 ppm (3 ml/litre of water) in the evening',
          'Apply Pseudomonas fluorescens or Trichoderma viride foliar/soil drench (5 g/litre)'
        ],
        chemicalRemedies: [
          'If fungal spots spread rapidly, spray Mancozeb 75% WP @ 2.5 g/litre or Copper Oxychloride @ 3 g/litre (confirm dosage with local Agriculture Officer)',
          'Observe the mandatory waiting/pre-harvest interval before harvesting produce'
        ],
        preventionTips: [
          'Avoid overhead irrigation late in the evening to reduce leaf wetness duration',
          'Maintain proper plant spacing for airflow and practice non-host crop rotation',
          'Ensure balanced NPK + micronutrient (Zinc/Magnesium) soil application'
        ],
        whenToConsultExpert:
          'If more than 15–20% of plants show wilting, stem girdling, or rapid lesion spread within 48 hours, take a fresh leaf sample to your local Rythu Bharosa Kendra (RBK) / Agriculture Officer or call Kisan Call Centre at 1800-180-1551.'
      })
    });

    const report = await DiseaseReport.create({
      farmer: req.user.id,
      cropName: cropHint,
      imageUrl,
      ...visionRes.data,
      provider: visionRes.provider,
      model: visionRes.model,
      latencyMs: visionRes.latencyMs
    });

    return res.status(201).json({
      success: true,
      message: 'Leaf analysis completed.',
      data: {
        report,
        meta: visionRes.meta,
        disclaimer:
          'AI suggestion only. Consult your local Agriculture Officer / Rythu Bharosa Kendra for confirmation.',
        kisanCallCentre: '1800-180-1551'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    3b. Get Past Disease Reports for logged-in farmer
 * @route   GET /api/ai/disease-check/history
 * @access  Private (Farmer / Admin)
 */
const getDiseaseHistory = async (req, res, next) => {
  try {
    const reports = await DiseaseReport.find({ farmer: req.user.id })
      .sort({ createdAt: -1 })
      .limit(25);

    return res.status(200).json({
      success: true,
      message: 'Disease check history loaded.',
      data: {
        reports,
        disclaimer:
          'AI suggestion only. Consult your local Agriculture Officer / Rythu Bharosa Kendra for confirmation.',
        kisanCallCentre: '1800-180-1551'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    4. Auto-Listing from Photo (Vision)
 * @route   POST /api/ai/auto-list-photo
 * @access  Private (Farmer / Admin)
 */
const autoListFromPhoto = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a crop photo first to auto-fill details.',
        data: null
      });
    }

    const { base64, mimeType } = await prepareImageForVision(file.path, file.mimetype);

    // Clean up temporary file used for vision analysis (actual listing upload happens on form submit)
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
    }

    const autoListSchema = llm.z.object({
      name: llm.z.string(),
      category: llm.z.enum(VALID_CROP_CATEGORIES),
      qualityNotes: llm.z.string(),
      suggestedDescription: llm.z.string()
    });

    const originalNameHint = path.basename(file.originalname || '', path.extname(file.originalname || '')).replace(/[-_0-9]/g, ' ').trim();

    const prompt = `You are helping an Indian farmer create a marketplace listing from their produce photo.
Identify the agricultural produce in the image and return JSON with exact keys:
- "name": string (specific Indian market name, e.g. "Fresh Red Tomato", "Guntur Dry Red Chilli", "Sona Masoori Rice")
- "category": MUST be one of [${VALID_CROP_CATEGORIES.map((c) => `"${c}"`).join(', ')}]
- "qualityNotes": string (short note on visible freshness, colour, grading, or maturity)
- "suggestedDescription": string (2-3 sentences suitable for wholesale/retail buyers describing farm freshness, grading, and direct farm dispatch)`;

    const visionRes = await llm.json({
      prompt,
      schema: autoListSchema,
      imageBase64: base64,
      mimeType,
      system: 'You are an agricultural catalog assistant for Indian farmers.',
      useCache: false,
      mockFallback: () => {
        const inferredName =
          originalNameHint && originalNameHint.length > 2
            ? originalNameHint.charAt(0).toUpperCase() + originalNameHint.slice(1)
            : 'Farm Fresh Hybrid Tomato';
        return {
          name: inferredName,
          category: 'Vegetables',
          qualityNotes: 'Uniform size, bright natural colour, freshly harvested Grade-A farm lot.',
          suggestedDescription: `Freshly harvested ${inferredName} grown using sustainable farm practices. Carefully hand-graded for uniform size and high shelf life. Ready for immediate wholesale or retail dispatch directly from our farm.`
        };
      }
    });

    // Double-check category against enum
    const validCat = VALID_CROP_CATEGORIES.includes(visionRes.data.category)
      ? visionRes.data.category
      : 'Vegetables';

    return res.status(200).json({
      success: true,
      message: 'Form fields generated from photo! You can edit any field before publishing.',
      data: {
        listing: {
          name: visionRes.data.name,
          category: validCat,
          qualityNotes: visionRes.data.qualityNotes,
          suggestedDescription: visionRes.data.suggestedDescription
        },
        meta: visionRes.meta,
        disclaimer: 'AI replies are suggestions and may be imperfect.'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAiHealth,
  getChatHistory,
  clearChatHistory,
  sendAssistantChat,
  streamAssistantChat,
  checkCropDisease,
  getDiseaseHistory,
  autoListFromPhoto
};
