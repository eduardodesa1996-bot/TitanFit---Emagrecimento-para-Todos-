
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { chatWithCoach } from '../services/geminiService';
import { Send, Bot, Mic, X, Download, Table, Sparkles } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  profile: UserProfile;
  initialPrompt?: string;
  onPromptHandled?: () => void;
}

interface PlanData {
  title: string;
  type: 'diet' | 'workout';
  rows: { col1: string; col2: string; col3: string }[];
  summary: string;
}

const AICoachView: React.FC<Props> = ({ profile, initialPrompt, onPromptHandled }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'titan', text: string, plan?: PlanData}[]>([
    { role: 'titan', text: profile.language === 'pt' ? `Bem-vindo de volta, ${profile.name}. Como posso otimizar seus resultados hoje? Peça-me uma dieta ou treino específico!` : `Welcome back, ${profile.name}. How can I optimize your results today? Ask me for a specific diet or workout!` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isLiveMode]);

  useEffect(() => {
    if (initialPrompt) {
      handleAutoSend(initialPrompt);
      if (onPromptHandled) onPromptHandled();
    }
  }, [initialPrompt]);

  const handleAutoSend = async (msg: string) => {
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    processMessage(msg);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    processMessage(userMsg);
  };

  const processMessage = async (msg: string) => {
    setIsTyping(true);
    try {
      const responseText = await chatWithCoach(msg, profile);
      let plan: PlanData | undefined;
      let cleanText = responseText;
      const jsonMatch = responseText.match(/\{[\s\S]*"planData"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          plan = parsed.planData;
          cleanText = responseText.replace(jsonMatch[0], '').trim();
        } catch (e) {
          console.error("Plan JSON parse error", e);
        }
      }
      setMessages(prev => [...prev, { role: 'titan', text: cleanText || (profile.language === 'pt' ? "Plano gerado com sucesso:" : "Plan generated successfully:"), plan }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'titan', text: profile.language === 'pt' ? "Ocorreu um erro na conexão. Tente novamente." : "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startLiveMode = async () => {
    try {
      const apiKey = process.env.API_KEY || "";
      if (!apiKey) {
        alert(profile.language === 'pt' ? "API Key não configurada para Voz." : "API Key not configured for Voice.");
        return;
      }
      
      setIsLiveMode(true);
      setIsLiveActive(true);
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Manual Base64 Helpers
      const decode = (base64: string) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
      };

      const encode = (bytes: Uint8Array) => {
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };

      async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
        return buffer;
      }

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      audioContextRef.current = outputAudioContext;
      
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            } catch (err) {
              console.error("Mic access denied", err);
              stopLiveMode();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64) {
              nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sources.add(source);
              source.onended = () => sources.delete(source);
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: () => setIsLiveActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are Titan, the AI Fitness Coach. Speak to the user as a peer and expert.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error("Live mode error", e);
      stopLiveMode();
    }
  };

  const stopLiveMode = () => {
    if (sessionRef.current) sessionRef.current.close();
    setIsLiveMode(false);
    setIsLiveActive(false);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const downloadPDF = (plan: PlanData) => {
    const doc = new jsPDF() as any;
    const isPt = profile.language === 'pt';
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text(plan.title.toUpperCase(), 14, 22);
    const body = plan.rows.map(row => [row.col1, row.col2, row.col3]);
    doc.autoTable({
      startY: 35,
      head: [[plan.type === 'diet' ? (isPt ? 'Hora' : 'Time') : (isPt ? 'Item' : 'Exercise'), 'Ref/Sets', 'Macros/Reps']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });
    doc.save(`${plan.title}.pdf`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-2 scroll-smooth">
        {!isLiveMode && (
          <div className="flex justify-center mb-6">
            <button onClick={startLiveMode} className="group relative bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-4 rounded-[2rem] font-black text-white shadow-xl active:scale-95 transition-all">
              <div className="flex items-center gap-3">
                <Mic size={24} className="animate-bounce" />
                <span>{profile.language === 'pt' ? 'COACHING POR VOZ' : 'LIVE VOICE COACHING'}</span>
              </div>
            </button>
          </div>
        )}

        {isLiveMode ? (
          <div className="flex flex-col items-center justify-center h-full space-y-12">
            <div className="w-48 h-48 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center relative">
              <div className="w-40 h-40 rounded-full bg-emerald-500/20 animate-pulse absolute" />
              <Bot size={64} className="text-emerald-500 relative z-10" />
            </div>
            <button onClick={stopLiveMode} className="bg-red-500/20 border border-red-500 text-red-500 px-8 py-4 rounded-3xl font-black">{profile.language === 'pt' ? 'ENCERRAR' : 'END SESSION'}</button>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] p-5 rounded-[2rem] flex gap-3 ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none'}`}>
                {m.role === 'titan' && <Bot size={18} className="shrink-0 text-emerald-500 mt-1" />}
                <div className="text-sm leading-relaxed font-medium">{m.text}</div>
              </div>
              {m.plan && (
                <div className="mt-4 w-full bg-slate-900/60 p-4 rounded-3xl border border-emerald-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black text-xs text-emerald-400 uppercase tracking-widest">{m.plan.title}</span>
                    <button onClick={() => downloadPDF(m.plan!)} className="p-2 bg-emerald-500 rounded-xl text-white"><Download size={14} /></button>
                  </div>
                  <table className="w-full text-[10px] text-slate-300">
                    {m.plan.rows.slice(0, 5).map((r, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="py-2 font-black">{r.col1}</td>
                        <td className="py-2">{r.col2}</td>
                        <td className="py-2 text-right">{r.col3}</td>
                      </tr>
                    ))}
                  </table>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {!isLiveMode && (
        <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-md pt-2 pb-2">
          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-white/5">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={profile.language === 'pt' ? 'Peça um plano...' : 'Ask for a plan...'} className="flex-1 bg-transparent border-none focus:outline-none text-sm px-3 py-2 text-white font-medium" />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className="bg-emerald-600 p-2.5 rounded-xl text-white disabled:opacity-30 active:scale-90"><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoachView;
