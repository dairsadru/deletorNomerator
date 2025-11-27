import React, { useState } from 'react';
import { analyzeCleanupCandidates } from '../services/geminiService';
import { Sparkles, Trash2, ArrowRightLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const AnalysisDashboard: React.FC = () => {
  const [viewersInput, setViewersInput] = useState('');
  const [allContactsInput, setAllContactsInput] = useState('');
  
  const [candidates, setCandidates] = useState<string[]>([]);
  const [stats, setStats] = useState<{total: number, active: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleCompare = () => {
    // 1. Parse Viewers
    const viewers = new Set(
      viewersInput.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    );

    // 2. Parse All Contacts
    const allContacts = allContactsInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 3. Find Diff (In 'All' but NOT in 'Viewers')
    const inactive = allContacts.filter(contact => !viewers.has(contact));

    setCandidates(inactive);
    setStats({
      total: allContacts.length,
      active: viewers.size
    });
    setAiAnalysis(null);
  };

  const handleAiAnalyze = async () => {
    if (candidates.length === 0) return;
    setLoading(true);
    const result = await analyzeCleanupCandidates(candidates);
    setAiAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Inputs Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-blue-400" />
          Шаг 2: Сравнение Списков
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-whatsapp-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-whatsapp-500"></span>
              Активные (Зрители)
            </label>
            <textarea
              value={viewersInput}
              onChange={(e) => setViewersInput(e.target.value)}
              placeholder="Вставьте список тех, кто смотрел статус..."
              className="w-full h-40 bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-whatsapp-500 text-xs font-mono"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Все контакты (Общий список)
            </label>
            <textarea
              value={allContactsInput}
              onChange={(e) => setAllContactsInput(e.target.value)}
              placeholder="Вставьте полный список контактов..."
              className="w-full h-40 bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-blue-500 text-xs font-mono"
            ></textarea>
          </div>
        </div>
        
        <div className="flex justify-center mt-6">
          <button 
            onClick={handleCompare}
            disabled={!viewersInput || !allContactsInput}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Trash2 className="w-4 h-4" />
            Найти кандидатов на удаление
          </button>
        </div>
      </div>

      {/* Results Section */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Stats Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Статистика</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400 text-sm">Всего контактов</span>
                  <span className="text-white font-mono">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-whatsapp-900/20 rounded-lg border border-whatsapp-500/10">
                  <span className="text-whatsapp-400 text-sm">Смотрят (Активные)</span>
                  <span className="text-whatsapp-300 font-mono font-bold">{stats.active}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-900/20 rounded-lg border border-red-500/10">
                  <span className="text-red-400 text-sm">Не смотрят (Удалить?)</span>
                  <span className="text-red-300 font-mono font-bold">{candidates.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
               <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                 <Sparkles className="w-4 h-4" /> AI Помощник
               </h4>
               <p className="text-slate-400 text-xs mb-4">
                 Перед удалением проверьте список. Gemini может найти важные контакты, которые вы могли забыть (банки, врачи, родственники).
               </p>
               <button 
                onClick={handleAiAnalyze}
                disabled={loading || candidates.length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Проверить список на безопасность'}
              </button>
            </div>
          </div>

          {/* List Card */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> 
                Кандидаты на удаление ({candidates.length})
              </h3>
              <button 
                onClick={() => navigator.clipboard.writeText(candidates.join('\n'))}
                className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded hover:bg-slate-600 transition flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" /> Копировать список
              </button>
            </div>

            {aiAnalysis && (
               <div className="mb-4 bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                 <h4 className="text-purple-300 text-xs font-bold uppercase mb-2">Анализ Gemini</h4>
                 <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
               </div>
            )}

            <div className="bg-slate-900 rounded-lg p-4 flex-grow overflow-hidden flex flex-col border border-slate-800">
               {candidates.length > 0 ? (
                 <div className="overflow-y-auto custom-scrollbar flex-grow pr-2">
                   {candidates.map((c, i) => (
                     <div key={i} className="py-2 border-b border-slate-800 text-slate-300 text-sm flex items-center gap-3 hover:bg-slate-800/50 px-2 rounded">
                        <span className="text-slate-600 text-xs w-6">{i+1}.</span>
                        {c}
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                   Нет кандидатов на удаление (или списки идентичны)
                 </div>
               )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AnalysisDashboard;