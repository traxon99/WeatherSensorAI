/*
WeatherSensorAI
Authors: Manu Redd, Riley England, Jackson Yanek, Evans Chigweshe
Course/Project: EECS 581 Project 3
Source Used: Generative AI (ChatGPT, Claude), Documentation (Express.js, Google Generative AI, Node.js), StackOverflow
Date: 12-07-2025

File Overview and Purpose:
This file implements the backend Express server for WeatherSensorAI. It serves as a proxy between the 
frontend application and the Google Gemini API, handling AI requests for weather summaries and chat 
functionality. The server provides CORS-enabled API endpoints and manages environment variables for 
secure API key storage.

File Architecture:
- POST /api/gemini - Main endpoint for Gemini AI requests
  Parameters: { prompt: string }
  Returns: { response: string } or { error: string, details: string }
- Environment Variables:
  - GEMINI_API_KEY: Google Gemini API authentication key
  - PORT: Server port (default: 5173)
- Dependencies:
  - express: Web server framework
  - cors: Cross-Origin Resource Sharing middleware
  - dotenv: Environment variable management
  - @google/generative-ai: Google Gemini AI SDK
*/

// Import required Node.js modules for server functionality
const express = require('express');  // Web framework for creating REST APIs
const cors = require('cors');  // Middleware to enable Cross-Origin Resource Sharing
const dotenv = require('dotenv');  // Loads environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');  // Google's Gemini AI SDK

// Load environment variables from .env file into process.env
dotenv.config();

// Initialize Express application instance
const app = express();

// Enable CORS for all routes - allows frontend from different origin to access API
app.use(cors());

// Parse incoming JSON request bodies and make them available in req.body
app.use(express.json());

// Set server port from environment variable, default to 5173 if not specified
const PORT = process.env.PORT || 5173;

// Startup diagnostics: Log environment configuration to console for debugging
console.log('Environment check:');
console.log('- PORT:', PORT);
console.log('- API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'No');

// Initialize Google Gemini AI client with API key from environment
// This creates a reusable AI client instance for all subsequent requests
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/gemini - Main API endpoint for Gemini AI requests
 * Receives a prompt from frontend, forwards it to Gemini, and returns the AI response
 * Acts as a secure proxy to keep API keys server-side
 */
app.post('/api/gemini', async (req, res) => {
  // Extract prompt from request body, use empty object as fallback
  const { prompt } = req.body || {};

  // Validate that prompt exists - return 400 Bad Request if missing
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  // Retrieve API key for additional validation
  const apiKey = process.env.GEMINI_API_KEY;

  // Development fallback: If API key isn't configured, return mocked response
  // This allows frontend development/testing without a valid Gemini API key
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set — returning mocked response');
    const mocked = `Mocked Gemini response for prompt:\n\n${prompt.substring(0, 400)}...`;
    return res.json({ response: mocked });
  }

  try {
    console.log('Making request to Gemini API...');

    // Get the Gemini 2.0 Flash model instance
    // This is Google's latest fast and efficient generative AI model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Send the prompt to Gemini and wait for generation to complete
    const result = await model.generateContent(prompt);
    
    // Extract the response object from the result
    const response = await result.response;
    
    // Convert response to plain text format
    const responseText = response.text();

    console.log('Gemini API Response received successfully');

    // Send successful response back to frontend with AI-generated text
    res.json({ response: responseText });
  } catch (err) {
    // Log error details to server console for debugging
    console.error('Error calling Gemini API:', err.message || err);
    
    // Return 502 Bad Gateway error to frontend with error details
    // 502 indicates the server received an invalid response from upstream API
    res.status(502).json({ 
      error: 'Failed to contact Gemini API', 
      details: err.message 
    });
  }
});

// Start the Express server and listen for incoming requests on specified PORT
app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
