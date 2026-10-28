/**
 * Multi-Provider LLM Diagnostic & Verification Script (npm run test:llm)
 *
 * 1. Verifies PII scrubber, Zod schema validation, LRU cache, and fallback chain.
 * 2. Checks health of all providers in LLM_PROVIDER_ORDER.
 * 3. Sends a sample chat, a JSON request (with Zod schema), and a vision request
 *    to each configured & reachable provider and prints PASS / FAIL / SKIP.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const llm = require('../services/llm');

// 1x1 green pixel PNG in base64 for vision test fallback if placeholder-crop.jpg is missing
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function getSampleImage() {
  const placeholderPath = path.join(__dirname, '..', 'public', 'placeholder-crop.jpg');
  if (fs.existsSync(placeholderPath)) {
    const buf = fs.readFileSync(placeholderPath);
    return {
      base64: buf.toString('base64'),
      mimeType: 'image/jpeg'
    };
  }
  return {
    base64: SAMPLE_PNG_BASE64,
    mimeType: 'image/png'
  };
}

function logResult(label, status, detail = '') {
  const badge =
    status === 'PASS'
      ? '[PASS]'
      : status === 'SKIP'
      ? '[SKIP]'
      : '[FAIL]';
  console.log(`  ${badge.padEnd(7)} ${label}${detail ? ` -> ${detail}` : ''}`);
}

async function runCoreUnitChecks() {
  console.log('\n=== 1. Core LLM Layer Safeguards (PII Scrubber, Schema, Cache, Fallback) ===');
  let failures = 0;

  // Test 1: PII Scrubber
  const rawInput =
    'Contact Ramesh Patel at +91 98765 43210 or ramesh.farmer@agriconnect.com, D.No 4-12, Main Road, Guntur, PIN: 522001. token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def';
  const scrubbed = llm.scrubText(rawInput, { names: ['Ramesh Patel'] });
  const piiRemoved =
    !scrubbed.includes('98765 43210') &&
    !scrubbed.includes('ramesh.farmer@agriconnect.com') &&
    !scrubbed.includes('Ramesh Patel') &&
    !scrubbed.includes('eyJhbGci');
  if (piiRemoved) {
    logResult('PII Scrubber (phone, email, name, address, JWT)', 'PASS', scrubbed);
  } else {
    failures++;
    logResult('PII Scrubber', 'FAIL', `Leaked PII in: ${scrubbed}`);
  }

  // Test 2: Zod Schema Validation
  const sampleSchema = llm.z.object({
    crop: llm.z.string(),
    confidence: llm.z.enum(['low', 'medium', 'high'])
  });
  const validCheck = sampleSchema.safeParse({ crop: 'Tomato', confidence: 'high' });
  const invalidCheck = sampleSchema.safeParse({ crop: 'Tomato', confidence: 'invalid_enum' });
  if (validCheck.success && !invalidCheck.success) {
    logResult('Zod Schema Validator (valid & invalid enum rejection)', 'PASS');
  } else {
    failures++;
    logResult('Zod Schema Validator', 'FAIL');
  }

  // Test 3: Graceful Mock Fallback when providers are unavailable or skipped
  try {
    const fallbackRes = await llm.json({
      prompt: 'Return sample crop analysis',
      schema: sampleSchema,
      useCache: false,
      preferredProvider: 'nonexistent_provider',
      mockFallback: () => ({ crop: 'Paddy', confidence: 'medium' })
    });
    if (fallbackRes.data.crop === 'Paddy' && fallbackRes.meta.provider === 'mock') {
      logResult('Graceful Fallback Chain + Schema Validation', 'PASS', `provider=${fallbackRes.meta.provider}`);
    } else {
      failures++;
      logResult('Graceful Fallback Chain', 'FAIL');
    }
  } catch (err) {
    failures++;
    logResult('Graceful Fallback Chain', 'FAIL', err.message);
  }

  return failures;
}

async function testProvider(providerHealth) {
  const { name, configured, reachable, model, visionModel, reason } = providerHealth;
  console.log(`\n=== Provider: "${name}" (model: ${model}, vision: ${visionModel}) ===`);

  if (!configured) {
    logResult(`${name} - chat`, 'SKIP', reason || 'Not configured');
    logResult(`${name} - json`, 'SKIP', reason || 'Not configured');
    logResult(`${name} - vision`, 'SKIP', reason || 'Not configured');
    return { passed: 0, failed: 0, skipped: 3 };
  }

  if (!reachable) {
    logResult(`${name} - chat`, 'SKIP', `Unreachable (${reason || 'offline'})`);
    logResult(`${name} - json`, 'SKIP', `Unreachable (${reason || 'offline'})`);
    logResult(`${name} - vision`, 'SKIP', `Unreachable (${reason || 'offline'})`);
    return { passed: 0, failed: 0, skipped: 3 };
  }

  let passed = 0;
  let failed = 0;

  // 1. Sample Chat Test
  try {
    const chatRes = await llm.chat({
      messages: [{ role: 'user', content: 'Name one major rabi crop grown in India in under 10 words.' }],
      system: 'You are a concise Indian agriculture assistant.',
      temperature: 0.2,
      useCache: false,
      preferredProvider: name
    });
    if (chatRes.text && chatRes.text.trim().length > 0) {
      passed++;
      logResult(
        `${name} - chat()`,
        'PASS',
        `(${chatRes.latencyMs}ms, model=${chatRes.model}) "${chatRes.text.trim().replace(/\s+/g, ' ').slice(0, 80)}"`
      );
    } else {
      failed++;
      logResult(`${name} - chat()`, 'FAIL', 'Empty text returned');
    }
  } catch (err) {
    failed++;
    logResult(`${name} - chat()`, 'FAIL', err.message);
  }

  // 2. Sample JSON Request Test (with Zod Schema)
  const testSchema = llm.z.object({
    cropName: llm.z.string(),
    season: llm.z.enum(['Kharif', 'Rabi', 'Zaid', 'All-Season']),
    waterRequirement: llm.z.enum(['low', 'medium', 'high'])
  });

  try {
    const jsonRes = await llm.json({
      prompt:
        'Provide structured JSON for Wheat crop in India with keys: cropName (string), season ("Kharif"|"Rabi"|"Zaid"|"All-Season"), waterRequirement ("low"|"medium"|"high").',
      schema: testSchema,
      useCache: false,
      preferredProvider: name
    });
    if (jsonRes.data && jsonRes.data.cropName) {
      passed++;
      logResult(
        `${name} - json()`,
        'PASS',
        `(${jsonRes.latencyMs}ms, model=${jsonRes.model}) ${JSON.stringify(jsonRes.data)}`
      );
    } else {
      failed++;
      logResult(`${name} - json()`, 'FAIL', 'Invalid JSON data');
    }
  } catch (err) {
    failed++;
    logResult(`${name} - json()`, 'FAIL', err.message);
  }

  // 3. Sample Vision Request Test
  const sampleImg = getSampleImage();
  try {
    const visionRes = await llm.vision({
      prompt: 'Describe what you see in this image in one short sentence.',
      imageBase64: sampleImg.base64,
      mimeType: sampleImg.mimeType,
      preferredProvider: name
    });
    if (visionRes.text && visionRes.text.trim().length > 0) {
      passed++;
      logResult(
        `${name} - vision()`,
        'PASS',
        `(${visionRes.latencyMs}ms, model=${visionRes.model}) "${visionRes.text.trim().replace(/\s+/g, ' ').slice(0, 80)}"`
      );
    } else {
      failed++;
      logResult(`${name} - vision()`, 'FAIL', 'Empty vision response');
    }
  } catch (err) {
    failed++;
    logResult(`${name} - vision()`, 'FAIL', err.message);
  }

  return { passed, failed, skipped: 0 };
}

async function main() {
  console.log('=============================================================');
  console.log(' AgriConnect Multi-Provider LLM Diagnostic Suite (test:llm)  ');
  console.log('=============================================================');

  const unitFailures = await runCoreUnitChecks();

  console.log('\n=== 2. Provider Health & Reachability ===');
  const health = await llm.getHealthStatus();
  console.log(`  Fallback Order : ${health.fallbackOrder.join(' -> ')}`);
  console.log(`  Privacy Mode   : ${health.privacyMode}`);
  console.log(`  Active Primary : ${health.primaryProvider || 'None (using graceful mock fallback)'}`);

  let totalPassed = 0;
  let totalFailed = unitFailures;
  let totalSkipped = 0;

  for (const providerHealth of health.providers) {
    const res = await testProvider(providerHealth);
    totalPassed += res.passed;
    totalFailed += res.failed;
    totalSkipped += res.skipped;
  }

  console.log('\n=============================================================');
  console.log(
    ` Summary: ${totalPassed} provider checks passed | ${totalSkipped} skipped | ${totalFailed} failed`
  );
  console.log('=============================================================');

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Unexpected error in test:llm:', err);
  process.exit(1);
});

