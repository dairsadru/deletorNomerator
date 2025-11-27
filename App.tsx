import React, { useState } from 'react';
import ScriptGenerator from './components/ScriptGenerator';
import AnalysisDashboard from './components/AnalysisDashboard';
import { Eye, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'script' | 'analysis'>('script');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-whatsapp-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-whatsapp-500 to-whatsapp-600 p-2 rounded-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">StatusLens</h1>
              <p className="text-xs text-slate-400">WhatsApp Automation & Analytics</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('script')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'script' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              1. Get Script
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              2. Analyze Data
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-2">Optimize your reach.</h2>
          <p className="text-slate-400">
            Automatically extract your WhatsApp status viewer list and use AI to craft the perfect follow-up message for your audience.
          </p>
        </div>

        <div className="space-y-12">
          {activeTab === 'script' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ScriptGenerator />
            </div>
          )}
          
          {activeTab === 'analysis' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AnalysisDashboard />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 mt-12 py-8 text-center">
        <p className="text-slate-500 text-sm">
          StatusLens runs locally in your browser. No data is sent to servers except for AI generation.
        </p>
      </footer>
    </div>
  );
};

export default App;
