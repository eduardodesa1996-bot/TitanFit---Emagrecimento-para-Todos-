
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Workout, ProgressData } from '../types';
import { generateDailyWorkout } from '../services/geminiService';
import ProgressChart from './ProgressChart';
import { 
  Play, Clock, Zap, RefreshCw, Activity, ChevronDown, Info, Check, X, 
  Target, Sparkles, ArrowRight, TrendingDown, TrendingUp, History, 
  Plus, Dumbbell, Home, Timer, Shield, Calendar, ArrowLeft,
  Music, Pause, SkipForward, SkipBack, Volume2, Upload
} from 'lucide-react';

interface Props { 
  profile: UserProfile; 
  progress: ProgressData[];
  onPlanRequest?: (prompt: string) => void;
}

interface Track {
  name: string;
  artist: string;
  url: string;
}

const STORAGE_WORKOUT_KEY = 'titanfit_daily_workout';
const DEFAULT_REST_TIME = 45;

const TITAN_BEATS: Track[] = [
  { name: "Phonk Titan", artist: "Titan Records", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Iron Will", artist: "Beast Mode", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "Cyber Grind", artist: "Neon Pulse", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

const WorkoutView: React.FC<Props> = ({ profile, progress, onPlanRequest }) => {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Music Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(TITAN_BEATS);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(DEFAULT_REST_TIME);
  const [totalRestTime, setTotalRestTime] = useState(DEFAULT_REST_TIME);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPt = profile.language === 'pt';

  const fetchWorkout = async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const saved = localStorage.getItem(STORAGE_WORKOUT_KEY);
        if (saved) {
          setWorkout(JSON.parse(saved));
          setLoading(false);
          return;
        }
      }
      const data = await generateDailyWorkout(profile);
      setWorkout(data);
      localStorage.setItem(STORAGE_WORKOUT_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Audio Side Effects
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(e => console.warn("Audio play blocked", e));
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (isResting && restTimeRemaining > 0) {
      timerRef.current = setInterval(() => setRestTimeRemaining(prev => prev - 1), 1000);
    } else if (isResting && restTimeRemaining <= 0) {
      handleSkipRest();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isResting, restTimeRemaining]);

  const toggleMusic = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newTrack: Track = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        artist: isPt ? "Meu Arquivo" : "My File",
        url: url
      };
      setTracks([newTrack, ...tracks]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    }
  };

  const handleCustomRequest = (overridePrompt?: string) => {
    const promptToUse = overridePrompt || customPrompt;
    if (!promptToUse.trim() || !onPlanRequest) return;
    const fullPrompt = isPt 
      ? `Treinador Titan, crie um treino focado em: ${promptToUse}`
      : `Titan Coach, create a workout focused on: ${promptToUse}`;
    onPlanRequest(fullPrompt);
  };

  const startWorkout = () => { setActiveStep(0); setCompletedExercises([]); };
  const completeExercise = () => {
    if (activeStep === null || !workout) return;
    setCompletedExercises(prev => [...prev, activeStep]);
    if (activeStep < workout.exercises.length - 1) {
      setRestTimeRemaining(DEFAULT_REST_TIME);
      setIsResting(true);
    } else {
      setActiveStep(null);
      alert(isPt ? "TREINO CONCLUÍDO!" : "WORKOUT COMPLETE!");
    }
  };
  const handleSkipRest = () => { setIsResting(false); if (activeStep !== null) setActiveStep(activeStep + 1); };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin text-emerald-500"><RefreshCw size={48} /></div>
        <p className="text-slate-400 font-medium">{isPt ? 'Titan preparando treino...' : 'Curating routine...'}</p>
      </div>
    );
  }

  const currentTrack = tracks[currentTrackIndex];

  if (isResting && workout && activeStep !== null) {
    const nextExercise = workout.exercises[activeStep + 1];
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/98 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <h2 className="text-4xl font-black text-white italic mb-12 uppercase tracking-tighter">{isPt ? 'DESCANSE' : 'REST'}</h2>
        <div className="text-7xl font-black text-emerald-500 mb-16 tabular-nums">{restTimeRemaining}s</div>
        
        <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-white/5 mb-8 w-full max-w-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">{isPt ? 'PRÓXIMO' : 'NEXT UP'}</span>
          <h3 className="text-xl font-black text-white uppercase">{nextExercise.name}</h3>
        </div>

        {/* Mini Music Control in Rest Screen */}
        <div className="flex items-center gap-6 mb-12 bg-slate-800/30 px-6 py-4 rounded-3xl border border-white/5">
          <button onClick={prevTrack} className="text-slate-500 hover:text-white transition-colors"><SkipBack size={24} /></button>
          <button onClick={toggleMusic} className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all">
            {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
          </button>
          <button onClick={nextTrack} className="text-slate-500 hover:text-white transition-colors"><SkipForward size={24} /></button>
        </div>

        <button onClick={handleSkipRest} className="w-full max-w-sm bg-emerald-600 py-6 rounded-3xl font-black text-white shadow-xl shadow-emerald-900/30">PULAR DESCANSO</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onEnded={nextTrack}
        autoPlay={isPlaying}
      />
      
      {showFullHistory && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 animate-in slide-in-from-bottom-10">
          <header className="flex justify-between items-center mb-10 mt-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">{isPt ? 'Histórico' : 'History'}</h2>
            <button onClick={() => setShowFullHistory(false)} className="p-3 bg-slate-900 rounded-2xl"><X size={24} /></button>
          </header>
          <div className="flex-1 overflow-y-auto space-y-3">
            {[...progress].reverse().map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-white/5 p-5 rounded-3xl flex justify-between">
                <div><p className="font-black text-white">{item.date}</p></div>
                <div><span className="text-xl font-black text-emerald-500">{item.weight} kg</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Titan Beats Player */}
      <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 scale-150 rotate-12 pointer-events-none group-hover:opacity-10 transition-opacity">
          <Music size={120} className="text-emerald-400" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-emerald-500" />
            <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">
              {isPt ? 'TITAN BEATS' : 'TITAN BEATS'}
            </h3>
          </div>
          <button 
            onClick={() => musicInputRef.current?.click()}
            className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-emerald-500 transition-all active:scale-90"
          >
            <Upload size={18} />
          </button>
          <input 
            type="file" 
            ref={musicInputRef} 
            onChange={handleMusicUpload} 
            accept="audio/*" 
            className="hidden" 
          />
        </div>

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 relative overflow-hidden">
             {isPlaying && (
               <div className="absolute inset-0 flex items-center justify-center gap-1">
                 <div className="w-1 bg-emerald-500 h-4 animate-bounce" style={{ animationDelay: '0s' }} />
                 <div className="w-1 bg-emerald-500 h-6 animate-bounce" style={{ animationDelay: '0.2s' }} />
                 <div className="w-1 bg-emerald-500 h-3 animate-bounce" style={{ animationDelay: '0.4s' }} />
               </div>
             )}
             {!isPlaying && <Music className="text-slate-700" size={32} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-white text-sm truncate uppercase tracking-tight">{currentTrack.name}</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentTrack.artist}</p>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={prevTrack} className="p-2 text-slate-500 hover:text-white transition-colors active:scale-90"><SkipBack size={20} /></button>
             <button 
               onClick={toggleMusic} 
               className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 active:scale-95 transition-all"
             >
               {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
             </button>
             <button onClick={nextTrack} className="p-2 text-slate-500 hover:text-white transition-colors active:scale-90"><SkipForward size={20} /></button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Volume2 size={14} className="text-slate-600" />
          <input 
            type="range" 
            min="0" max="1" step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" 
          />
        </div>
      </div>

      {activeStep === null && (
        <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={20} className="text-white" /></div>
             <h3 className="font-black text-white text-base uppercase tracking-widest">{isPt ? 'GERADOR TITAN IA' : 'TITAN AI'}</h3>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder={isPt ? "Ex: Treino de pernas..." : "Ex: Leg day..."}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none"
            />
            <button onClick={() => handleCustomRequest()} className="bg-emerald-600 p-4 rounded-2xl text-white active:scale-95"><ArrowRight size={24} /></button>
          </div>
        </div>
      )}

      <div className="p-2 bg-slate-800/40 rounded-[2.5rem] border border-white/5">
        <div className="flex justify-between items-center px-4 mb-4 mt-2">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isPt ? 'Peso (30 dias)' : 'Weight (30 days)'}</h3>
           <button onClick={() => setShowFullHistory(true)} className="text-[10px] text-emerald-500 font-black">HISTÓRICO</button>
        </div>
        <ProgressChart data={progress.slice(-30)} title="" />
      </div>

      <div className="relative h-56 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
        <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover brightness-[0.4]" />
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <div className="flex gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-500 text-[9px] font-black uppercase rounded-lg">TITAN AI</span>
            <span className="px-3 py-1 bg-white/10 text-[9px] font-black uppercase rounded-lg border border-white/10">{workout?.intensity}</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{workout?.name}</h2>
        </div>
        <button onClick={() => fetchWorkout(true)} className="absolute top-6 right-6 p-2 bg-black/40 rounded-xl text-white hover:text-emerald-500"><RefreshCw size={20} /></button>
      </div>

      <div className="space-y-4">
        {workout?.exercises.map((ex, i) => {
          const isActive = activeStep === i;
          const isCompleted = completedExercises.includes(i);
          if (activeStep !== null && !isActive && !isCompleted) return null;

          return (
            <div key={i} onClick={() => activeStep === null && setExpandedIndex(expandedIndex === i ? null : i)} className={`bg-slate-800/40 p-5 rounded-[2rem] border transition-all ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/5'} ${isCompleted ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border transition-all ${isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-900 text-emerald-500'}`}>
                  {isCompleted ? <Check size={28} /> : i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm uppercase text-white">{ex.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{ex.sets} Sets • {ex.reps} • {ex.muscleGroup}</p>
                </div>
              </div>
              {(expandedIndex === i || isActive) && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs text-slate-400 italic leading-relaxed">{ex.description}</p>
                  {isActive && (
                    <button onClick={completeExercise} className="w-full bg-emerald-600 py-4 rounded-2xl font-black text-white text-xs shadow-lg active:scale-95">CONCLUIR SÉRIE</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeStep === null && (
        <button onClick={startWorkout} className="fixed bottom-24 left-6 right-6 max-w-md mx-auto bg-emerald-600 py-6 rounded-[2.5rem] font-black text-white flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all z-40">
          <Play fill="white" size={24} />{isPt ? 'COMEÇAR TREINO' : 'START WORKOUT'}
        </button>
      )}
    </div>
  );
};

export default WorkoutView;
