
export type AppLanguage = 'en' | 'pt';
export type UserGender = 'Male' | 'Female' | 'Other';

export interface UserProfile {
  name: string;
  weight: number;
  targetWeight: number;
  height: number;
  age: number;
  gender: UserGender;
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
  goal: 'Weight Loss' | 'Muscle Gain' | 'Maintain';
  language: AppLanguage;
  profileImage?: string;
  evolution?: {
    before?: { image: string; date: string };
    after?: { image: string; date: string };
  };
}

export interface Workout {
  name: string;
  duration: string;
  intensity: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  description: string;
  muscleGroup: string;
}

export interface Meal {
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProgressData {
  date: string;
  weight: number;
  caloriesBurned: number;
}

export interface IntelItem {
  title: string;
  snippet: string;
  url: string;
}

export type ViewType = 'onboarding' | 'dashboard' | 'workouts' | 'nutrition' | 'coach' | 'profile';
