const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5173;

// Check if environment variables are loaded
console.log('Environment check:');
console.log('- PORT:', PORT);
console.log('- API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'No');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // If API key not set, return a safe mocked response for local dev
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set — returning mocked response');
    const mocked = `Mocked Gemini response for prompt:\n\n${prompt.substring(0, 400)}...`;
    return res.json({ response: mocked });
  }

  try {
    console.log('Making request to Gemini API...');

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    console.log('Gemini API Response received successfully');

    res.json({ response: responseText });
  } catch (err) {
    console.error('Error calling Gemini API:', err.message || err);
    res.status(502).json({ 
      error: 'Failed to contact Gemini API', 
      details: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
