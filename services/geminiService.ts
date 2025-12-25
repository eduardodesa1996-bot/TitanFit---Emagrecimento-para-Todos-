
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Workout, Meal, IntelItem } from "../types";

// Safer key access to prevent "process is not defined" crashes
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const getAI = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: string) => lang === 'pt' ? 'Portuguese' : 'English';

// Utility to clean AI response before parsing JSON
const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const getFitnessIntelligence = async (goal: string, language: string): Promise<IntelItem[]> => {
  const ai = getAI();
  const langName = getLanguageName(language);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the top 3 latest, scientifically-backed fitness tips in 2024 related to ${goal}. Respond strictly in ${langName}. Provide brief summaries.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "";
    const tips = text.split('\n').filter(t => t.length > 20).slice(0, 3);
    
    return tips.map((tip, i) => ({
      title: language === 'pt' ? `Insight #${i + 1}` : `Insight #${i + 1}`,
      snippet: tip,
      url: chunks[i]?.web?.uri || 'https://google.com/search?q=fitness+tips'
    }));
  } catch (e) {
    console.warn("Intel fetch failed", e);
    return [];
  }
};

export const generateDailyWorkout = async (profile: UserProfile): Promise<Workout> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a personalized high-intensity workout for a ${profile.gender} with the following profile: ${JSON.stringify(profile)}. Respond strictly in ${langName}.`,
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

  return JSON.parse(cleanJsonResponse(response.text));
};

export const generateMealPlan = async (profile: UserProfile): Promise<Meal[]> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a daily meal plan for a ${profile.gender}: ${JSON.stringify(profile)}. Respond strictly in ${langName}.`,
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

  return JSON.parse(cleanJsonResponse(response.text));
};

export const chatWithCoach = async (message: string, profile: UserProfile) => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Titan, a high-performance fitness coach. Respond strictly in ${langName}. Always respect the user's gender: ${profile.gender}. If you provide a plan, include a JSON block with "planData".`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
