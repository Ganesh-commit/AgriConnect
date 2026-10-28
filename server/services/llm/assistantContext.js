/**
 * Chatbot Context Builder (Integration 2)
 * Injects only relevant context into the assistant system prompt:
 *   1. Current mandi price for a mentioned crop (from mandiService)
 *   2. User's own listings & orders summary (scrubbed of PII)
 *   3. Platform how-to FAQs
 */

const Crop = require('../../models/Crop');
const Order = require('../../models/Order');
const { getMandiPrice } = require('../../utils/mandiService');
const { scrubText } = require('./piiScrubber');

const KNOWN_CROPS = [
  { key: 'Tomato', terms: ['tomato', 'tomatoes', 'టమాటా', 'టమోటా'] },
  { key: 'Onion', terms: ['onion', 'onions', 'ఉల్లి', 'ఉల్లిపాయ'] },
  { key: 'Potato', terms: ['potato', 'potatoes', 'బంగాళాదుంప', 'ఆలూ'] },
  { key: 'Chilli', terms: ['chilli', 'chili', 'mirchi', 'మిర్చి', 'మిరప'] },
  { key: 'Turmeric', terms: ['turmeric', 'haldi', 'pasupu', 'పసుపు'] },
  { key: 'Rice', terms: ['rice', 'paddy', 'dhanyam', 'vari', 'వరి', 'బియ్యం', 'ధాన్యం'] },
  { key: 'Wheat', terms: ['wheat', 'godhuma', 'గోధుమ'] },
  { key: 'Maize', terms: ['maize', 'corn', 'mokkajonna', 'మొక్కజొన్న'] },
  { key: 'Cotton', terms: ['cotton', 'kapas', 'pratti', 'పత్తి'] },
  { key: 'Groundnut', terms: ['groundnut', 'peanut', 'verusenaga', 'వేరుశెనగ'] },
  { key: 'Mango', terms: ['mango', 'mamidi', 'మామిడి'] },
  { key: 'Banana', terms: ['banana', 'arati', 'అరటి'] }
];

const PLATFORM_FAQS = `AgriConnect Platform Quick Guide:
- Selling Produce (Farmers): Go to "Add Crop" (/farmer/add-crop), upload a photo (use "Auto-fill from photo" to pre-fill details), check the Suggested Mandi Price, pick your farm location on the map, and publish.
- Crop Disease Check: Visit "/farmer/disease-check" to upload or capture a leaf photo for AI symptoms & organic/chemical remedy suggestions, or call Kisan Call Centre at 1800-180-1551.
- Buying & Orders: Browse "/crops" or "/map" (filter by 10/25/50/100 km radius). Place an order request with quantity and delivery location. Distance and rough transport cost are shown automatically.
- Direct Payments (UPI QR): No middleman gateway! Add your UPI ID in Profile (/profile). Once an order is accepted, buyers scan the farmer's UPI QR code and the farmer manually marks the order as "Paid".
- Reverse Marketplace (/requirements): Buyers can post crop requirements (crop, quantity, target price, needed-by date) and farmers can send quotes. Accepting a quote creates a standard Order.
- Invoices: Completed orders have a "Download Invoice (PDF)" button for both farmer and buyer.`;

function detectMentionedCrops(messageText = '') {
  const lower = messageText.toLowerCase();
  const matched = [];
  for (const item of KNOWN_CROPS) {
    if (item.terms.some((t) => lower.includes(t))) {
      matched.push(item.key);
    }
  }
  return matched.slice(0, 2);
}

function isAskingAboutUserActivity(messageText = '') {
  const lower = messageText.toLowerCase();
  const keywords = [
    'my crop',
    'my listing',
    'my order',
    'my sale',
    'my earning',
    'pending order',
    'status',
    'నా పంట',
    'నా ఆర్డర్',
    'లిస్టింగ్'
  ];
  return keywords.some((k) => lower.includes(k));
}

function isAskingPlatformFaq(messageText = '') {
  const lower = messageText.toLowerCase();
  const keywords = [
    'how to',
    'how do i',
    'payment',
    'upi',
    'qr',
    'invoice',
    'disease',
    'transport',
    'requirement',
    'quote',
    'sell',
    'buy',
    'register',
    'otp',
    'ఎలా',
    'పేమెంట్',
    'రవాణా'
  ];
  return keywords.some((k) => lower.includes(k));
}

async function buildAssistantContext({ user = null, message = '', language = 'en' }) {
  const contextBlocks = [];
  let containsUserData = false;

  // 1. Mandi price context if a crop is mentioned or user asks about price/rate/mandi
  const mentionedCrops = detectMentionedCrops(message);
  const asksPrice = /price|rate|mandi|cost|ధర|మార్కెట్|రేటు/i.test(message);

  if (mentionedCrops.length > 0 || asksPrice) {
    const cropsToFetch = mentionedCrops.length > 0 ? mentionedCrops : ['Tomato', 'Rice'];
    const userState = user?.location?.state || 'Andhra Pradesh';
    const priceSummaries = [];

    for (const cropName of cropsToFetch) {
      try {
        const p = await getMandiPrice(cropName, userState);
        priceSummaries.push(
          `- ${p.crop} (${p.state}): Latest modal price ₹${p.latestPrice}/quintal (≈ ₹${p.suggestedPricePerKg}/kg), 30-day trend: ${p.trendDirection} (${p.changePercent > 0 ? '+' : ''}${p.changePercent}%), source: ${p.source}.`
        );
      } catch {
        // ignore single price error
      }
    }

    if (priceSummaries.length > 0) {
      contextBlocks.push(`Current Verified Mandi Prices:\n${priceSummaries.join('\n')}`);
    }
  }

  // 2. Scrubbed user listings/orders summary if logged in and relevant
  if (user && user._id && isAskingAboutUserActivity(message)) {
    containsUserData = true;
    try {
      const [myCrops, myOrders] = await Promise.all([
        Crop.find({ farmer: user._id })
          .select('name category quantity unit pricePerUnit status')
          .limit(5)
          .lean(),
        Order.find({ $or: [{ farmer: user._id }, { buyer: user._id }] })
          .populate('crop', 'name unit')
          .select('quantity totalPrice status paymentStatus createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      ]);

      const cropLines =
        myCrops.length > 0
          ? myCrops
              .map(
                (c) =>
                  `${scrubText(c.name)} (${c.quantity} ${c.unit} @ ₹${c.pricePerUnit}/${c.unit}, status=${c.status})`
              )
              .join('; ')
          : 'No active crop listings.';

      const orderLines =
        myOrders.length > 0
          ? myOrders
              .map(
                (o) =>
                  `${o.crop?.name || 'Crop'}: ${o.quantity} ${o.crop?.unit || 'kg'}, total=₹${o.totalPrice}, status=${o.status}, payment=${o.paymentStatus || 'unpaid'}`
              )
              .join('; ')
          : 'No recent orders.';

      contextBlocks.push(
        `Logged-in User Summary (Role: ${user.role}, State: ${user.location?.state || 'India'}):\n- Own Listings: ${cropLines}\n- Recent Orders: ${orderLines}`
      );
    } catch {
      // ignore DB error
    }
  }

  // 3. Platform How-To FAQs if relevant (or if no other specific context matched)
  if (isAskingPlatformFaq(message) || contextBlocks.length === 0) {
    contextBlocks.push(PLATFORM_FAQS);
  }

  const langInstruction =
    language === 'te'
      ? 'You MUST reply in clear, natural Telugu script (తెలుగు). Keep agricultural and technical terms easy to understand for Telugu farmers and buyers.'
      : 'You MUST reply in clear, simple English suitable for Indian farmers and buyers.';

  const systemPrompt = `You are "AgriConnect Sahayak", a helpful agriculture and direct-marketplace assistant for Indian farmers and buyers.
${langInstruction}

Strict Guidelines:
1. Keep answers short, practical, and easy to read (use bullet points where helpful, max 120 words).
2. If you do not know an answer or do not have the exact data, explicitly say "I'm not sure" (or "నాకు ఖచ్చితంగా తెలియదు" in Telugu) instead of guessing.
3. NEVER give guarantees about money, market profits, crop yields, or human/veterinary medical matters.
4. For severe crop pests/diseases, advise consulting the local Rythu Bharosa Kendra / Agriculture Officer or calling the Kisan Call Centre (1800-180-1551).
5. Use ONLY the verified context below when answering questions about prices, user orders, or platform features:

${contextBlocks.join('\n\n')}`;

  return {
    systemPrompt,
    containsUserData,
    contextSummary: contextBlocks
  };
}

/**
 * Generates a helpful bilingual fallback reply when no LLM provider is configured/reachable.
 */
async function buildOfflineAssistantReply({ message = '', language = 'en', user = null }) {
  const mentioned = detectMentionedCrops(message);
  let priceLineEn = '';
  let priceLineTe = '';

  if (mentioned.length > 0) {
    try {
      const p = await getMandiPrice(mentioned[0], user?.location?.state || 'Andhra Pradesh');
      priceLineEn = `\n• Latest ${p.crop} Mandi Price (${p.state}): ₹${p.latestPrice}/quintal (≈ ₹${p.suggestedPricePerKg}/kg), trend: ${p.trendDirection}.`;
      priceLineTe = `\n• ప్రస్తుత ${p.crop} మార్కెట్ ధర (${p.state}): ₹${p.latestPrice}/క్వింటాల్ (≈ ₹${p.suggestedPricePerKg}/కిలో), ట్రెండ్: ${p.trendDirection}.`;
    } catch {
      // ignore
    }
  }

  if (language === 'te') {
    return `నమస్కారం! నేను అగ్రికనెక్ట్ సహాయకుడిని (ఆఫ్‌లైన్ మోడ్).${priceLineTe}
• పంటను అమ్మడానికి: "/farmer/add-crop" పేజీలో ఫోటో అప్‌లోడ్ చేసి "Auto-fill from photo" బటన్ నొక్కండి.
• ఆకు వ్యాధి నిర్ధారణకు: "/farmer/disease-check" లో ఆకు ఫోటో అప్‌లోడ్ చేయండి లేదా కిసాన్ కాల్ సెంటర్ (1800-180-1551) కు కాల్ చేయండి.
• చెల్లింపులు: రైతు ప్రొఫైల్‌లో UPI ID జతచేస్తే, కొనుగోలుదారులు నేరుగా UPI QR స్కాన్ చేసి చెల్లించవచ్చు.
(గమనిక: ఇది సాధారణ సూచన మాత్రమే. ఖచ్చితమైన నిర్ధారణ కోసం స్థానిక వ్యవసాయ అధికారిని సంప్రదించండి.)`;
  }

  return `Hello! I am AgriConnect Sahayak (Offline Mode).${priceLineEn}
• To list produce: Go to "/farmer/add-crop", upload a crop photo, and click "Auto-fill from photo".
• For leaf/crop issues: Visit "/farmer/disease-check" to analyze a plant photo, or call the Kisan Call Centre at 1800-180-1551.
• For direct payments: Farmers can add their UPI ID in "/profile" to generate a zero-commission UPI QR code on accepted orders.
• For buyer bulk requests: Visit "/requirements" to post or quote on crop requirements.
(Note: I'm not sure about live cloud AI details while no LLM key is configured; AI replies are suggestions and may be imperfect.)`;
}

module.exports = {
  buildAssistantContext,
  buildOfflineAssistantReply
};

