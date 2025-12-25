
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Workout, Meal, IntelItem } from "../types";

const getApiKey = (): string => {
  try {
    // Fallback search for the key in common locations
    return (window as any).process?.env?.API_KEY || (process as any)?.env?.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("TITANFIT: API_KEY is missing. AI features will fail.");
  }
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: string) => lang === 'pt' ? 'Portuguese' : 'English';

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown blocks and any leading/trailing garbage
  let cleaned = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
  // Ensure we only have the JSON object/array
  const start = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf('}');
  const endArr = cleaned.lastIndexOf(']');
  
  if (startArr !== -1 && (start === -1 || startArr < start)) {
    return cleaned.substring(startArr, endArr + 1);
  }
  return cleaned.substring(start, end + 1);
};

export const getFitnessIntelligence = async (goal: string, language: string): Promise<IntelItem[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const ai = getAI();
  const langName = getLanguageName(language);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find top 3 latest weight loss / fitness tips (2024) for ${goal}. Respond strictly in ${langName}.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "";
    const tips = text.split('\n').filter(t => t.length > 20).slice(0, 3);
    
    return tips.map((tip, i) => ({
      title: language === 'pt' ? `Insight #${i + 1}` : `Insight #${i + 1}`,
      snippet: tip.replace(/[*#]/g, ''),
      url: chunks[i]?.web?.uri || `https://google.com/search?q=${encodeURIComponent(goal)}+fitness+tips+2024`
    }));
  } catch (e) {
    console.warn("Titan Intel fetch failed", e);
    return [];
  }
};

export const generateDailyWorkout = async (profile: UserProfile): Promise<Workout> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a weight loss workout JSON for a ${profile.gender}: ${JSON.stringify(profile)}. Respond only with JSON.`,
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

  try {
    return JSON.parse(cleanJsonResponse(response.text));
  } catch (e) {
    console.error("Failed to parse workout JSON", e);
    throw e;
  }
};

export const generateMealPlan = async (profile: UserProfile): Promise<Meal[]> => {
  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a weight loss meal plan array JSON for a ${profile.gender}: ${JSON.stringify(profile)}. Respond only with JSON.`,
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

  try {
    return JSON.parse(cleanJsonResponse(response.text));
  } catch (e) {
    console.error("Failed to parse meal plan JSON", e);
    throw e;
  }
};

export const chatWithCoach = async (message: string, profile: UserProfile) => {
  const apiKey = getApiKey();
  if (!apiKey) return profile.language === 'pt' ? "Erro: API_KEY não encontrada." : "Error: API_KEY not found.";

  const ai = getAI();
  const langName = getLanguageName(profile.language);
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Titan, a world-class fitness coach. Be concise and motivational. Respond in ${langName}. Gender: ${profile.gender}. Context: ${JSON.stringify(profile)}.`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
