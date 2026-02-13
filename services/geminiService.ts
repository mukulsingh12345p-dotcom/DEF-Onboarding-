
import { GoogleGenAI } from "@google/genai";
import { QuizQuestion } from "../types";

const apiKey = process.env.API_KEY || ''; 
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
    const model = 'gemini-3-flash-preview';
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
