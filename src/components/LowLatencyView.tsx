import React, { useState } from 'react';
import { Zap, FileText, Languages, CheckCheck, ListPlus, Code2, HelpCircle, Copy, Check, RefreshCw, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { LowLatencyTaskType, LowLatencyResult } from '../types';

export const LowLatencyView: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [activeTask, setActiveTask] = useState<LowLatencyTaskType>('summarize');
  const [targetLanguage, setTargetLanguage] = useState('Inglês');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LowLatencyResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const taskOptions: { type: LowLatencyTaskType; label: string; icon: any; description: string; placeholder: string }[] = [
    {
      type: 'summarize',
      label: 'Resumo Express',
      icon: FileText,
      description: 'Condensa textos e artigos longos em tópicos diretos.',
      placeholder: 'Cole o texto ou artigo longo aqui para receber um resumo ultra rápido em tópicos...',
    },
    {
      type: 'translate',
      label: 'Tradução Instantânea',
      icon: Languages,
      description: 'Tradução de alta velocidade preservando sentido e tom.',
      placeholder: 'Digite ou cole a frase que deseja traduzir...',
    },
    {
      type: 'extract_bullets',
      label: 'Extrair Ações & Tópicos',
      icon: ListPlus,
      description: 'Identifica tarefas, entregáveis e pontos de ação.',
      placeholder: 'Cole e-mails, atas de reunião ou especificações para extrair itens de ação...',
    },
    {
      type: 'fix_grammar',
      label: 'Correção Gramatical',
      icon: CheckCheck,
      description: 'Corrige pontuação, concordância e melhora a clareza.',
      placeholder: 'Cole o rascunho do seu e-mail ou mensagem para revisão imediata...',
    },
    {
      type: 'code_quick_fix',
      label: 'Quick Code Fix',
      icon: Code2,
      description: 'Explicação rápida ou correção de erros em snippets de código.',
      placeholder: 'Cole o trecho de código TypeScript, JS ou Python para depuração rápida...',
    },
  ];

  const handleExecuteLowLatency = async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);

    let systemInstruction = 'Você é um assistente de inteligência artificial de baixíssima latência. Seja direto, conciso e objetivo.';
    let promptWithTask = inputText;

    if (activeTask === 'summarize') {
      systemInstruction = 'Resuma o texto a seguir em no máximo 3 a 5 tópicos extremamente claros e objetivos em Português.';
    } else if (activeTask === 'translate') {
      systemInstruction = `Traduza o texto a seguir com precisão para o idioma: ${targetLanguage}. Retorne apenas a tradução.`;
    } else if (activeTask === 'extract_bullets') {
      systemInstruction = 'Extraia apenas as tarefas, entregáveis ou pontos-chave em formato de lista numerada.';
    } else if (activeTask === 'fix_grammar') {
      systemInstruction = 'Reescreva o texto corrigindo erros gramaticais, melhorando a clareza e mantendo tom profissional. Apresente primeiro a versão corrigida.';
    } else if (activeTask === 'code_quick_fix') {
      systemInstruction = 'Analise o trecho de código. Se houver erro, corrija-o e explique a correção em 2 frases diretas.';
    }

    try {
      const response = await fetch('/api/low-latency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptWithTask,
          taskType: activeTask,
          systemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar chamada de baixa latência.');
      }

      const newResult: LowLatencyResult = {
        output: data.output,
        latencyMs: data.latencyMs,
        taskType: activeTask,
        inputSnippet: inputText.length > 80 ? inputText.substring(0, 80) + '...' : inputText,
      };

      setResults(prev => [newResult, ...prev]);
    } catch (err: any) {
      console.error(err);
      alert(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentOption = taskOptions.find(t => t.type === activeTask) || taskOptions[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Respostas de Baixa Latência (Ultra-Fast)
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                  gemini-3.1-flash-lite
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Otimizado para máxima velocidade de resposta em milissegundos para tarefas recorrentes do dia a dia.
              </p>
            </div>
          </div>
        </div>

        {/* Task Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {taskOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeTask === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => setActiveTask(opt.type)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-950 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isActive && <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{opt.label}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Input & Action Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>{currentOption.label}</span>
            </h3>

            {activeTask === 'translate' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Traduzir para:</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Inglês">Inglês 🇺🇸</option>
                  <option value="Espanhol">Espanhol 🇪🇸</option>
                  <option value="Português">Português 🇧🇷</option>
                  <option value="Alemão">Alemão 🇩🇪</option>
                  <option value="Francês">Francês 🇫🇷</option>
                  <option value="Japonês">Japonês 🇯🇵</option>
                </select>
              </div>
            )}
          </div>

          <textarea
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={currentOption.placeholder}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />

          <div className="flex justify-end">
            <button
              onClick={handleExecuteLowLatency}
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando Velocidade...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>Executar Resposta Rápida</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Histórico de Respostas de Baixa Latência ({results.length})
            </h3>

            <div className="space-y-4">
              {results.map((res, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative group"
                >
                  {/* Result Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        {res.taskType.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 italic">"{res.inputSnippet}"</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                        <Zap className="w-3.5 h-3.5" />
                        {res.latencyMs}ms
                        {res.latencyMs < 600 && <span className="text-[10px] text-amber-300 ml-1">🚀 Ultra-Fast</span>}
                      </span>

                      <button
                        onClick={() => handleCopy(idx, res.output)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                        title="Copiar resultado"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Output Text */}
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
                    {res.output}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
