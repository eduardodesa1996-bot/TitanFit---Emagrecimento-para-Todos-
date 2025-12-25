
import React, { useState, useEffect } from 'react';
import { UserProfile, Meal } from '../types';
import { generateMealPlan } from '../services/geminiService';
// Added Trash2 to the imports from lucide-react
import { Utensils, Zap, Plus, RefreshCw, Sparkles, ArrowRight, Leaf, Flame, DollarSign, Clock, Trash2 } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onPlanRequest?: (prompt: string) => void;
}

const STORAGE_MEAL_KEY = 'titanfit_daily_meals';
const STORAGE_WATER_KEY = 'titanfit_water_count';

const NutritionView: React.FC<Props> = ({ profile, onPlanRequest }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [waterCount, setWaterCount] = useState(0);

  const isPt = profile.language === 'pt';

  const fetchMeals = async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const saved = localStorage.getItem(STORAGE_MEAL_KEY);
        if (saved) {
          setMeals(JSON.parse(saved));
          setLoading(false);
          return;
        }
      }
      const data = await generateMealPlan(profile);
      setMeals(data);
      localStorage.setItem(STORAGE_MEAL_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
    const savedWater = localStorage.getItem(STORAGE_WATER_KEY);
    if (savedWater) setWaterCount(Number(savedWater));
  }, []);

  const updateWater = (val: number) => {
    const newVal = Math.max(0, val);
    setWaterCount(newVal);
    localStorage.setItem(STORAGE_WATER_KEY, String(newVal));
  };

  const handleCustomRequest = (overridePrompt?: string) => {
    const promptToUse = overridePrompt || customPrompt;
    if (!promptToUse.trim() || !onPlanRequest) return;
    const fullPrompt = isPt 
      ? `Nutricionista Titan, crie um plano alimentar: ${promptToUse}`
      : `Titan Nutritionist, create a meal plan: ${promptToUse}`;
    onPlanRequest(fullPrompt);
  };

  const suggestionChips = isPt ? [
    { label: 'Keto', prompt: 'Plano Cetogênico focado em queima rápida.', icon: Flame },
    { label: 'Vegano', prompt: 'Plano 100% à base de plantas rico em proteína.', icon: Leaf },
    { label: 'Econômico', prompt: 'Baixo custo e preparo rápido.', icon: DollarSign },
    { label: 'Jejum 16/8', prompt: 'Janela de jejum intermitente 16/8.', icon: Clock },
  ] : [
    { label: 'Keto Plan', prompt: 'Ketogenic meal plan focused on fat loss.', icon: Flame },
    { label: 'Vegan', prompt: 'Plant-based high protein diet.', icon: Leaf },
    { label: 'Budget', prompt: 'Low cost and fast meal prep.', icon: DollarSign },
    { label: '16/8 Fast', prompt: 'Intermittent Fasting 16/8 schedule.', icon: Clock },
  ];

  const totals = meals.reduce((acc, meal) => ({
    cals: acc.cals + meal.calories,
    pro: acc.pro + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { cals: 0, pro: 0, carbs: 0, fat: 0 });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin text-cyan-500"><RefreshCw size={48} /></div>
        <p className="text-slate-400 animate-pulse font-medium">{isPt ? 'Calculando macros...' : 'Calculating macros...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-cyan-900/40 p-6 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-2xl flex items-center justify-center"><Sparkles size={20} className="text-white" /></div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-widest">{isPt ? 'DIETA IA' : 'AI DIET'}</h3>
              <p className="text-cyan-400 text-[10px] font-black tracking-[0.2em]">TITAN ENGINE</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder={isPt ? "Ex: Dieta para secar..." : "Ex: Shred diet..."}
              className="flex-1 bg-slate-800/80 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
            />
            <button onClick={() => handleCustomRequest()} className="bg-cyan-600 p-4 rounded-2xl text-white active:scale-95"><ArrowRight size={24} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestionChips.map((chip, idx) => (
              <button key={idx} onClick={() => handleCustomRequest(chip.prompt)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-cyan-400 transition-all">
                <chip.icon size={12} className="text-cyan-500" />{chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[{ label: isPt ? 'Calorias' : 'Calories', val: totals.cals, unit: 'kcal', color: 'text-white' },
          { label: 'Prot.', val: totals.pro, unit: 'g', color: 'text-emerald-500' },
          { label: 'Carb.', val: totals.carbs, unit: 'g', color: 'text-orange-500' },
          { label: 'Gord.', val: totals.fat, unit: 'g', color: 'text-red-500' }].map((macro, i) => (
          <div key={i} className="bg-slate-800/50 p-3 rounded-2xl border border-white/5 text-center">
            <span className="text-[8px] text-slate-500 uppercase font-black block mb-1 tracking-tighter">{macro.label}</span>
            <span className={`text-sm font-black block ${macro.color}`}>{macro.val}</span>
            <span className="text-[8px] text-slate-500 uppercase font-black">{macro.unit}</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div><h3 className="text-xl font-black text-white uppercase tracking-tighter">{isPt ? 'Cardápio Base' : "Base Menu"}</h3></div>
          <button onClick={() => fetchMeals(true)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-emerald-500 transition-all active:rotate-180"><RefreshCw size={20} /></button>
        </div>
        <div className="space-y-6">
          {meals.map((meal, i) => (
            <div key={i} className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-white/5 shrink-0">
                <span className="text-[10px] font-black text-cyan-500">{meal.time.slice(0, 5)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-200 truncate uppercase tracking-tight">{meal.name}</h4>
                <div className="flex gap-3 text-[8px] text-slate-500 font-black uppercase mt-1">
                  <span className="text-emerald-500/80">P: {meal.protein}g</span>
                  <span className="text-orange-500/80">C: {meal.carbs}g</span>
                  <span className="text-red-500/80">F: {meal.fat}g</span>
                </div>
              </div>
              <div className="text-right"><span className="text-base font-black text-white block leading-none">{meal.calories}</span><span className="text-[9px] text-slate-500 font-black">kcal</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-black text-sm text-slate-200 uppercase tracking-widest">{isPt ? 'Hidratação' : 'Hydration'}</h3>
          <span className="text-[10px] text-cyan-500 font-black">{waterCount} / 10 Copos</span>
        </div>
        <div className="flex gap-2 flex-wrap bg-slate-800/40 p-5 rounded-[2rem] border border-white/5">
          {Array.from({ length: 10 }).map((_, i) => (
            <button key={i} onClick={() => updateWater(i + 1)} className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all ${i < waterCount ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-lg shadow-cyan-900/10 active:scale-110' : 'bg-slate-900 border-white/5 text-slate-700 hover:border-cyan-500/30'}`}>
              <Zap size={18} fill={i < waterCount ? 'currentColor' : 'none'} />
            </button>
          ))}
          {/* Trash2 icon used here requires explicit import */}
          <button onClick={() => updateWater(0)} className="w-11 h-11 rounded-2xl bg-slate-700 flex items-center justify-center text-white"><Trash2 size={18} /></button>
        </div>
      </div>
    </div>
  );
};

export default NutritionView;
