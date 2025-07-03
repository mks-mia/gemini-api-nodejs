require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Error: API_KEY not found in .env file. Please ensure it's set correctly.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });

// --- Define your specific questions, their answers, AND their intent identifiers/phrases ---
// Using an array of objects for more structured FAQ entries
const faqEntries = [
  {
    id: "services", // Unique ID for this FAQ
    questionPhrases: ["what service do you provide?", "what services do you offer?", "tell me about your services", "list your offerings"], // Common ways users might ask
    answer: "We have several services such as AI-powered chat assistants, content generation for marketing, data analysis insights, and personalized learning modules. How can I assist you with these services?"
  },
  {
    id: "working_hours",
    questionPhrases: ["what are your working hours?", "when are you open?", "what hours do you operate?", "your open hours"],
    answer: "Our support team is available Monday to Friday, from 9 AM to 5 PM Eastern Time."
  },
  {
    id: "contact_support",
    questionPhrases: ["how can I contact support?", "get in touch with support", "support contact", "call support", "email support"],
    answer: "You can contact our support team by emailing support@example.com or calling us at 1-800-123-4567."
  }
  // Add more specific questions and answers here, with various phrasing
];

// Map for quick lookup of answers by ID
const faqAnswersById = new Map(faqEntries.map(entry => [entry.id, entry.answer]));

// --- No need for `normalizePrompt` anymore for direct matching ---

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for generating content
app.post('/generate', async (req, res) => {
  const { prompt, userInfo, sessionId } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // --- Step 1: Prepare the Intent Recognition Prompt for Gemini ---
  // Instruct Gemini to identify the intent
  let intentPrompt = `Analyze the following user question and determine if it matches any of these predefined topics:\n\n`;
  faqEntries.forEach(entry => {
    intentPrompt += `- **${entry.id}**: ${entry.questionPhrases.join(' | ')}\n`;
  });
  intentPrompt += `\nUser question: "${prompt}"\n\n`;
  intentPrompt += `If the user question clearly matches one of the topics above, respond ONLY with the ID of that topic (e.g., "services", "working_hours", "contact_support"). If it does not clearly match any of these, respond ONLY with "none".`;

  console.log(`Sending intent recognition prompt to Gemini: "${intentPrompt.split('\n')[0]}..."`);

  let recognizedIntent = 'none';
  try {
    const intentResult = await model.generateContent(intentPrompt);
    const intentResponse = await intentResult.response;
    recognizedIntent = intentResponse.text().trim().toLowerCase();
    console.log(`Gemini recognized intent: "${recognizedIntent}"`);
  } catch (intentError) {
    console.warn("Warning: Failed to use Gemini for intent recognition, falling back to direct AI generation.", intentError);
    // If intent recognition fails, we'll just fall through to the general AI response
  }

  // --- Step 2: Check if Gemini identified a predefined intent ---
  if (faqAnswersById.has(recognizedIntent)) {
    const predefinedAnswer = faqAnswersById.get(recognizedIntent);
    console.log(`Matched intent "${recognizedIntent}". Returning predefined answer.`);
    return res.json({ text: predefinedAnswer });
  }

  // --- Step 3: If no predefined intent, proceed with Gemini's general response ---
  // You can still include userInfo for Gemini's general understanding if you choose
  let geminiPrompt = prompt; // Original prompt for general AI response
  if (userInfo) {
    geminiPrompt = `User's Name: ${userInfo.name || 'N/A'}\n` +
                   `User's Phone: ${userInfo.phone || 'N/A'}\n` +
                   `User's Address: ${userInfo.address || 'N/A'}\n\n` +
                   `User's Request: ${prompt}`;
  }

  try {
    console.log(`No predefined intent. Sending to Gemini for general response: "${geminiPrompt}"`);
    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text();
    console.log("Generated text successfully via Gemini.");
    res.json({ text: text });
  } catch (error) {
    console.error("Error generating content:", error);
    let errorMessage = "An error occurred while processing your request.";
    let statusCode = 500;

    if (error.status === 404 && error.statusText === 'Not Found') {
      errorMessage = `Model 'gemma-3-12b-it' might not be available or supported for 'generateContent' in your region or for your API key.`;
      statusCode = 404;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

// Catch-all for any other routes to serve index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Frontend served from http://localhost:${PORT}`);
});