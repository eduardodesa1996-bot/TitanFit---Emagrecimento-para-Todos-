
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Workout, Meal, IntelItem } from "../types";

// Helper to ensure AI is initialized only when needed and with a valid key
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment. AI features may be limited.");
    return new GoogleGenAI({ apiKey: "temporary_key_for_build" });
  }
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: string) => lang === 'pt' ? 'Portuguese' : 'English';

export const getFitnessIntelligence = async (goal: string, language: string): Promise<IntelItem[]> => {
  const ai = getAI();
  const langName = getLanguageName(language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find the top 3 latest, scientifically-backed weight loss and fitness tips for everyone (inclusive) in 2024 related to ${goal}. Respond strictly in ${langName}. Provide brief summaries.`,
    config: {
      tools: [{ googleSearch: {} }]
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const text = response.text || "";
  const tips = text.split('\n').filter(t => t.length > 20).slice(0, 3);
  
  return tips.map((tip, i) => ({
    title: language === 'pt' ? `Insight #${i + 1}` : `Insight #${i + 1}`,
    snippet: tip,
    url: chunks[i]?.web?.uri || 'https://google.com/search?q=fitness+tips'
  }));
};

export const generateDailyWorkout = async (profile: UserProfile): Promise<Workout> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a personalized high-intensity workout for a ${profile.gender} with the following profile: ${JSON.stringify(profile)}. Focus on weight loss and muscle retention. Respond strictly in ${langName}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          duration: { type: Type.STRING },
          intensity: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets: { type: Type.NUMBER },
                reps: { type: Type.STRING },
                description: { type: Type.STRING },
                muscleGroup: { type: Type.STRING },
              },
              required: ["name", "sets", "reps", "description", "muscleGroup"],
            }
          }
        },
        required: ["name", "duration", "intensity", "exercises"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateMealPlan = async (profile: UserProfile): Promise<Meal[]> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a daily meal plan (Breakfast, Lunch, Snack, Dinner) for a ${profile.gender}: ${JSON.stringify(profile)}. Keep it high protein and calorie deficit optimized for their physiological needs. Respond strictly in ${langName}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
          },
          required: ["time", "name", "calories", "protein", "carbs", "fat"],
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const chatWithCoach = async (message: string, profile: UserProfile) => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Titan, an expert fitness coach for everyone (men, women, and others). You are encouraging, strict but fair. 
      Respond strictly in ${langName}. Keep answers concise and motivational.
      Always respect the user's gender: ${profile.gender}.
      
      IF THE USER ASKS FOR A DIET, MEAL PLAN, OR WORKOUT ROUTINE, YOU MUST PROVIDE A CONVERSATIONAL RESPONSE FOLLOWED BY A JSON BLOCK IN THIS FORMAT:
      {
        "planData": {
          "title": "Title of the Plan",
          "type": "diet" | "workout",
          "rows": [
            {"col1": "Time/Exercise", "col2": "Meal/Sets", "col3": "Macros/Reps"}
          ],
          "summary": "Short nutritional or training advice"
        }
      }
      User profile context: ${JSON.stringify(profile)}`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
