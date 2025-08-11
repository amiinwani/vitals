// Thin wrapper to expose OpenAI client helpers from src utils
const { createOpenAIClient, uploadAndExtractPdfToJson } = require('../src/utils/openaiClient');

module.exports = {
  createOpenAIClient,
  uploadAndExtractPdfToJson,
};


