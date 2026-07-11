const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key exists:', !!apiKey);

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    const response = await ai.models.list();
    const list = response.models || response;
    const filtered = list.filter(m => /omni|veo|banana|image/i.test(m.name || ''));
    console.log('Filtered models:');
    filtered.forEach(m => console.log(`- ${m.name}`));
  } catch (error) {
    console.error('Error listing models:', error.message || error);
  }
}

listModels();
