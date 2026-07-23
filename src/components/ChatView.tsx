import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Bot, User, Trash2, Copy, Check, Sparkles, Zap, Shield, ChevronDown, RefreshCw, Cpu
} from 'lucide-react';
import { ChatMessage, ChatModel, SystemRole } from '../types';
import { systemRoles as defaultRoles } from '../data/systemRoles';

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: 'Olá! Sou seu assistente Gemini Multi-Modelo. Como posso ajudar você hoje?\n\nVocê pode alterar o **modelo de IA** e o **papel (role)** no painel superior para adaptar as respostas à sua necessidade.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.6-flash',
      latencyMs: 120,
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.6-flash');
  const [selectedRole, setSelectedRole] = useState<SystemRole>(defaultRoles[0]);
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const activeSystemInstruction = customSystemPrompt.trim() 
        ? customSystemPrompt.trim() 
        : selectedRole.systemInstruction;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          systemInstruction: activeSystemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a API do Gemini');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
        latencyMs: data.latencyMs,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Erro:** ${err.message || 'Falha ao processar mensagem. Verifique a chave de API ou tente novamente.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (confirm('Deseja limpar todo o histórico desta conversa?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Model Selection */}
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modelo:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  selectedModel === 'gemini-3.1-pro-preview'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Para tarefas complexas, raciocínio avançado e código profundo"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>3.1 Pro</span>
              </button>

              <button
                onClick={() => setSelectedModel('gemini-3.6-flash')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  selectedModel === 'gemini-3.6-flash'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modelo ideal para a maioria das tarefas gerais com equilíbrio ideal"
              >
                <Bot className="w-3 h-3 text-indigo-300" />
                <span>3.6 Flash</span>
              </button>

              <button
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ultra-rápido para respostas simples de baixa latência"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>3.1 Flash-Lite</span>
              </button>
            </div>
          </div>

          {/* Role Selector */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Papel:</span>
            <select
              value={selectedRole.id}
              onChange={(e) => {
                const found = defaultRoles.find(r => r.id === e.target.value);
                if (found) setSelectedRole(found);
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {defaultRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsCustomPromptOpen(!isCustomPromptOpen)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                customSystemPrompt.trim()
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Instrução Customizada
            </button>

            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900 transition-all ml-2"
              title="Limpar histórico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Prompt Dropdown Drawer */}
        {isCustomPromptOpen && (
          <div className="max-w-6xl mx-auto mt-3 p-3 bg-slate-950 rounded-xl border border-indigo-500/30 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-indigo-300">Instrução de Sistema Customizada (System Prompt):</span>
              {customSystemPrompt && (
                <button
                  onClick={() => setCustomSystemPrompt('')}
                  className="text-slate-400 hover:text-red-400 underline"
                >
                  Restaurar padrão do papel
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Ex: Responda em formato de poema, seja extremamente conciso, aja como um especialista em segurança..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Bot className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
            <h3 className="text-lg font-medium text-slate-300">Nenhuma mensagem ainda</h3>
            <p className="text-sm max-w-md mt-1">
              Digite uma pergunta ou selecione um modelo no painel acima para iniciar o bate-papo com o Gemini.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar for bot */}
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-300" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm relative group ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : msg.error
                    ? 'bg-red-950/60 border border-red-800 text-red-200 rounded-tl-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Header for Bot messages */}
                {msg.role === 'model' && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                        {msg.modelUsed || selectedModel}
                      </span>
                      {msg.latencyMs && (
                        <span className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-emerald-400 font-mono text-[10px]">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          {msg.latencyMs}ms
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Timestamp */}
                <div
                  className={`text-[10px] mt-2 text-right ${
                    msg.role === 'user' ? 'text-indigo-200/70' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Avatar for User */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-300 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-400 text-xs flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
              <span>Gemini ({selectedModel}) está processando sua resposta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="bg-slate-900 border-t border-slate-800 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
          <textarea
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Envie uma mensagem para o Gemini (${selectedModel})... (Enter para enviar, Shift+Enter para nova linha)`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Enviar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
