const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

function maskKey(key) {
  if (!key || key.length < 12) return key || '';
  return `${key.slice(0, 8)}...${key.slice(-6)}`;
}

// Only use environment variable; never hardcode secrets and never log full keys
const SELECTED_API_KEY = process.env.OPENAI_API_KEY || '';
console.log('[OpenAI] Configured API key (masked):', maskKey(SELECTED_API_KEY));

// Polyfill File for Node < 20
try {
  if (typeof globalThis.File === 'undefined') {
    const { File } = require('node:buffer');
    // eslint-disable-next-line no-global-assign
    globalThis.File = File;
  }
} catch (_) {
  // ignore if polyfill fails; SDK may still accept streams
}

function createOpenAIClient() {
  const apiKey = SELECTED_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  console.log('[OpenAI] Creating client with API key (masked):', maskKey(apiKey));
  return new OpenAI({ apiKey });
}

/**
 * Upload a local PDF file to OpenAI and request a concise JSON representation.
 * This uses the latest API that supports file inputs directly.
 * The model is prompted to return strictly valid JSON with dynamic keys.
 *
 * @param {OpenAI} openai
 * @param {string} pdfPath
 * @returns {Promise<object>} Parsed JSON object
 */
async function uploadAndExtractPdfToJson(openai, pdfPath) {
  console.log('[OpenAI] Starting PDF extraction for:', pdfPath);
  // Create a readable stream for the PDF
  const fileStream = fs.createReadStream(pdfPath);

  // 1) Upload file to OpenAI Files API
  console.log('[OpenAI] Uploading file to OpenAI Files API with key (masked):', maskKey(SELECTED_API_KEY));
  const uploaded = await openai.files.create({ file: fileStream, purpose: 'assistants' });
  console.log('[OpenAI] File uploaded. file_id:', uploaded.id);

  // 2) Use Responses API with input_files to ask for concise JSON
  const systemInstruction = [
    'You are a data extraction assistant. Given a PDF lab report, extract relevant fields into a concise JSON object.',
    'Keys are not predefined—derive them from the document. Examples: name, age, test_field, date_of_report, etc.',
    'Only include fields that exist in the PDF. Omit anything not present.',
    'Return strictly valid JSON (UTF-8, no comments, no trailing commas). Do not include explanations. INCLUD ONLY THE MAIN FIELDS THAT SEEM NECESARY LIKE AGE NAME, REPORT FIELDS.', 
  ].join(' ');

  const userInstruction = [
    'Parse the attached PDF and return a concise JSON capturing the most important fields.',
    'Focus on patient info and measured results. Keep it compact but complete.',
  ].join(' ');

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  console.log('[OpenAI] Creating response with model:', model);
  console.log('[OpenAI] Using API key for response (masked):', maskKey(SELECTED_API_KEY));
  const response = await openai.responses.create({
    model,
    input: [
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: userInstruction },
          { type: 'input_file', file_id: uploaded.id },
        ],
      },
    ],
    // Intentionally avoid response_format/text.format to keep broad compatibility
  });

  // 3) Extract text from the response; OpenAI SDK v5 returns structured content
  const text = response.output_text || JSON.stringify(response.output, null, 2);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // Fallback: attempt to extract JSON substring
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON');
    parsed = JSON.parse(match[0]);
  }
  console.log('[OpenAI] Parsed JSON keys:', Object.keys(parsed || {}));
  return parsed;
}

module.exports = {
  createOpenAIClient,
  uploadAndExtractPdfToJson,
};


