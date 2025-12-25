
import React, { useState, useEffect } from 'react';
import { UserProfile, ProgressData, IntelItem } from '../types';
import ProgressChart from './ProgressChart';
import { Activity, Flame, Target, Trophy, ExternalLink, Sparkles } from 'lucide-react';
import { getFitnessIntelligence } from '../services/geminiService';

interface Props {
  profile: UserProfile;
  progress: ProgressData[];
}

const Dashboard: React.FC<Props> = ({ profile, progress }) => {
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(true);

  const isPt = profile.language === 'pt';
  const UI = {
    greeting: isPt ? 'OLÁ' : 'HEY',
    sub: isPt ? 'Pronto para quebrar limites?' : 'Ready to break some limits?',
    intelTitle: isPt ? 'Inteligência Titan' : 'Titan Intelligence',
    verified: isPt ? 'Insight Verificado' : 'Verified Insight',
    energy: isPt ? 'Energia Ativa' : 'Active Energy',
    toTarget: isPt ? 'Para a Meta' : 'To Target',
    objStatus: isPt ? 'Status do Objetivo' : 'Objective Status',
    progressSub: isPt ? `Progresso constante para ${profile.targetWeight}kg` : `Steady progress towards ${profile.targetWeight}kg`,
    weightChart: isPt ? 'Progresso de Peso (kg)' : 'Weight Progress (kg)'
  };

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const data = await getFitnessIntelligence(profile.goal, profile.language);
        setIntel(data);
      } catch (e) {
        console.error("Failed to fetch intel", e);
      } finally {
        setLoadingIntel(false);
      }
    };
    fetchIntel();
  }, [profile.goal, profile.language]);

  const currentWeight = progress[progress.length - 1]?.weight || profile.weight;
  const progressPercent = Math.min(100, Math.max(0, 
    ((profile.weight - currentWeight) / (profile.weight - profile.targetWeight)) * 100
  ));

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{UI.greeting}, {profile.name.toUpperCase()}!</h1>
          <p className="text-slate-400 text-sm font-medium">{UI.sub}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/50 rotate-3">
          <Trophy className="text-emerald-500" size={24} />
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={18} />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{UI.intelTitle}</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {loadingIntel ? (
            [1, 2].map(i => (
              <div key={i} className="min-w-[280px] h-32 bg-slate-800/50 rounded-2xl border border-slate-700/50 animate-pulse" />
            ))
          ) : (
            intel.map((item, i) => (
              <a 
                key={i} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="min-w-[280px] p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter">{UI.verified}</span>
                  <ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-500" />
                </div>
                <p className="text-sm text-slate-200 line-clamp-3 leading-snug">{item.snippet}</p>
              </a>
            ))
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-orange-500" size={18} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{UI.energy}</span>
          </div>
          <p className="text-2xl font-black">1,240 <span className="text-xs font-medium text-slate-500">kcal</span></p>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-cyan-500" size={18} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{UI.toTarget}</span>
          </div>
          <p className="text-2xl font-black">{(currentWeight - profile.targetWeight).toFixed(1)} <span className="text-xs font-medium text-slate-500">kg</span></p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 p-5 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="font-black text-lg text-white">{UI.objStatus}</h3>
            <p className="text-xs text-slate-400">{UI.progressSub}</p>
          </div>
          <span className="text-emerald-400 font-black text-xl">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="p-2 bg-slate-800/50 rounded-3xl border border-slate-700/50">
        <ProgressChart data={progress} title={UI.weightChart} />
      </div>
    </div>
  );
};

export default Dashboard;
