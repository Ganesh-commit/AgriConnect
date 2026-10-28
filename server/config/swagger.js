/**
 * OpenAPI 3.0 Specification & Swagger UI Middleware (/api/docs)
 * Uses `swagger-ui-express` if installed, with a built-in Swagger UI HTML fallback
 * so `/api/docs` and `/api/docs.json` work reliably in every environment.
 */

let swaggerUi = null;
try {
  swaggerUi = require('swagger-ui-express');
} catch {
  swaggerUi = null;
}

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AgriConnect Direct Farmer-to-Buyer Marketplace API',
    version: '2.0.0',
    description:
      'REST API for AgriConnect including Multi-Provider LLM Layer (Gemini + Ollama), Bilingual Assistant, Crop Disease Detection, Auto-Listing from Photo, Mandi Prices & Forecast, Direct UPI QR Settlement, PDF Invoices, Reverse Marketplace, Government Schemes, and Weather Alerts.'
  },
  servers: [
    {
      url: '/api',
      description: 'AgriConnect API Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'API Server Health Check',
        responses: { 200: { description: 'Server operational' } }
      }
    },
    '/ai/health': {
      get: {
        tags: ['AI & LLM Layer'],
        summary: 'Multi-Provider LLM Health, Active Models & Fallback Order',
        responses: { 200: { description: 'LLM diagnostic report' } }
      }
    },
    '/ai/chat': {
      post: {
        tags: ['AI & LLM Layer'],
        summary: 'Bilingual AI Assistant Chat (English + Telugu)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'What is the current tomato mandi price?' },
                  language: { type: 'string', enum: ['en', 'te'], default: 'en' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Assistant reply with provider metadata' } }
      }
    },
    '/ai/chat/stream': {
      post: {
        tags: ['AI & LLM Layer'],
        summary: 'SSE Streaming Bilingual AI Assistant Chat',
        responses: { 200: { description: 'text/event-stream SSE tokens' } }
      }
    },
    '/ai/disease-check': {
      post: {
        tags: ['AI & LLM Layer'],
        security: [{ bearerAuth: [] }],
        summary: 'Crop Disease Detection from Leaf Photo (Vision)',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  image: { type: 'string', format: 'binary' },
                  cropName: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Structured disease diagnosis & remedies' } }
      }
    },
    '/ai/auto-list-photo': {
      post: {
        tags: ['AI & LLM Layer'],
        security: [{ bearerAuth: [] }],
        summary: 'Auto-Fill Crop Listing Fields from Produce Photo (Vision)',
        responses: { 200: { description: 'Suggested name, category, qualityNotes, description' } }
      }
    },
    '/prices': {
      get: {
        tags: ['Mandi Prices'],
        summary: 'Get Current Mandi Price & Suggested Rate',
        parameters: [
          { name: 'crop', in: 'query', schema: { type: 'string', example: 'Tomato' } },
          { name: 'state', in: 'query', schema: { type: 'string', example: 'Andhra Pradesh' } },
          { name: 'district', in: 'query', schema: { type: 'string', example: 'Guntur' } }
        ],
        responses: { 200: { description: 'Mandi prices & latest modal rate' } }
      }
    },
    '/prices/trend': {
      get: {
        tags: ['Mandi Prices'],
        summary: 'Get 30-Day Mandi Price Trend, 7-Day Linear Regression Forecast & AI Insight',
        parameters: [
          { name: 'crop', in: 'query', schema: { type: 'string', example: 'Tomato' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }
        ],
        responses: { 200: { description: '30-day series, forecast & AI insight' } }
      }
    },
    '/auth/providers': {
      get: {
        tags: ['Authentication'],
        summary: 'Check Enabled Auth Providers (Firebase Phone OTP, Google OAuth)',
        responses: { 200: { description: 'Configured auth providers' } }
      }
    },
    '/auth/firebase-phone': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Firebase Phone OTP ID Token and Issue AgriConnect JWT',
        responses: { 200: { description: 'JWT issued' } }
      }
    },
    '/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Google OAuth ID Token and Issue AgriConnect JWT',
        responses: { 200: { description: 'JWT issued' } }
      }
    },
    '/crops': {
      get: {
        tags: ['Crops & Geo Search'],
        summary: 'Browse & Filter Marketplace Crops',
        responses: { 200: { description: 'Paginated crop listings' } }
      }
    },
    '/crops/nearby': {
      get: {
        tags: ['Crops & Geo Search'],
        summary: 'Radius Geo-Search ($geoNear 2dsphere) within 10/25/50/100 km',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 50 } }
        ],
        responses: { 200: { description: 'Nearby crops sorted by distance' } }
      }
    },
    '/crops/{id}/transport-estimate': {
      get: {
        tags: ['Crops & Geo Search'],
        summary: 'Haversine Distance & Rough Transport Cost Estimate',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'buyerDistrict', in: 'query', schema: { type: 'string' } },
          { name: 'quantity', in: 'query', schema: { type: 'number', default: 100 } }
        ],
        responses: { 200: { description: 'Distance (km), cost estimate & booking link' } }
      }
    },
    '/orders/{id}/upi-qr': {
      get: {
        tags: ['Orders, UPI QR & Invoices'],
        security: [{ bearerAuth: [] }],
        summary: 'Generate Direct Farmer UPI Deep Link & QR Code (No Payment Gateway)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'UPI URI & QR Data URL' } }
      }
    },
    '/orders/{id}/mark-paid': {
      put: {
        tags: ['Orders, UPI QR & Invoices'],
        security: [{ bearerAuth: [] }],
        summary: 'Farmer Manually Marks Order as Paid',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order marked paid' } }
      }
    },
    '/orders/{id}/invoice': {
      get: {
        tags: ['Orders, UPI QR & Invoices'],
        security: [{ bearerAuth: [] }],
        summary: 'Download PDF Invoice for Completed/Paid Order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'application/pdf binary stream' } }
      }
    },
    '/requirements': {
      get: {
        tags: ['Reverse Marketplace'],
        summary: 'Browse Open Buyer Crop Requirements',
        responses: { 200: { description: 'List of buyer requirements & quotes' } }
      },
      post: {
        tags: ['Reverse Marketplace'],
        security: [{ bearerAuth: [] }],
        summary: 'Buyer Posts a Crop Requirement',
        responses: { 201: { description: 'Requirement created & farmers notified' } }
      }
    },
    '/requirements/{id}/quotes': {
      post: {
        tags: ['Reverse Marketplace'],
        security: [{ bearerAuth: [] }],
        summary: 'Farmer Submits a Quote on a Buyer Requirement',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Quote submitted' } }
      }
    },
    '/requirements/{id}/quotes/{quoteId}/accept': {
      put: {
        tags: ['Reverse Marketplace'],
        security: [{ bearerAuth: [] }],
        summary: 'Buyer Accepts a Farmer Quote (Converts to a Normal Order)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'quoteId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Order created from quote' } }
      }
    },
    '/schemes': {
      get: {
        tags: ['Government Schemes & Weather'],
        summary: 'List Official Indian Government Agricultural Schemes',
        responses: { 200: { description: 'Official schemes list' } }
      }
    },
    '/weather': {
      get: {
        tags: ['Government Schemes & Weather'],
        summary: 'Get Current Weather, 5-Day Forecast & Rain Alert (30-min cache)',
        responses: { 200: { description: 'Weather & rain advisory' } }
      }
    }
  }
};

function setupSwagger(app) {
  app.get('/api/docs.json', (req, res) => {
    res.status(200).json(openApiSpec);
  });

  if (swaggerUi) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  } else {
    app.get('/api/docs', (req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AgriConnect API Documentation (OpenAPI 3.0)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body style="margin:0;background:#f8fafc">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true
      });
    };
  </script>
</body>
</html>`);
    });
  }
}

module.exports = {
  openApiSpec,
  setupSwagger
};

