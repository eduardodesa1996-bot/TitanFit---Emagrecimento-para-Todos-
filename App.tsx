
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ProgressData, ViewType, AppLanguage, UserGender } from './types';
import Dashboard from './components/Dashboard';
import WorkoutView from './components/WorkoutView';
import NutritionView from './components/NutritionView';
import AICoachView from './components/AICoachView';
import { Home, Dumbbell, Apple, MessageCircle, User as UserIcon, ArrowRight, ChevronLeft, Venus, Mars, CircleSlash, Camera, Plus, Trash2, Calendar, RefreshCw } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    hub: 'HUB', train: 'TRAIN', fuel: 'FUEL', titan: 'TITAN', pro: 'PRO',
    loading: 'WAKING UP THE TITAN...',
    onboarding: { 
      step: 'Step', of: 'of', launch: 'LAUNCH TITAN', continue: 'CONTINUE', 
      name_q: "What's your name, Titan?", 
      gender_q: "What's your gender?",
      weight_q: "Current Weight (kg)", 
      target_q: "Target Weight (kg)", 
      goal_q: "Primary Goal", 
      lang_q: "Choose Language", 
      genders: { 'Male': 'Male', 'Female': 'Female', 'Other': 'Other' },
      goals: { 'Weight Loss': 'Weight Loss', 'Muscle Gain': 'Muscle Gain', 'Maintain': 'Maintain' } 
    },
    profile: { 
      level: 'Level 1 Titan • Founder', initial: 'Initial', target: 'Target', reset: 'RESET IDENTITY',
      evolution: 'Evolution Gallery', before: 'Before', after: 'After', change_photo: 'Change Photo',
      add_photo: 'Add Photo', empty_evolution: 'No progress photos yet. Start recording your journey!'
    }
  },
  pt: {
    hub: 'INÍCIO', train: 'TREINAR', fuel: 'NUTRIÇÃO', titan: 'COACH', pro: 'PERFIL',
    loading: 'DESPERTANDO O TITÃ...',
    onboarding: { 
      step: 'Passo', of: 'de', launch: 'LANÇAR TITAN', continue: 'CONTINUAR', 
      name_q: "Qual seu nome, Titã?", 
      gender_q: "Qual seu gênero?",
      weight_q: "Peso Atual (kg)", 
      target_q: "Meta de Peso (kg)", 
      goal_q: "Objetivo Principal", 
      lang_q: "Escolha o Idioma", 
      genders: { 'Male': 'Masculino', 'Female': 'Feminino', 'Other': 'Outro' },
      goals: { 'Weight Loss': 'Perder Peso', 'Muscle Gain': 'Ganhar Músculo', 'Maintain': 'Manter' } 
    },
    profile: { 
      level: 'Titã Nível 1 • Fundador', initial: 'Inicial', target: 'Meta', reset: 'REINICIAR IDENTIDADE',
      evolution: 'Galeria de Evolução', before: 'Antes', after: 'Depois', change_photo: 'Trocar Foto',
      add_photo: 'Adicionar Foto', empty_evolution: 'Sem fotos de progresso ainda. Comece sua jornada!'
    }
  }
};

const STORAGE_KEY = 'titanfit_user_profile_v1';
const PROGRESS_KEY = 'titanfit_weight_history_v1';

const INITIAL_PROFILE: UserProfile = {
  name: '', weight: 70, targetWeight: 65, height: 170, age: 25, activityLevel: 'Moderately Active', goal: 'Weight Loss', language: 'pt', gender: 'Male',
  evolution: {}
};

const MOCK_PROGRESS: ProgressData[] = [
  { date: '01/05', weight: 75.0, caloriesBurned: 450 },
  { date: '10/05', weight: 74.5, caloriesBurned: 600 },
  { date: '20/05', weight: 74.0, caloriesBurned: 700 },
  { date: '30/05', weight: 73.2, caloriesBurned: 800 },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('onboarding');
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evolutionInputRef = useRef<{ type: 'before' | 'after' | 'profile' | null }>({ type: null });

  // Load Data with ultra-resilience
  useEffect(() => {
    const initApp = () => {
      try {
        const savedProfile = localStorage.getItem(STORAGE_KEY);
        const savedProgress = localStorage.getItem(PROGRESS_KEY);
        
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          // Auto-repair missing fields if any
          const repairedProfile = { ...INITIAL_PROFILE, ...parsed };
          setProfile(repairedProfile);
          if (repairedProfile.name) setView('dashboard');
        }
        
        if (savedProgress) {
          setProgress(JSON.parse(savedProgress));
        } else {
          setProgress(MOCK_PROGRESS);
        }
      } catch (e) {
        console.error("TitanFit Storage Error: Attempting to recover...", e);
        // Clear only if absolutely critical
        if (e instanceof SyntaxError) localStorage.clear();
      } finally {
        // Minimum visibility for Splash Screen to ensure assets are ready
        setTimeout(() => setIsLoaded(true), 1200);
      }
    };

    initApp();
  }, []);

  // Sync Data
  useEffect(() => {
    if (isLoaded && profile.name) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [profile, progress, isLoaded]);

  const t = TRANSLATIONS[profile.language] || TRANSLATIONS.pt;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(profile.language === 'pt' ? "Imagem muito grande! Máximo 2MB." : "Image too large! Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const today = new Date().toLocaleDateString(profile.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' });
        
        if (type === 'profile') {
          setProfile(prev => ({ ...prev, profileImage: base64String }));
        } else {
          setProfile(prev => ({
            ...prev,
            evolution: {
              ...prev.evolution,
              [type]: { image: base64String, date: today }
            }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlanRequest = (prompt: string) => {
    setPendingPrompt(prompt);
    setView('coach');
  };

  const onboardingSteps = [
    { title: t.onboarding.lang_q, type: 'language', key: 'language' },
    { title: t.onboarding.name_q, type: 'text', key: 'name' },
    { title: t.onboarding.gender_q, type: 'gender', key: 'gender' },
    { title: t.onboarding.weight_q, type: 'number', key: 'weight' },
    { title: t.onboarding.target_q, type: 'number', key: 'targetWeight' },
    { title: t.onboarding.goal_q, type: 'select', key: 'goal', options: ['Weight Loss', 'Muscle Gain', 'Maintain'] },
  ];

  const handleNext = () => {
    if (step < onboardingSteps.length - 1) setStep(step + 1);
    else setView('dashboard');
  };

  const resetIdentity = () => {
    if (confirm(profile.language === 'pt' ? 'Isso apagará TODOS os seus dados salvos. Continuar?' : 'This will delete ALL saved data. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-10 z-[100]">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
          <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] border-2 border-emerald-500 flex items-center justify-center shadow-2xl relative">
            <Trophy className="text-emerald-500" size={48} />
          </div>
        </div>
        <h1 className="text-2xl font-black text-white tracking-[0.2em] mb-4">TITANFIT</h1>
        <div className="flex items-center gap-3 text-emerald-500/60 font-black text-[10px] tracking-widest uppercase">
          <RefreshCw className="animate-spin" size={14} />
          {t.loading}
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'onboarding': 
        const currentStep = onboardingSteps[step];
        return (
          <div className="flex flex-col h-[80vh] justify-center space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="space-y-2">
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${((step + 1) / onboardingSteps.length) * 100}%` }} />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t.onboarding.step} {step + 1} {t.onboarding.of} {onboardingSteps.length}</p>
              <h2 className="text-4xl font-black text-white leading-tight">{currentStep.title}</h2>
            </div>
            <div className="space-y-4">
              {currentStep.type === 'language' && (
                <div className="space-y-3">
                  {[{ code: 'en', label: 'English', flag: '🇺🇸' }, { code: 'pt', label: 'Português', flag: '🇧🇷' }].map(l => (
                    <button key={l.code} onClick={() => { setProfile({...profile, language: l.code as AppLanguage}); handleNext(); }} className={`w-full p-6 rounded-3xl text-left font-black text-lg transition-all border-2 flex items-center gap-4 ${profile.language === l.code ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      <span className="text-2xl">{l.flag}</span>{l.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {currentStep.type === 'text' && <input type="text" className="w-full bg-slate-800 border-2 border-slate-700 p-6 rounded-3xl text-xl font-bold text-white focus:border-emerald-500 focus:outline-none" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} autoFocus onKeyPress={e => e.key === 'Enter' && profile.name && handleNext()} />}
              {currentStep.type === 'gender' && (
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Male', icon: Mars, color: 'text-blue-400' },
                    { id: 'Female', icon: Venus, color: 'text-pink-400' },
                    { id: 'Other', icon: CircleSlash, color: 'text-slate-400' }
                  ].map(g => (
                    <button key={g.id} onClick={() => { setProfile({...profile, gender: g.id as UserGender}); handleNext(); }} className={`flex items-center gap-4 p-6 rounded-3xl border-2 font-black text-lg transition-all ${profile.gender === g.id ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      <g.icon size={28} className={profile.gender === g.id ? 'text-white' : g.color} />
                      {t.onboarding.genders[g.id as keyof typeof t.onboarding.genders].toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {currentStep.type === 'number' && <input type="number" className="w-full bg-slate-800 border-2 border-slate-700 p-6 rounded-3xl text-3xl font-black text-white focus:border-emerald-500 focus:outline-none text-center" value={profile[currentStep.key as keyof UserProfile] as number} onChange={e => setProfile({...profile, [currentStep.key]: Number(e.target.value)})} autoFocus onKeyPress={e => e.key === 'Enter' && handleNext()} />}
              {currentStep.type === 'select' && (
                <div className="space-y-3">
                  {currentStep.options?.map(opt => (
                    <button key={opt} onClick={() => { setProfile({...profile, goal: opt as any}); handleNext(); }} className={`w-full p-6 rounded-3xl text-left font-black text-lg transition-all border-2 ${profile.goal === opt ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {(t.onboarding.goals[opt as keyof typeof t.onboarding.goals] || opt).toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="p-6 bg-slate-800 text-slate-400 rounded-3xl hover:bg-slate-700"><ChevronLeft size={24} /></button>}
              <button disabled={(currentStep.type === 'text' && !profile.name) || (currentStep.type === 'language' && !profile.language)} onClick={handleNext} className="flex-1 p-6 bg-emerald-600 disabled:opacity-20 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-95">{step === onboardingSteps.length - 1 ? t.onboarding.launch : t.onboarding.continue}<ArrowRight size={24} /></button>
            </div>
          </div>
        );
      case 'dashboard': return <Dashboard profile={profile} progress={progress} />;
      case 'workouts': return <WorkoutView profile={profile} progress={progress} onPlanRequest={handlePlanRequest} />;
      case 'nutrition': return <NutritionView profile={profile} onPlanRequest={handlePlanRequest} />;
      case 'coach': return <AICoachView profile={profile} initialPrompt={pendingPrompt} onPromptHandled={() => setPendingPrompt(undefined)} />;
      case 'profile': return (
        <div className="flex flex-col pb-20 animate-in fade-in duration-500">
          <div className="flex flex-col items-center mb-10 mt-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="w-32 h-32 bg-slate-800 rounded-[2.5rem] border-4 border-emerald-500 flex items-center justify-center relative overflow-hidden shadow-2xl">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={64} className="text-emerald-500" />
                )}
                <button 
                  onClick={() => { evolutionInputRef.current.type = 'profile'; fileInputRef.current?.click(); }}
                  className="absolute bottom-2 right-2 p-2 bg-emerald-500 rounded-xl text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>
            <div className="text-center mt-6">
              <h2 className="text-3xl font-black text-white mb-1">{profile.name.toUpperCase()}</h2>
              <p className="text-slate-500 font-bold tracking-[0.2em] text-[10px] uppercase">{t.profile.level}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-10">
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-xl">
              <span className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.profile.initial}</span>
              <span className="text-2xl font-black text-white">{profile.weight} kg</span>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-xl">
              <span className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.profile.target}</span>
              <span className="text-2xl font-black text-emerald-500">{profile.targetWeight} kg</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Calendar size={18} className="text-emerald-500" />
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">{t.profile.evolution}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{t.profile.before}</span>
                <div 
                  onClick={() => { evolutionInputRef.current.type = 'before'; fileInputRef.current?.click(); }}
                  className="aspect-[3/4] bg-slate-800/60 rounded-[2rem] border-2 border-dashed border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                  {profile.evolution?.before ? (
                    <>
                      <img src={profile.evolution.before.image} alt="Before" className="w-full h-full object-cover" />
                      <div className="absolute bottom-3 left-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-white text-center">
                        {profile.evolution.before.date}
                      </div>
                    </>
                  ) : (
                    <>
                      <Plus size={24} className="text-slate-600 mb-2 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t.profile.add_photo}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">{t.profile.after}</span>
                <div 
                  onClick={() => { evolutionInputRef.current.type = 'after'; fileInputRef.current?.click(); }}
                  className="aspect-[3/4] bg-slate-800/60 rounded-[2rem] border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-emerald-500 transition-all shadow-lg shadow-emerald-500/5"
                >
                  {profile.evolution?.after ? (
                    <>
                      <img src={profile.evolution.after.image} alt="After" className="w-full h-full object-cover" />
                      <div className="absolute bottom-3 left-3 right-3 px-3 py-1 bg-emerald-500/80 backdrop-blur-md rounded-full text-[9px] font-black text-white text-center">
                        {profile.evolution.after.date}
                      </div>
                    </>
                  ) : (
                    <>
                      <Plus size={24} className="text-emerald-500 mb-2 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t.profile.add_photo}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*" 
              onChange={(e) => {
                const type = evolutionInputRef.current.type;
                if (type) handleImageUpload(e, type as any);
                evolutionInputRef.current.type = null;
              }} 
            />
          </div>

          <button 
            onClick={resetIdentity} 
            className="mt-16 w-full py-5 bg-slate-800/80 rounded-3xl font-black text-slate-400 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Trash2 size={18} />
            {t.profile.reset}
          </button>
        </div>
      );
      default: return <Dashboard profile={profile} progress={progress} />;
    }
  };

  const navItems: { id: ViewType; icon: any; label: string }[] = [
    { id: 'dashboard', icon: Home, label: t.hub },
    { id: 'workouts', icon: Dumbbell, label: t.train },
    { id: 'nutrition', icon: Apple, label: t.fuel },
    { id: 'coach', icon: MessageCircle, label: t.titan },
    { id: 'profile', icon: UserIcon, label: t.pro }
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 flex flex-col px-6 pt-10 pb-32 overflow-hidden selection:bg-emerald-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[400px] bg-emerald-600/10 blur-[120px] pointer-events-none transition-all duration-1000" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[200px] bg-cyan-600/5 blur-[80px] pointer-events-none" />
      <main className="flex-1 relative z-10">{renderView()}</main>
      {view !== 'onboarding' && (
        <nav className="fixed bottom-6 left-6 right-6 max-w-md mx-auto h-20 bg-slate-800/40 backdrop-blur-2xl border border-white/5 rounded-[40px] flex items-center justify-around px-4 shadow-2xl z-50">
          {navItems.map((item) => {
            const isActive = view === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${isActive ? 'text-emerald-500 scale-110' : 'text-slate-600'}`}>
                <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-emerald-500/10' : ''}`}><Icon size={isActive ? 24 : 22} /></div>
                <span className={`text-[8px] mt-1 font-black tracking-widest uppercase transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

const Trophy = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default App;
