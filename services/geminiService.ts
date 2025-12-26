
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Workout, Meal, IntelItem } from "../types";

// As diretrizes exigem o uso direto de process.env.API_KEY
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const start = Math.max(cleaned.indexOf('{'), cleaned.indexOf('['));
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start !== -1 && end !== -1) {
    return cleaned.substring(start, end + 1);
  }
  return cleaned;
};

export const getFitnessIntelligence = async (goal: string, language: string): Promise<IntelItem[]> => {
  const ai = getAI();
  const langName = language === 'pt' ? 'Portuguese' : 'English';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List top 3 weight loss tips for ${goal}. Respond in ${langName}.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "";
    const tips = text.split('\n').filter(t => t.length > 15).slice(0, 3);
    
    return tips.map((tip, i) => ({
      title: language === 'pt' ? `Titan Insight #${i + 1}` : `Titan Insight #${i + 1}`,
      snippet: tip.replace(/[*#]/g, ''),
      url: chunks[i]?.web?.uri || `https://www.google.com/search?q=${encodeURIComponent(goal)}+tips`
    }));
  } catch (e) {
    console.warn("Intelligence failed:", e);
    return [];
  }
};

export const generateDailyWorkout = async (profile: UserProfile): Promise<Workout> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a weight loss workout JSON for: ${JSON.stringify(profile)}. Respond only with JSON.`,
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

  return JSON.parse(cleanJsonResponse(response.text || "{}"));
};

export const generateMealPlan = async (profile: UserProfile): Promise<Meal[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate daily weight loss meal plan array JSON: ${JSON.stringify(profile)}.`,
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

  return JSON.parse(cleanJsonResponse(response.text || "[]"));
};

export const chatWithCoach = async (message: string, profile: UserProfile) => {
  const ai = getAI();
  const langName = profile.language === 'pt' ? 'Portuguese' : 'English';
  
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Titan, a world-class fitness coach. Be concise and motivational. Respond in ${langName}. Gender: ${profile.gender}. Context: ${JSON.stringify(profile)}.`,
    },
  });

  const response = await chat.sendMessage({ message: message });
  return response.text || "";
};
