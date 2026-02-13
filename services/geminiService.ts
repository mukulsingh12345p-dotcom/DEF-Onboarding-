
import { GoogleGenAI } from "@google/genai";
import { QuizQuestion } from "../types";

// Safe access to process.env for browser environments to prevent crashes
const getApiKey = () => {
  try {
    // Check if process is defined (Node.js/Build time)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
    // Fallback for Vite/Browser environments if relying on import.meta (optional, depending on build config)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
    }
  } catch (e) {
    console.warn("Could not access environment variables");
  }
  return '';
};

const apiKey = getApiKey() || ''; 
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateQuizFromTopic = async (topic: string, role: string): Promise<QuizQuestion[]> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning mock quiz.");
    return [
        { text: "Sample Question 1 (AI Unavailable)", options: ["A", "B", "C", "D"], correctAnswer: 0 },
        { text: "Sample Question 2 (AI Unavailable)", options: ["A", "B", "C", "D"], correctAnswer: 1 },
    ];
  }

  try {
    const model = 'gemini-2.5-flash'; // Updated to valid model as per guidelines
    const prompt = `Generate a 10-question multiple-choice quiz for a ${role} training module.
    
    Context/Transcript: 
    ${topic.substring(0, 5000)}
    
    Return the output strictly as a JSON array of objects with this schema:
    [
      {
        "text": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": 0 // index of correct option (0-3)
      }
    ]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return [];
  }
};
