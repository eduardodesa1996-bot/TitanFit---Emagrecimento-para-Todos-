
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ProgressData, ViewType } from './types';
import Dashboard from './components/Dashboard';
import WorkoutView from './components/WorkoutView';
import NutritionView from './components/NutritionView';
import AICoachView from './components/AICoachView';
import { Home, Dumbbell, Apple, MessageCircle, User as UserIcon, ArrowRight, ChevronLeft, Venus, Mars, CircleSlash, Camera, Plus, Trash2, Calendar, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'titanfit_profile_v2';
const PROGRESS_KEY = 'titanfit_progress_v2';

const INITIAL_PROFILE: UserProfile = {
  name: '', weight: 70, targetWeight: 65, height: 170, age: 25, 
  activityLevel: 'Moderately Active', goal: 'Weight Loss', 
  language: 'pt', gender: 'Male', evolution: {}
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('onboarding');
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Carregamento Seguro
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      const savedProgress = localStorage.getItem(PROGRESS_KEY);
      
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile({ ...INITIAL_PROFILE, ...parsed });
        if (parsed.name) setView('dashboard');
      }
      
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      } else {
        setProgress([{ date: 'Início', weight: 70, caloriesBurned: 0 }]);
      }
    } catch (e) {
      console.error("Storage Recovery:", e);
      localStorage.clear();
    } finally {
      setIsReady(true);
    }
  }, []);

  // Persistência Atômica
  useEffect(() => {
    if (isReady && profile.name) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [profile, progress, isReady]);

  const handleNextStep = () => {
    if (onboardingStep < 5) setOnboardingStep(s => s + 1);
    else setView('dashboard');
  };

  if (!isReady) return null;

  const renderView = () => {
    switch (view) {
      case 'onboarding':
        return (
          <div className="flex flex-col h-[70vh] justify-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="space-y-4">
              <div className="h-1 w-20 bg-emerald-500 rounded-full" />
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                {onboardingStep === 0 && (profile.language === 'pt' ? 'Seu Nome?' : 'Your Name?')}
                {onboardingStep === 1 && (profile.language === 'pt' ? 'Qual Gênero?' : 'Which Gender?')}
                {onboardingStep === 2 && (profile.language === 'pt' ? 'Peso Atual (kg)?' : 'Current Weight?')}
                {onboardingStep === 3 && (profile.language === 'pt' ? 'Meta de Peso (kg)?' : 'Target Weight?')}
                {onboardingStep === 4 && (profile.language === 'pt' ? 'Seu Objetivo?' : 'Your Goal?')}
                {onboardingStep === 5 && (profile.language === 'pt' ? 'Idioma?' : 'Language?')}
              </h2>
            </div>

            <div className="min-h-[100px]">
              {onboardingStep === 0 && <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-slate-800 border-2 border-slate-700 p-6 rounded-3xl text-xl font-bold text-white focus:border-emerald-500 outline-none" autoFocus />}
              {onboardingStep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {['Male', 'Female'].map(g => (
                    <button key={g} onClick={() => { setProfile({...profile, gender: g as any}); handleNextStep(); }} className={`p-6 rounded-3xl border-2 font-black transition-all ${profile.gender === g ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      {g === 'Male' ? 'HOMEM' : 'MULHER'}
                    </button>
                  ))}
                </div>
              )}
              {onboardingStep === 2 && <input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: Number(e.target.value)})} className="w-full bg-slate-800 border-2 border-slate-700 p-6 rounded-3xl text-3xl font-black text-white text-center" />}
              {onboardingStep === 3 && <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: Number(e.target.value)})} className="w-full bg-slate-800 border-2 border-slate-700 p-6 rounded-3xl text-3xl font-black text-white text-center" />}
              {onboardingStep === 4 && (
                <div className="space-y-3">
                  {['Weight Loss', 'Muscle Gain'].map(goal => (
                    <button key={goal} onClick={() => { setProfile({...profile, goal: goal as any}); handleNextStep(); }} className={`w-full p-5 rounded-3xl border-2 font-black text-left ${profile.goal === goal ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      {goal === 'Weight Loss' ? 'PERDER PESO' : 'GANHAR MÚSCULO'}
                    </button>
                  ))}
                </div>
              )}
              {onboardingStep === 5 && (
                <div className="grid grid-cols-2 gap-3">
                  {['pt', 'en'].map(l => (
                    <button key={l} onClick={() => { setProfile({...profile, language: l as any}); handleNextStep(); }} className={`p-6 rounded-3xl border-2 font-black ${profile.language === l ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {onboardingStep > 0 && <button onClick={() => setOnboardingStep(s => s - 1)} className="p-6 bg-slate-800 rounded-3xl text-white"><ChevronLeft /></button>}
              <button disabled={onboardingStep === 0 && !profile.name} onClick={handleNextStep} className="flex-1 p-6 bg-emerald-600 rounded-3xl text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30">
                {onboardingStep === 5 ? 'LANÇAR TITAN' : 'CONTINUAR'} <ArrowRight />
              </button>
            </div>
          </div>
        );
      case 'dashboard': return <Dashboard profile={profile} progress={progress} />;
      case 'workouts': return <WorkoutView profile={profile} progress={progress} />;
      case 'nutrition': return <NutritionView profile={profile} />;
      case 'coach': return <AICoachView profile={profile} />;
      case 'profile': return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="text-center space-y-4">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500 mx-auto flex items-center justify-center">
              <UserIcon size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{profile.name}</h2>
          </header>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-6 rounded-3xl border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">INICIAL</span>
              <span className="text-xl font-black">{profile.weight}kg</span>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-white/5">
              <span className="text-[10px] font-black text-emerald-500 uppercase block mb-1">META</span>
              <span className="text-xl font-black text-emerald-500">{profile.targetWeight}kg</span>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-5 bg-red-500/10 text-red-500 rounded-3xl font-black border border-red-500/20 flex items-center justify-center gap-2 active:scale-95">
            <Trash2 size={20} /> REINICIAR TUDO
          </button>
        </div>
      );
      default: return <Dashboard profile={profile} progress={progress} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 px-6 pt-12 pb-32">
      <main>{renderView()}</main>
      {view !== 'onboarding' && (
        <nav className="fixed bottom-6 left-6 right-6 max-w-md mx-auto h-20 bg-slate-800/80 backdrop-blur-2xl border border-white/5 rounded-[40px] flex items-center justify-around px-4 shadow-2xl z-50">
          {[
            { id: 'dashboard', icon: Home },
            { id: 'workouts', icon: Dumbbell },
            { id: 'nutrition', icon: Apple },
            { id: 'coach', icon: MessageCircle },
            { id: 'profile', icon: UserIcon }
          ].map((item) => (
            <button key={item.id} onClick={() => setView(item.id as ViewType)} className={`p-4 rounded-2xl transition-all ${view === item.id ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>
              <item.icon size={24} />
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default App;
